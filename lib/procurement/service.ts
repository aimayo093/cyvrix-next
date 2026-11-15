import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  approvalExpiry,
  canDecide,
  canExecute,
  manifestSha256,
  type Verdict,
} from "./approval-core";
import {
  APPROVAL_ACTIONS,
  checkTransition,
  type Actor,
  type ApprovalAction,
  type OpportunityKind,
} from "./lifecycle";

/**
 * Database side of the procurement rules. Every write here records an audit
 * entry, and every status move goes through checkTransition with facts read in
 * the same transaction, so a page or an agent cannot skip a gate.
 */

type Tx = Prisma.TransactionClient;
export type Outcome<T = undefined> = ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; reason: string };

const fail = (reason: string) => ({ ok: false as const, reason });

export async function audit(
  tx: Tx | typeof prisma,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>
) {
  await tx.auditLog.create({
    data: { id: crypto.randomUUID(), userId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue },
  });
}

/** The package's manifest as it stands now, from its items. */
async function currentManifest(tx: Tx, packageId: string): Promise<string | null> {
  const pkg = await tx.package.findUnique({ where: { id: packageId }, include: { Item: true } });
  if (!pkg) return null;
  return manifestSha256({
    destination: pkg.destination,
    items: pkg.Item.map((i) => ({ documentVersionId: i.documentVersionId, sha256: i.sha256, label: i.label })),
    priceSnapshot: pkg.priceSnapshot,
    declarations: pkg.declarations,
  });
}

async function gatherFacts(tx: Tx, opportunityId: string, now: Date) {
  const decisions = await tx.approvalDecision.findMany({
    where: { decision: "approved", expiresAt: { gt: now }, Request: { opportunityId }, ExecutionRecord: null },
    include: { Request: { include: { Package: true } } },
  });
  const currentApprovals: ApprovalAction[] = [];
  for (const d of decisions) {
    const pkg = d.Request.Package;
    if (pkg.status !== "locked" || pkg.manifestSha256 !== d.manifestSha256) continue;
    if ((await currentManifest(tx, pkg.id)) !== d.manifestSha256) continue;
    currentApprovals.push(d.Request.actionType as ApprovalAction);
  }

  const executions = await tx.executionRecord.findMany({
    where: { opportunityId, outcome: "confirmed", Receipt: { some: {} } },
    select: { actionType: true },
  });
  return { currentApprovals, confirmedExecutions: executions.map((e) => e.actionType as ApprovalAction) };
}

export async function transitionOpportunity(input: {
  opportunityId: string;
  to: string;
  actor: Actor;
  userId: string | null;
  evidenceVersionId?: string | null;
  note?: string;
}): Promise<Outcome> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const opp = await tx.opportunity.findUnique({ where: { id: input.opportunityId } });
    if (!opp) return fail("That opportunity could not be found.");

    if (input.evidenceVersionId) {
      const evidence = await tx.companyDocumentVersion.findUnique({ where: { id: input.evidenceVersionId } });
      if (!evidence) return fail("The evidence document could not be found.");
    }

    const facts = await gatherFacts(tx, opp.id, now);
    const verdict = checkTransition(opp.kind as OpportunityKind, opp.status, input.to, {
      actor: input.actor,
      ...facts,
      evidenceVersionId: input.evidenceVersionId ?? null,
    });
    if (!verdict.ok) return verdict;

    // Compare-and-set: if someone else moved it first, nothing changes.
    const moved = await tx.opportunity.updateMany({
      where: { id: opp.id, status: opp.status },
      data: { status: input.to },
    });
    if (moved.count !== 1) return fail("The record changed while you were looking at it. Reload and try again.");

    await audit(tx, input.userId, "opportunity.transition", "Opportunity", opp.id, {
      from: opp.status,
      to: input.to,
      actor: input.actor,
      evidenceVersionId: input.evidenceVersionId ?? null,
      note: input.note?.slice(0, 500) ?? null,
    });
    return { ok: true };
  });
}

export async function lockPackage(packageId: string, userId: string): Promise<Outcome<string>> {
  return prisma.$transaction(async (tx) => {
    const pkg = await tx.package.findUnique({ where: { id: packageId }, include: { Item: true } });
    if (!pkg) return fail("That package could not be found.");
    if (pkg.status !== "draft") return fail("Only a draft package can be locked.");
    if (pkg.Item.length === 0) return fail("Add at least one document before locking the package.");
    const manifest = (await currentManifest(tx, pkg.id))!;
    await tx.package.update({ where: { id: pkg.id }, data: { status: "locked", manifestSha256: manifest, lockedAt: new Date() } });
    await audit(tx, userId, "package.locked", "Package", pkg.id, { manifestSha256: manifest, items: pkg.Item.length });
    return { ok: true, value: manifest };
  });
}

