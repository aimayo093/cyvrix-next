import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { credentialLabelProblem, scoreAssessment, WEIGHTS, type AccountStatus, type ScoringModel } from "./partnerships";
import { audit } from "./service";

/**
 * Database side of Phase 3: supplier portals and accounts, partnership
 * programmes, assessments and the standing registration policy (D13).
 * Every write is audited in the same transaction.
 */

type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; reason: string };
const fail = (reason: string) => ({ ok: false as const, reason });

/** The portal a package is addressed to: its destination is the portal's address or registration page. */
export async function portalForDestination(tx: Prisma.TransactionClient | typeof prisma, destination: string) {
  const d = destination.trim();
  return tx.supplierPortal.findFirst({ where: { OR: [{ url: d }, { registrationUrl: d }] } });
}

export async function saveAccount(input: {
  id?: string;
  portalId: string;
  status: AccountStatus;
  accountRef?: string | null;
  registeredAt?: Date | null;
  contactAlias?: string | null;
  credentialLabel?: string | null;
  mfaRequired?: boolean | null;
  renewalAt?: Date | null;
  restrictions?: string | null;
  notes?: string | null;
  userId: string;
}): Promise<Result<string>> {
  if (input.credentialLabel) {
    const problem = credentialLabelProblem(input.credentialLabel);
    if (problem) return fail(problem);
  }
  const data = {
    portalId: input.portalId,
    status: input.status,
    accountRef: input.accountRef ?? null,
    registeredAt: input.registeredAt ?? null,
    contactAlias: input.contactAlias ?? null,
    credentialLabel: input.credentialLabel?.trim() ?? null,
    mfaRequired: input.mfaRequired ?? null,
    renewalAt: input.renewalAt ?? null,
    restrictions: input.restrictions ?? null,
    notes: input.notes ?? null,
    ownerUserId: input.userId,
  };
  try {
    const id = input.id ?? crypto.randomUUID();
    await prisma.$transaction(async (tx) => {
      if (input.id) await tx.supplierAccount.update({ where: { id: input.id }, data });
      else await tx.supplierAccount.create({ data: { id, ...data } });
      // The label is a name, but it is still not copied into the audit log.
      await audit(tx, input.userId, input.id ? "supplier_account.updated" : "supplier_account.created", "SupplierAccount", id, {
        portalId: input.portalId,
        status: input.status,
      });
    });
    return { ok: true, value: id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("CYVRIX already has an account on this portal. Update that one instead of adding a second (spec section 38).");
    }
    throw error;
  }
}

/**
 * Switch the standing registration policy for one portal (D13). Founder only,
 * with a fresh authenticator code (checked by the caller); free portals only
 * (the database refuses otherwise). The approvals it later grants carry this
 * founder and this moment as their authority.
 */
export async function setStandingPolicy(portalId: string, on: boolean, userId: string, stepUpAt: Date): Promise<Result> {
  const portal = await prisma.supplierPortal.findUnique({ where: { id: portalId } });
  if (!portal) return fail("That portal could not be found.");
  if (on && portal.cost !== "free") return fail("Only a portal confirmed as free can have a standing policy. Set its cost first.");
  await prisma.$transaction(async (tx) => {
    await tx.supplierPortal.update({
      where: { id: portalId },
      data: on ? { standingPolicy: true, standingPolicyById: userId, standingPolicyAt: stepUpAt } : { standingPolicy: false, standingPolicyById: null, standingPolicyAt: null },
    });
    await audit(tx, userId, on ? "supplier_portal.policy_on" : "supplier_portal.policy_off", "SupplierPortal", portalId, {});
  });
  return { ok: true };
}

export async function recordAssessment(input: {
  opportunityId: string;
  model: ScoringModel;
  scores: Record<string, number>;
  disqualifiers: string[];
  assumptions?: string;
  authorId: string;
}): Promise<Result<{ id: string; total: number; recommendation: string }>> {
  const result = scoreAssessment(input.model, input.scores, input.disqualifiers);
  if (result.problems.length) return fail(result.problems[0]);
  const opp = await prisma.opportunity.findUnique({ where: { id: input.opportunityId }, select: { kind: true } });
  if (!opp) return fail("That opportunity could not be found.");
  if ((input.model === "partnership") !== (opp.kind === "partnership")) {
    return fail(input.model === "partnership" ? "Partnership scoring is for partnership opportunities." : "Use partnership scoring for a partnership.");
  }
  const id = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.bidAssessment.create({
      data: {
        id,
        opportunityId: input.opportunityId,
        model: input.model,
        weights: WEIGHTS[input.model] as Prisma.InputJsonValue,
        scores: input.scores as Prisma.InputJsonValue,
        disqualifiers: input.disqualifiers.map((d) => d.trim()).filter(Boolean),
        assumptions: input.assumptions?.slice(0, 4000) || null,
        total: result.total,
        recommendation: result.recommendation,
        authorId: input.authorId,
      },
    });
    await audit(tx, input.authorId, "assessment.recorded", "Opportunity", input.opportunityId, { model: input.model, total: result.total, recommendation: result.recommendation });
  });
  return { ok: true, value: { id, total: result.total, recommendation: result.recommendation } };
}
