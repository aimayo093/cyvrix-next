import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  approvalExpiry,
  canDecide,
  canExecute,
  evidenceVerdict,
  manifestSha256,
  pastBuyerDeadline,
  SUBMISSION_ACTIONS,
  type Verdict,
} from "./approval-core";
import { requirementsGate } from "./requirements";
import {
  APPROVAL_ACTIONS,
  checkTransition,
  type Actor,
  type ApprovalAction,
  type OpportunityKind,
} from "./lifecycle";
import { LIVE_ACCOUNT_STATUSES, REREGISTERABLE_STATUSES, standingPolicyApplies } from "./partnerships";
import { portalForDestination } from "./portal-lookup";

/**
 * Database side of the procurement rules. Every write here records an audit
 * entry, and every status move goes through checkTransition with facts read in
 * the same transaction, so a page or an agent cannot skip a gate.
 */

type Tx = Prisma.TransactionClient;
export type Outcome<T = undefined> = ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; reason: string };

const fail = (reason: string) => ({ ok: false as const, reason });

/**
 * A unique index refusing a write aborts the whole transaction, so it is
 * caught here, outside it, and reported as an ordinary refusal.
 */
async function refusingConflicts<T>(run: () => Promise<T>, reason: string): Promise<T | { ok: false; reason: string }> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail(reason);
    throw error;
  }
}

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

/**
 * Row lock on one opportunity until the transaction ends. Serialises starting
 * an attempt and recording an outcome for that opportunity, so a confirmation
 * cannot land between a duplicate check and the next attempt's insert.
 */
export async function lockOpportunity(tx: Tx, opportunityId: string) {
  await tx.$queryRaw`SELECT 1 FROM "public"."Opportunity" WHERE "id" = ${opportunityId} FOR UPDATE`;
}

/**
 * The requirements checklist as the gates see it. A mandatory requirement
 * marked met counts only while its evidence is still current: a document that
 * has since expired or been superseded reopens it.
 */