/** A new draft version copying the items, used to revise after a request for changes. */
export async function revisePackage(packageId: string, userId: string): Promise<Outcome<string>> {
  return prisma.$transaction(async (tx) => {
    const pkg = await tx.package.findUnique({ where: { id: packageId }, include: { Item: true } });
    if (!pkg) return fail("That package could not be found.");
    if (pkg.status !== "locked") return fail("Only a locked package can be revised.");
    const latest = await tx.package.findFirst({ where: { opportunityId: pkg.opportunityId }, orderBy: { version: "desc" } });
    const id = crypto.randomUUID();
    await tx.package.create({
      data: {
        id,
        opportunityId: pkg.opportunityId,
        version: (latest?.version ?? pkg.version) + 1,
        destination: pkg.destination,
        priceSnapshot: pkg.priceSnapshot ?? Prisma.JsonNull,
        declarations: pkg.declarations as Prisma.InputJsonValue,
        createdById: userId,
        Item: { create: pkg.Item.map((i) => ({ id: crypto.randomUUID(), documentVersionId: i.documentVersionId, label: i.label, sha256: i.sha256 })) },
      },
    });
    await tx.package.update({ where: { id: pkg.id }, data: { status: "superseded" } });
    await tx.approvalRequest.updateMany({ where: { packageId: pkg.id, status: "pending" }, data: { status: "superseded" } });
    await audit(tx, userId, "package.revised", "Package", id, { from: pkg.id });
    return { ok: true, value: id };
  });
}

export async function requestApproval(input: {
  packageId: string;
  actionType: ApprovalAction;
  userId: string;
}): Promise<Outcome<string>> {
  if (!APPROVAL_ACTIONS.includes(input.actionType)) return fail("Unknown action.");
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const pkg = await tx.package.findUnique({ where: { id: input.packageId }, include: { Opportunity: true } });
    if (!pkg) return fail("That package could not be found.");
    if (pkg.status !== "locked" || !pkg.manifestSha256) return fail("Lock the package before asking for approval.");
    if ((await currentManifest(tx, pkg.id)) !== pkg.manifestSha256) return fail("The package no longer matches its lock. Revise it.");
    const expiresAt = approvalExpiry(now, pkg.Opportunity.deadlineAt);
    if (!expiresAt) return fail("The deadline has passed.");
    const open = await tx.approvalRequest.findFirst({ where: { packageId: pkg.id, status: "pending" } });
    if (open) return fail("This package is already waiting for a decision.");

    const id = crypto.randomUUID();
    await tx.approvalRequest.create({
      data: {
        id,
        opportunityId: pkg.opportunityId,
        packageId: pkg.id,
        actionType: input.actionType,
        destination: pkg.destination,
        manifestSha256: pkg.manifestSha256,
        priceSnapshot: pkg.priceSnapshot ?? Prisma.JsonNull,
        declarations: pkg.declarations as Prisma.InputJsonValue,
        expiresAt,
        requestedById: input.userId,
      },
    });
    await audit(tx, input.userId, "approval.requested", "ApprovalRequest", id, {
      opportunityId: pkg.opportunityId,
      actionType: input.actionType,
      manifestSha256: pkg.manifestSha256,
      expiresAt: expiresAt.toISOString(),
    });
    return { ok: true, value: id };
  });
}

export async function decideApproval(input: {
  requestId: string;
  decision: "approved" | "rejected" | "revision_requested";
  userId: string;
  stepUpAt: Date;
  note?: string;
}): Promise<Outcome> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const request = await tx.approvalRequest.findUnique({ where: { id: input.requestId }, include: { Package: true } });
    if (!request) return fail("That request could not be found.");
    const decidable = canDecide(request, now);
    if (!decidable.ok) return decidable;
    if (input.decision === "approved") {
      if (request.Package.status !== "locked" || request.Package.manifestSha256 !== request.manifestSha256) {
        return fail("The package has changed since approval was requested.");
      }
      if ((await currentManifest(tx, request.packageId)) !== request.manifestSha256) {
        return fail("The package has changed since approval was requested.");
      }
    }

    const claimed = await tx.approvalRequest.updateMany({
      where: { id: request.id, status: "pending" },
      data: { status: input.decision },
    });
    if (claimed.count !== 1) return fail("This request has already been decided.");

    const id = crypto.randomUUID();
    await tx.approvalDecision.create({
      data: {
        id,
        requestId: request.id,
        decision: input.decision,
        manifestSha256: request.manifestSha256,
        decidedById: input.userId,
        note: input.note?.slice(0, 2000) || null,
        stepUpAt: input.stepUpAt,
        expiresAt: request.expiresAt,
      },
    });
    await audit(tx, input.userId, `approval.${input.decision}`, "ApprovalRequest", request.id, {
      decisionId: id,
      opportunityId: request.opportunityId,
      actionType: request.actionType,
      manifestSha256: request.manifestSha256,
    });
    return { ok: true };
  });
}

