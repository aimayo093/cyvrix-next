import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { initialStatus } from "./lifecycle";
import {
  credentialLabelProblem,
  policyMustReset,
  scoreAssessment,
  sourceMatchesOrganisation,
  WEIGHTS,
  type AccountStatus,
  type ScoringModel,
} from "./partnerships";
import { portalSharingAddress } from "./portal-lookup";
import { audit } from "./service";

/**
 * Database side of Phase 3: supplier portals and accounts, partnership
 * programmes, assessments and the standing registration policy (D13).
 * Every write is audited in the same transaction.
 */

type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; reason: string };
const fail = (reason: string) => ({ ok: false as const, reason });

const knownError = (error: unknown, code: string) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

export type PortalInput = {
  id?: string;
  name: string;
  kind: string;
  url: string;
  registrationUrl: string | null;
  termsUrl: string | null;
  cost: "free" | "paid" | "unknown";
  organisationId: string | null;
  notes: string | null;
  requiredFacts: string[];
  requiredDocuments: string[];
};

/**
 * Add or update a portal. A change to its address, registration page or cost
 * ends its standing policy (D13): the founder's approval covered that portal
 * at that address, and is not carried to a new one.
 */
export async function savePortalRecord(input: PortalInput, userId: string): Promise<Result<{ id: string; policyReset: boolean }>> {
  const id = input.id ?? crypto.randomUUID();
  try {
    return await prisma.$transaction(async (tx) => {
      const data = {
        name: input.name,
        kind: input.kind,
        url: input.url,
        registrationUrl: input.registrationUrl,
        termsUrl: input.termsUrl,
        cost: input.cost,
        organisationId: input.organisationId,
        notes: input.notes,
        requiredFacts: input.requiredFacts,
        requiredDocuments: input.requiredDocuments,
      };
      // A destination must name one portal (portal-lookup.ts), so two portals
      // may not share an address or registration page.
      const clash = await portalSharingAddress(tx, [input.url, input.registrationUrl], input.id ?? null);
      if (clash) return fail(`${clash.name} already uses that address or registration page. Each portal needs its own.`);
      let policyReset = false;
      if (input.id) {
        const before = await tx.supplierPortal.findUnique({ where: { id }, select: { url: true, registrationUrl: true, cost: true, standingPolicy: true } });
        if (!before) return fail("That portal could not be found.");
        policyReset = before.standingPolicy && policyMustReset(before, input);
        await tx.supplierPortal.update({
          where: { id },
          data: { ...data, ...(policyReset || input.cost !== "free" ? { standingPolicy: false, standingPolicyById: null, standingPolicyAt: null } : {}) },
        });
      } else {
        await tx.supplierPortal.create({ data: { id, ...data } });
      }
      await audit(tx, userId, input.id ? "supplier_portal.updated" : "supplier_portal.created", "SupplierPortal", id, { name: input.name, cost: input.cost, url: input.url });
      if (policyReset) await audit(tx, userId, "supplier_portal.policy_off", "SupplierPortal", id, { reason: "address or cost changed" });
      return { ok: true as const, value: { id, policyReset } };
    });
  } catch (error) {
    if (knownError(error, "P2002")) return fail("A portal with that name already exists.");
    if (knownError(error, "P2003")) return fail("That organisation could not be found.");
    throw error;
  }
}

export type ProgrammeInput = {
  id?: string;
  organisationId: string;
  name: string;
  categories: string[];
  url: string | null;
  sourceUrl: string | null;
  verified: boolean;
  availability: string;
  fees: string | null;
  requirements: string | null;
  portalId: string | null;
};

/**
 * Add or update a partnership programme (spec sections 35-36). "Verified"
 * needs the page it was checked against, on the organisation's own site when
 * that site is known.
 */
export async function saveProgrammeRecord(input: ProgrammeInput, userId: string): Promise<Result<string>> {
  if (input.verified && !input.sourceUrl) return fail("A verified programme needs the page it was checked against.");
  const org = await prisma.organisation.findUnique({ where: { id: input.organisationId }, select: { website: true } });
  if (!org) return fail("That organisation could not be found.");
  if (input.verified && input.sourceUrl && !sourceMatchesOrganisation(input.sourceUrl, org.website)) {
    return fail("A verified programme's source must be on the organisation's own website.");
  }
  const id = input.id ?? crypto.randomUUID();
  try {
    return await prisma.$transaction(async (tx) => {
      const before = input.id ? await tx.partnershipProgramme.findUnique({ where: { id }, select: { verified: true, verifiedAt: true } }) : null;
      if (input.id && !before) return fail("That programme could not be found.");
      const verifiedAt = input.verified ? (before?.verified ? before.verifiedAt : new Date()) : null;
      const data = { ...input, id: undefined, verifiedAt };
      if (input.id) await tx.partnershipProgramme.update({ where: { id }, data });
      else await tx.partnershipProgramme.create({ data: { ...data, id } });
      await audit(tx, userId, input.id ? "programme.updated" : "programme.created", "PartnershipProgramme", id, {
        organisationId: input.organisationId,
        verified: input.verified,
        availability: input.availability,
      });
      return { ok: true as const, value: id };
    });
  } catch (error) {
    if (knownError(error, "P2003")) return fail("That organisation or portal could not be found.");
    throw error;
  }
}

/**
 * Start pursuing a programme: one partnership opportunity, linked to it. The
 * database allows one opportunity per programme, so two people pressing at
 * once get the same record, not two.
 */
export async function pursueProgrammeRecord(programmeId: string, userId: string): Promise<Result<{ id: string; existing: boolean }>> {
  const programme = await prisma.partnershipProgramme.findUnique({ where: { id: programmeId }, include: { Organisation: true } });
  if (!programme) return fail("That programme could not be found.");
  const existing = async () => prisma.opportunity.findFirst({ where: { programmeId }, select: { id: true } });
  const found = await existing();
  if (found) return { ok: true, value: { id: found.id, existing: true } };
  const link = programme.sourceUrl ?? programme.url;
  const id = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.opportunity.create({
        data: {
          id,
          kind: "partnership",
          status: initialStatus("partnership"),
          title: `${programme.Organisation.name}: ${programme.name}`.slice(0, 300),
          buyerOrganisationId: programme.organisationId,
          programmeId: programme.id,
          origin: "manual",
          createdById: userId,
          Evidence: {
            create: { id: crypto.randomUUID(), kind: link ? "web" : "note", url: link, quote: link ? null : "Programme recorded without a link yet.", retrievedAt: new Date(), createdById: userId },
          },
        },
      });
      await audit(tx, userId, "opportunity.created", "Opportunity", id, { kind: "partnership", programmeId: programme.id });
    });
  } catch (error) {
    if (knownError(error, "P2002")) {
      const winner = await existing();
      if (winner) return { ok: true, value: { id: winner.id, existing: true } };
    }
    throw error;
  }
  return { ok: true, value: { id, existing: false } };
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
    if (knownError(error, "P2002")) {
      return fail("CYVRIX already has an account on this portal. Update that one instead of adding a second (spec section 38).");
    }
    if (knownError(error, "P2025")) return fail("That account no longer exists. Reload the page.");
    if (knownError(error, "P2003")) return fail("That portal no longer exists. Reload the page.");
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