export async function requirementFacts(tx: Tx, opportunityId: string, now: Date) {
  const reqs = await tx.tenderRequirement.groupBy({ by: ["kind", "status"], where: { opportunityId }, _count: { _all: true } });
  const count = (match: (r: { kind: string; status: string }) => boolean) => reqs.filter(match).reduce((n, r) => n + r._count._all, 0);
  const metMandatory = await tx.tenderRequirement.findMany({
    where: { opportunityId, kind: "mandatory", status: "met" },
    select: { Evidence: { select: { status: true, expiresAt: true } } },
  });
  const staleEvidence = metMandatory.filter((r) => !evidenceVerdict(r.Evidence, now).ok).length;
  return {
    recorded: count(() => true),
    mandatoryOpen: count((r) => r.kind === "mandatory" && (r.status === "unknown" || r.status === "partly_met")) + staleEvidence,
    mandatoryNotMet: count((r) => r.kind === "mandatory" && r.status === "not_met"),
  };
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

async function gatherFacts(tx: Tx, opportunityId: string, now: Date, roundStart: Date, deadlineAt: Date | null) {
  const decisions = await tx.approvalDecision.findMany({
    where: { decision: "approved", expiresAt: { gt: now }, Request: { opportunityId }, ExecutionRecord: null },
    include: { Request: { include: { Package: true } } },
  });
  const currentApprovals: ApprovalAction[] = [];
  for (const d of decisions) {
    const pkg = d.Request.Package;
    // A submission approval lapses at the buyer's current deadline.
    if (!pastBuyerDeadline(d.Request.actionType, deadlineAt, now).ok) continue;
    if (pkg.status !== "locked" || pkg.manifestSha256 !== d.manifestSha256) continue;
    if ((await currentManifest(tx, pkg.id)) !== d.manifestSha256) continue;
    currentApprovals.push(d.Request.actionType as ApprovalAction);
  }

  // Only this round counts: an attempt started after the record reached its
  // current status. A confirmation from an earlier round (before a rejection
  // and remediation, say) must not open the gate again.
  const executions = await tx.executionRecord.findMany({
    where: { opportunityId, outcome: "confirmed", Receipt: { some: {} }, startedAt: { gte: roundStart } },
    select: { actionType: true },
  });
  // The requirements checklist (Phase 4), counted under the same transaction.
  const requirements = await requirementFacts(tx, opportunityId, now);
  return { currentApprovals, confirmedExecutions: executions.map((e) => e.actionType as ApprovalAction), requirements };
}

export async function transitionOpportunity(input: {
  opportunityId: string;
  to: string;
  actor: Actor;
  userId: string | null;
  evidenceVersionId?: string | null;
  note?: string;
}): Promise<Outcome> {
  return prisma.$transaction(async (tx) => {
    // Locked first, so a requirement saved at this moment (saveRequirement
    // takes the same lock) is either counted below or waits for the move.
    await lockOpportunity(tx, input.opportunityId);
    // Read the clock after the lock: a wait for it must not leave a stale
    // time for the deadline and evidence checks.
    const now = new Date();
    const opp = await tx.opportunity.findUnique({ where: { id: input.opportunityId } });
    if (!opp) return fail("That opportunity could not be found.");

    if (input.evidenceVersionId) {
      const evidence = await tx.companyDocumentVersion.findUnique({ where: { id: input.evidenceVersionId } });
      const usable = evidenceVerdict(evidence);
      if (!usable.ok) return usable;
    }

    const facts = await gatherFacts(tx, opp.id, now, opp.statusChangedAt, opp.deadlineAt);
    const verdict = checkTransition(opp.kind as OpportunityKind, opp.status, input.to, {
      actor: input.actor,
      ...facts,
      evidenceVersionId: input.evidenceVersionId ?? null,
    });
    if (!verdict.ok) return verdict;

    // Compare-and-set: if someone else moved it first, nothing changes.
    const moved = await tx.opportunity.updateMany({
      where: { id: opp.id, status: opp.status },
      data: { status: input.to, statusChangedAt: now },
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
  return refusingConflicts(() => prisma.$transaction(async (tx): Promise<Outcome<string>> => {
    const pkg = await tx.package.findUnique({ where: { id: input.packageId }, include: { Opportunity: true } });
    if (!pkg) return fail("That package could not be found.");
    if (pkg.status !== "locked" || !pkg.manifestSha256) return fail("Lock the package before asking for approval.");
    if ((await currentManifest(tx, pkg.id)) !== pkg.manifestSha256) return fail("The package no longer matches its lock. Revise it.");
    const expiresAt = approvalExpiry(now, pkg.Opportunity.deadlineAt);
    if (!expiresAt) return fail("The deadline has passed.");
    // A request that lapsed undecided is retired first, so a fresh one can be made
    // (the database allows one pending request per package).
    const lapsed = await tx.approvalRequest.findMany({
      where: { packageId: pkg.id, status: "pending", expiresAt: { lte: now } },
      select: { id: true },
    });
    for (const r of lapsed) {
      // Audited only when this call is the one that retired it.
      const retired = await tx.approvalRequest.updateMany({ where: { id: r.id, status: "pending" }, data: { status: "expired" } });
      if (retired.count === 1) {
        await audit(tx, input.userId, "approval.expired", "ApprovalRequest", r.id, { packageId: pkg.id });
      }
    }
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

    // D13: a registration on a free portal with a standing policy, making no
    // declarations and carrying no price, is approved by that policy at once.
    // Its authority is the founder who switched the policy on, with the
    // authenticator check made then. The founder still registers by hand (D8).
    if (input.actionType === "register_account") {
      // Two portals at one address name no portal, so no policy applies.
      // The portal row is locked and read again, so a policy switched off or an
      // address changed at this moment is seen before the approval is written.
      const { portal } = await portalForDestination(tx, pkg.destination, { lock: true });
      const policy = standingPolicyApplies({ portal, actionType: input.actionType, declarations: pkg.declarations, priceSnapshot: pkg.priceSnapshot });
      if (policy.applies && portal?.standingPolicyById && portal.standingPolicyAt) {
        await tx.approvalRequest.update({ where: { id }, data: { status: "approved" } });
        const decisionId = crypto.randomUUID();
        await tx.approvalDecision.create({
          data: {
            id: decisionId,
            requestId: id,
            decision: "approved",
            manifestSha256: pkg.manifestSha256,
            decidedById: portal.standingPolicyById,
            note: `Approved by the standing registration policy for ${portal.name} (D13).`,
            stepUpAt: portal.standingPolicyAt,
            expiresAt,
          },
        });
        await audit(tx, input.userId, "approval.policy_approved", "ApprovalRequest", id, { decisionId, portalId: portal.id, why: policy.why });
      }
    }
    return { ok: true, value: id };
  }), "This package is already waiting for a decision.");
}

export async function decideApproval(input: {
  requestId: string;
  decision: "approved" | "rejected" | "revision_requested";
  userId: string;
  stepUpAt: Date;
  note?: string;
}): Promise<Outcome> {
  return prisma.$transaction(async (tx) => {
    const request = await tx.approvalRequest.findUnique({ where: { id: input.requestId }, include: { Package: true } });
    if (!request) return fail("That request could not be found.");
    await lockOpportunity(tx, request.opportunityId);
    // Read the clock after the lock: a wait for it must not leave a stale
    // time for the deadline and evidence checks.
    const now = new Date();
    const opp = await tx.opportunity.findUnique({ where: { id: request.opportunityId }, select: { kind: true, deadlineAt: true } });
    if (!opp) return fail("That opportunity could not be found.");
    const decidable = canDecide(request, now, opp.deadlineAt);
    if (!decidable.ok) return decidable;
    if (input.decision === "approved" && (SUBMISSION_ACTIONS as readonly string[]).includes(request.actionType)) {
      // A submission is approved only on a clear checklist, as it stands now.
      const clear = requirementsGate(opp.kind, await requirementFacts(tx, request.opportunityId, now));
      if (!clear.ok) return clear;
    }
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
  return refusingConflicts(() => prisma.$transaction(async (tx): Promise<Outcome<string>> => {
    const decision = await tx.approvalDecision.findUnique({
      where: { id: input.decisionId },
      include: { Request: { include: { Package: true } }, ExecutionRecord: true },
    });
    if (!decision) return fail("That approval could not be found.");
    const request = decision.Request;
    // Starting an attempt and recording an outcome both lock the opportunity
    // first, so neither can slip between the other's checks and its write.
    await lockOpportunity(tx, request.opportunityId);
    // Read the clock after the lock: a wait for it must not leave a stale
    // time for the deadline and evidence checks.
    const now = new Date();
    const opp = await tx.opportunity.findUnique({ where: { id: request.opportunityId }, select: { status: true, statusChangedAt: true, kind: true, deadlineAt: true } });
    if (!opp) return fail("That opportunity could not be found.");
    // A submission's approval first opens ApprovedForSubmission, so it must not
    // be used up before the record reaches Submitting.
    if ((request.actionType === "submit_tender" || request.actionType === "send_quote") && opp.status !== "Submitting") {
      return fail("Move the opportunity to Submitting before you start.");
    }
    // The checklist is checked again at the moment of submitting: a
    // requirement marked not met, or evidence lapsing, after approval stops it.
    if ((SUBMISSION_ACTIONS as readonly string[]).includes(request.actionType)) {
      const clear = requirementsGate(opp.kind, await requirementFacts(tx, request.opportunityId, now));
      if (!clear.ok) return clear;
    }
    // Already done? A tender or quotation is submitted once per opportunity: its
    // lifecycle has no resubmission loop. Partnership steps can legitimately
    // repeat after a rejection and remediation, so for them only this round
    // counts (since the record reached its current status).
    const onceOnly = request.actionType === "submit_tender" || request.actionType === "send_quote";
    const confirmed = await tx.executionRecord.findFirst({
      where: {
        opportunityId: request.opportunityId,
        actionType: request.actionType,
        outcome: "confirmed",
        ...(onceOnly ? {} : { startedAt: { gte: opp.statusChangedAt } }),
      },
    });
    const unresolved = await tx.executionRecord.findFirst({
      where: { opportunityId: request.opportunityId, actionType: request.actionType, outcome: { in: ["pending", "ambiguous"] } },
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
      hasUnresolvedSameAction: unresolved !== null,
      deadlineAt: opp.deadlineAt,
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
  }), "An earlier attempt is still pending or unclear. Check the portal and record its outcome first.");
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
    const found = await tx.executionRecord.findUnique({ where: { id: input.executionId }, select: { opportunityId: true } });
    if (!found) return fail("That record could not be found.");
    await lockOpportunity(tx, found.opportunityId);
    // Read again under the lock.
    const exec = await tx.executionRecord.findUnique({ where: { id: input.executionId } });
    if (!exec) return fail("That record could not be found.");
    if (exec.outcome !== "pending" && exec.outcome !== "ambiguous") return fail("This outcome has already been recorded.");
    if (input.outcome === "confirmed") {
      if (!input.receiptVersionId) return fail("Upload the portal's receipt or confirmation first.");
      if (!input.portalReference?.trim()) return fail("Enter the portal's reference for this submission.");
      const receipt = await tx.companyDocumentVersion.findUnique({ where: { id: input.receiptVersionId } });
      if (!receipt) return fail("The receipt document could not be found.");
      const usable = evidenceVerdict(receipt);
      if (!usable.ok) return fail(usable.reason.replace("evidence", "a receipt"));
    }

    // Compare-and-set: two people recording an outcome at once cannot both win.
    const recorded = await tx.executionRecord.updateMany({
      where: { id: exec.id, outcome: exec.outcome },
      data: {
        outcome: input.outcome,
        portalReference: input.portalReference?.trim().slice(0, 200) || null,
        finishedAt: input.outcome === "ambiguous" ? null : new Date(),
      },
    });
    if (recorded.count !== 1) return fail("The outcome was recorded by someone else just now. Reload to see it.");
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
      // A confirmed registration becomes the portal's account record, pending
      // the portal's own verification. Never a second live account (section 38).
      if (exec.actionType === "register_account") {
        const decision = await tx.approvalDecision.findUnique({ where: { id: exec.approvalDecisionId }, select: { Request: { select: { destination: true } } } });
        // Never over an account already active: that one is kept and the
        // duplicate registration is recorded for a person to look at. A
        // destination that matches no portal is recorded too, not passed over.
        // Locking the portal row serialises two confirmations (and an admin
        // recording an account) for one portal: the second sees the first's
        // account instead of colliding with the one-live-account rule.
        const { portal, ambiguous } = await portalForDestination(tx, decision?.Request.destination ?? "", { lock: true });
        if (!portal) {
          await audit(tx, input.userId, ambiguous ? "registration.portal_ambiguous" : "registration.no_portal_matched", "ExecutionRecord", exec.id, {
            opportunityId: exec.opportunityId,
            destination: decision?.Request.destination ?? null,
          });
        } else {
          const live = await tx.supplierAccount.findFirst({
            where: { portalId: portal.id, status: { in: [...LIVE_ACCOUNT_STATUSES] } },
            select: { id: true, status: true, accountRef: true },
          });
          const data = {
            status: "pending",
            accountRef: input.portalReference?.trim().slice(0, 200) || null,
            registeredAt: new Date(),
            verificationStatus: "awaiting the portal",
            approvalDecisionId: exec.approvalDecisionId,
            ownerUserId: input.userId,
          };
          // Conditional on the status at the moment of writing, so an account
          // marked active by someone else since it was read is never overwritten.
          const replaced = live
            ? await tx.supplierAccount.updateMany({ where: { id: live.id, status: { in: [...REREGISTERABLE_STATUSES] } }, data })
            : null;
          if (live && replaced?.count !== 1) {
            await audit(tx, input.userId, "registration.account_already_active", "SupplierAccount", live.id, {
              portalId: portal.id,
              executionId: exec.id,
              portalReference: input.portalReference ?? null,
            });
          } else if (live) {
            // What the account was before (a suspension, say) stays on record.
            await audit(tx, input.userId, "registration.account_replaced", "SupplierAccount", live.id, {
              portalId: portal.id,
              executionId: exec.id,
              previousStatus: live.status,
              previousReference: live.accountRef,
              portalReference: input.portalReference ?? null,
            });
          } else {
            await tx.supplierAccount.create({ data: { id: crypto.randomUUID(), portalId: portal.id, ...data } });
          }
        }
      }
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