/** Records that the founder is carrying out an approved action by hand (D8-A). */
export async function startExecution(input: {
  decisionId: string;
  mode: "manual" | "human_assisted";
  userId: string;
}): Promise<Outcome<string>> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const decision = await tx.approvalDecision.findUnique({
      where: { id: input.decisionId },
      include: { Request: { include: { Package: true } }, ExecutionRecord: true },
    });
    if (!decision) return fail("That approval could not be found.");
    const request = decision.Request;
    // A submission's approval first opens ApprovedForSubmission, so it must not
    // be used up before the record reaches Submitting.
    if (request.actionType === "submit_tender" || request.actionType === "send_quote") {
      const opp = await tx.opportunity.findUnique({ where: { id: request.opportunityId }, select: { status: true } });
      if (opp?.status !== "Submitting") return fail("Move the opportunity to Submitting before you start.");
    }
    const confirmed = await tx.executionRecord.findFirst({
      where: { opportunityId: request.opportunityId, actionType: request.actionType, outcome: "confirmed" },
    });
    const verdict: Verdict = canExecute({
      now,
      action: request.actionType as ApprovalAction,
      request,
      decision,
      pkg: request.Package,
      recomputedManifest: (await currentManifest(tx, request.packageId)) ?? "",
      alreadyUsed: decision.ExecutionRecord !== null,
      hasConfirmedSameAction: confirmed !== null,
    });
    if (!verdict.ok) return verdict;

    const id = crypto.randomUUID();
    await tx.executionRecord.create({
      data: {
        id,
        approvalDecisionId: decision.id,
        opportunityId: request.opportunityId,
        actionType: request.actionType,
        mode: input.mode,
        submittedManifestSha256: request.manifestSha256,
        recordedById: input.userId,
      },
    });
    await audit(tx, input.userId, "execution.started", "ExecutionRecord", id, {
      decisionId: decision.id,
      actionType: request.actionType,
      mode: input.mode,
      manifestSha256: request.manifestSha256,
    });
    return { ok: true, value: id };
  });
}

/**
 * Records what happened. "confirmed" needs the portal's receipt or
 * confirmation as an uploaded document (spec section 16: never a button click).
 * "ambiguous" stops everything until a person checks the portal.
 */
export async function recordExecutionOutcome(input: {
  executionId: string;
  outcome: "confirmed" | "rejected" | "ambiguous";
  portalReference?: string;
  receiptVersionId?: string;
  receivedAt?: Date;
  userId: string;
}): Promise<Outcome> {
  return prisma.$transaction(async (tx) => {
    const exec = await tx.executionRecord.findUnique({ where: { id: input.executionId } });
    if (!exec) return fail("That record could not be found.");
    if (exec.outcome !== "pending" && exec.outcome !== "ambiguous") return fail("This outcome has already been recorded.");
    if (input.outcome === "confirmed") {
      if (!input.receiptVersionId) return fail("Upload the portal's receipt or confirmation first.");
      if (!input.portalReference?.trim()) return fail("Enter the portal's reference for this submission.");
      const receipt = await tx.companyDocumentVersion.findUnique({ where: { id: input.receiptVersionId } });
      if (!receipt) return fail("The receipt document could not be found.");
    }

    try {
      await tx.executionRecord.update({
        where: { id: exec.id },
        data: {
          outcome: input.outcome,
          portalReference: input.portalReference?.trim().slice(0, 200) || null,
          finishedAt: input.outcome === "ambiguous" ? null : new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return fail("A confirmed submission already exists for this opportunity.");
      }
      throw error;
    }
    if (input.outcome === "confirmed") {
      await tx.receipt.create({
        data: {
          id: crypto.randomUUID(),
          executionId: exec.id,
          documentVersionId: input.receiptVersionId!,
          receivedAt: input.receivedAt ?? new Date(),
          createdById: input.userId,
        },
      });
    }
    await audit(tx, input.userId, `execution.${input.outcome}`, "ExecutionRecord", exec.id, {
      opportunityId: exec.opportunityId,
      actionType: exec.actionType,
      portalReference: input.portalReference ?? null,
      receiptVersionId: input.receiptVersionId ?? null,
    });
    return { ok: true };
  });
}
