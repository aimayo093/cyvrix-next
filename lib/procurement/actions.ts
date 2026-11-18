"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { requireAdmin } from "@/lib/auth";
import { claimFindings } from "@/lib/claim-rules";
import { prisma } from "@/lib/prisma";
import { APPROVAL_ACTIONS, initialStatus, OPPORTUNITY_KINDS, type ApprovalAction } from "./lifecycle";
import {
  audit,
  decideApproval,
  lockPackage,
  recordExecutionOutcome,
  requestApproval,
  revisePackage,
  startExecution,
  transitionOpportunity,
} from "./service";
import { evidenceVerdict, mayBePublicFact, PUBLIC_FACT_KEYS } from "./approval-core";
import { londonWallTimeToUtc } from "./london-time";
import { OFFICIAL_SOURCES, runSource, type OfficialSource } from "./ingest";
import { privacyNoticeCoversTenderContacts } from "./privacy-gate";
import { pursueProgrammeRecord, recordAssessment, saveAccount, savePortalRecord, saveProgrammeRecord, setStandingPolicy } from "./partnership-service";
import { ACCOUNT_STATUSES, PARTNERSHIP_CATEGORIES, parseList, WEIGHTS, type AccountStatus, type ScoringModel } from "./partnerships";
import { MAX_REPORT_CHARS, parseReportWithCount } from "./report-import";
import { verifyStepUp } from "./step-up";
import { MAX_DISQUALIFIERS, REQUIREMENT_KINDS, REQUIREMENT_STATUSES } from "./requirements";
import { fetchTenderDocument, refreshNoticeDocuments, saveRequirement, setDeadlines } from "./tender-service";

/**
 * Admin actions for /admin/procurement. Each one checks the role again (a form
 * can be posted without the page), validates its input, and leaves an audit
 * entry. Founder-only steps check SUPER_ADMIN here, not only in the page.
 */

const HOME = "/admin/procurement";
const ID = z.string().uuid();
const ORIGINS = ["manual", "website", "chatgpt_task", "paperclip", "supplier_portal"] as const;

const go = (path: string, status: "success" | "error", message: string): never => {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}status=${status}&message=${encodeURIComponent(message)}`);
};
const oppPath = (id: string) => `${HOME}/opportunities/${id}`;
const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

async function requireFounder() {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") go(HOME, "error", "Only the founder can do that.");
  return user;
}

const httpUrl = z
  .string()
  .url()
  .max(1000)
  .refine((u) => /^https?:\/\//i.test(u), "Links must start with http:// or https://");

// ---------------------------------------------------------------- organisations

const orgSchema = z.object({
  name: z.string().min(2).max(200),
  website: httpUrl.optional(),
  categories: z.array(z.enum(["field_engineering", "government_defence", "manufacturer", "enterprise_distribution", "buyer"])).max(5),
  priority: z.coerce.number().int().min(1).max(5),
  isResearchTarget: z.boolean(),
  sourceUrl: httpUrl.optional(),
  notes: z.string().max(4000).optional(),
});

export async function createOrganisation(fd: FormData) {
  const user = await requireAdmin();
  const parsed = orgSchema.safeParse({
    name: text(fd, "name"),
    website: text(fd, "website"),
    categories: fd.getAll("categories").map(String),
    priority: text(fd, "priority") ?? "3",
    isResearchTarget: fd.get("isResearchTarget") === "on",
    sourceUrl: text(fd, "sourceUrl"),
    notes: text(fd, "notes"),
  });
  const back = `${HOME}?tab=organisations`;
  if (!parsed.success) go(back, "error", parsed.error!.issues[0]?.message ?? "Check the form.");
  const id = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.organisation.create({ data: { id, ...parsed.data! } });
      await audit(tx, user.id, "organisation.created", "Organisation", id, { name: parsed.data!.name });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") go(back, "error", "An organisation with that name already exists.");
    throw error;
  }
  revalidatePath(HOME);
  go(back, "success", "Organisation added.");
}

export async function updateOrganisation(fd: FormData) {
  const user = await requireAdmin();
  const back = `${HOME}?tab=organisations`;
  const id = ID.safeParse(text(fd, "id"));
  const priority = z.coerce.number().int().min(1).max(5).safeParse(text(fd, "priority"));
  if (!id.success || !priority.success) go(back, "error", "Check the form.");
  const isResearchTarget = fd.get("isResearchTarget") === "on";
  await prisma.$transaction(async (tx) => {
    await tx.organisation.update({ where: { id: id.data! }, data: { priority: priority.data!, isResearchTarget } });
    await audit(tx, user.id, "organisation.updated", "Organisation", id.data!, { priority: priority.data, isResearchTarget });
  });
  revalidatePath(HOME);
  go(back, "success", "Saved.");
}

// ---------------------------------------------------------------- opportunities

const oppSchema = z.object({
  kind: z.enum(OPPORTUNITY_KINDS),
  title: z.string().min(3).max(300),
  summary: z.string().max(8000).optional(),
  buyerOrganisationId: ID.optional(),
  origin: z.enum(ORIGINS),
  ocid: z.string().regex(/^ocds-[a-z0-9]{6}-[\w-]+$/i, "That is not an OCDS identifier (ocds-xxxxxx-…).").optional(),
  deadlineAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
  valueMin: z.coerce.number().nonnegative().optional(),
  valueMax: z.coerce.number().nonnegative().optional(),
  region: z.string().max(100).optional(),
  confirmedBuying: z.boolean(),
  evidenceUrl: httpUrl.optional(),
  evidenceQuote: z.string().max(1000).optional(),
});

export async function createOpportunity(fd: FormData) {
  const user = await requireAdmin();
  const back = `${HOME}?tab=opportunities`;
  const parsed = oppSchema.safeParse({
    kind: text(fd, "kind"),
    title: text(fd, "title"),
    summary: text(fd, "summary"),
    buyerOrganisationId: text(fd, "buyerOrganisationId"),
    origin: text(fd, "origin"),
    ocid: text(fd, "ocid"),
    deadlineAt: text(fd, "deadlineAt"),
    valueMin: text(fd, "valueMin"),
    valueMax: text(fd, "valueMax"),
    region: text(fd, "region"),
    confirmedBuying: fd.get("confirmedBuying") === "on",
    evidenceUrl: text(fd, "evidenceUrl"),
    evidenceQuote: text(fd, "evidenceQuote"),
  });
  if (!parsed.success) go(back, "error", parsed.error!.issues[0]?.message ?? "Check the form.");
  const d = parsed.data!;
  // Spec section 18: every opportunity carries evidence.
  if (!d.evidenceUrl && !d.evidenceQuote) go(back, "error", "Add a source link or a short quote as evidence.");
  if (d.valueMin !== undefined && d.valueMax !== undefined && d.valueMin > d.valueMax) go(back, "error", "The lower value is above the upper value.");
  const deadline = d.deadlineAt ? londonWallTimeToUtc(d.deadlineAt) : null;
  if (deadline && !deadline.ok) go(back, "error", deadline.reason);

  const id = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.opportunity.create({
        data: {
          id,
          kind: d.kind,
          status: initialStatus(d.kind),
          title: d.title,
          summary: d.summary ?? null,
          buyerOrganisationId: d.buyerOrganisationId ?? null,
          origin: d.origin,
          ocid: d.ocid ?? null,
          deadlineAt: deadline && deadline.ok ? deadline.date : null,
          valueMin: d.valueMin ?? null,
          valueMax: d.valueMax ?? null,
          region: d.region ?? null,
          confirmedBuying: d.confirmedBuying,
          createdById: user.id,
          Evidence: {
            create: {
              id: crypto.randomUUID(),
              kind: d.evidenceUrl ? "web" : "note",
              url: d.evidenceUrl ?? null,
              quote: d.evidenceQuote ?? null,
              retrievedAt: new Date(),
              createdById: user.id,
            },
          },
        },
      });
      await audit(tx, user.id, "opportunity.created", "Opportunity", id, { kind: d.kind, origin: d.origin, status: initialStatus(d.kind) });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") go(back, "error", "An opportunity with that OCDS identifier already exists.");
    throw error;
  }
  revalidatePath(HOME);
  go(oppPath(id), "success", "Opportunity recorded.");
}

export async function addEvidence(fd: FormData) {
  const user = await requireAdmin();
  const id = ID.safeParse(text(fd, "opportunityId"));
  if (!id.success) go(HOME, "error", "That opportunity could not be found.");
  const url = text(fd, "url");
  const quote = text(fd, "quote")?.slice(0, 1000);
  if (url && !httpUrl.safeParse(url).success) go(oppPath(id.data!), "error", "Links must start with http:// or https://");
  if (!url && !quote) go(oppPath(id.data!), "error", "Add a link or a quote.");
  const evidenceId = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.opportunityEvidence.create({
      data: { id: evidenceId, opportunityId: id.data!, kind: url ? "web" : "note", url: url ?? null, quote: quote ?? null, retrievedAt: new Date(), createdById: user.id },
    });
    await audit(tx, user.id, "opportunity.evidence_added", "Opportunity", id.data!, { evidenceId });
  });
  revalidatePath(oppPath(id.data!));
  go(oppPath(id.data!), "success", "Evidence added.");
}

export async function moveOpportunity(fd: FormData) {
  const user = await requireAdmin();
  const id = ID.safeParse(text(fd, "opportunityId"));
  const to = z.string().regex(/^[A-Za-z]{3,40}$/).safeParse(text(fd, "to"));
  if (!id.success || !to.success) go(HOME, "error", "That move could not be read.");
  const evidence = text(fd, "evidenceVersionId");
  if (evidence && !ID.safeParse(evidence).success) go(oppPath(id.data!), "error", "Choose an evidence document.");
  const result = await transitionOpportunity({
    opportunityId: id.data!,
    to: to.data!,
    actor: user.role === "SUPER_ADMIN" ? "founder" : "person",
    userId: user.id,
    evidenceVersionId: evidence ?? null,
    note: text(fd, "note"),
  });
  revalidatePath(oppPath(id.data!));
  if (!result.ok) go(oppPath(id.data!), "error", result.reason);
  go(oppPath(id.data!), "success", `Moved to ${to.data}.`);
}

// ---------------------------------------------------------------- packages

export async function createPackage(fd: FormData) {
  const user = await requireAdmin();
  const id = ID.safeParse(text(fd, "opportunityId"));
  if (!id.success) go(HOME, "error", "That opportunity could not be found.");
  const back = oppPath(id.data!);
  const destination = text(fd, "destination");
  if (!destination || destination.length > 500) go(back, "error", "Say where this package goes: the portal address or the recipient.");
  const declarations = (text(fd, "declarations") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50);
  const amount = text(fd, "priceAmount");
  let priceSnapshot: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
  if (amount) {
    const n = z.coerce.number().nonnegative().safeParse(amount);
    if (!n.success) go(back, "error", "The price must be a number.");
    priceSnapshot = { amount: n.data!, currency: "GBP", basis: (text(fd, "priceBasis") ?? "").slice(0, 300) };
  }
  // Declarations and price text are checked against the claims rules before they can be approved.
  const findings = claimFindings(declarations.join("\n"));
  if (findings.length) go(back, "error", `A declaration breaks the claims rules: "${findings[0].excerpt}". ${findings[0].note}`);

  const pkgId = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      const latest = await tx.package.findFirst({ where: { opportunityId: id.data! }, orderBy: { version: "desc" } });
      await tx.package.create({
        data: { id: pkgId, opportunityId: id.data!, version: (latest?.version ?? 0) + 1, destination: destination!, declarations, priceSnapshot, createdById: user.id },
      });
      await audit(tx, user.id, "package.created", "Package", pkgId, { opportunityId: id.data, declarations: declarations.length, priced: Boolean(amount) });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") go(back, "error", "Another package was created at the same moment. Reload and try again.");
    throw error;
  }
  revalidatePath(back);
  go(back, "success", "Package created. Add documents, then lock it.");
}

export async function addPackageItem(fd: FormData) {
  const user = await requireAdmin();
  const pkgId = ID.safeParse(text(fd, "packageId"));
  const versionId = ID.safeParse(text(fd, "documentVersionId"));
  if (!pkgId.success) go(HOME, "error", "That package could not be found.");
  const pkg = await prisma.package.findUnique({ where: { id: pkgId.data! } });
  if (!pkg) go(HOME, "error", "That package could not be found.");
  const back = oppPath(pkg!.opportunityId);
  if (!versionId.success) go(back, "error", "Choose a document.");
  if (pkg!.status !== "draft") go(back, "error", "This package is locked. Revise it to change its documents.");
  const version = await prisma.companyDocumentVersion.findUnique({ where: { id: versionId.data! }, include: { Document: true } });
  if (!version) go(back, "error", "That document could not be found.");
  if (version!.status === "superseded") go(back, "error", "That version has been superseded. Choose the current one.");
  const label = (text(fd, "label") ?? `${version!.Document.title} v${version!.version}`).slice(0, 200);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.packageItem.create({ data: { id: crypto.randomUUID(), packageId: pkg!.id, documentVersionId: version!.id, label, sha256: version!.sha256 } });
      await audit(tx, user.id, "package.item_added", "Package", pkg!.id, { documentVersionId: version!.id, sha256: version!.sha256 });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") go(back, "error", "That document is already in the package.");
    // The database refuses changes to a package locked in the meantime.
    if (error instanceof Prisma.PrismaClientKnownRequestError && /cannot change/.test(error.message)) go(back, "error", "This package was locked just now. Revise it to change its documents.");
    throw error;
  }
  revalidatePath(back);
  go(back, "success", "Document added.");
}

export async function removePackageItem(fd: FormData) {
  const user = await requireAdmin();
  const itemId = ID.safeParse(text(fd, "itemId"));
  if (!itemId.success) go(HOME, "error", "That item could not be found.");
  const item = await prisma.packageItem.findUnique({ where: { id: itemId.data! }, include: { Package: true } });
  if (!item) go(HOME, "error", "That item could not be found.");
  const back = oppPath(item!.Package.opportunityId);
  if (item!.Package.status !== "draft") go(back, "error", "This package is locked.");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.packageItem.delete({ where: { id: item!.id } });
      await audit(tx, user.id, "package.item_removed", "Package", item!.packageId, { documentVersionId: item!.documentVersionId });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && /cannot change/.test(error.message)) go(back, "error", "This package was locked just now.");
    throw error;
  }
  revalidatePath(back);
  go(back, "success", "Removed.");
}

async function packageBack(packageId: string | undefined) {
  const pkg = packageId && ID.safeParse(packageId).success ? await prisma.package.findUnique({ where: { id: packageId } }) : null;
  if (!pkg) go(HOME, "error", "That package could not be found.");
  return { pkg: pkg!, back: oppPath(pkg!.opportunityId) };
}

export async function lockPackageAction(fd: FormData) {
  const user = await requireAdmin();
  const { pkg, back } = await packageBack(text(fd, "packageId"));
  const result = await lockPackage(pkg.id, user.id);
  revalidatePath(back);
  if (!result.ok) go(back, "error", result.reason);
  go(back, "success", "Locked. Its fingerprint is fixed; any change now needs a new version.");
}

export async function revisePackageAction(fd: FormData) {
  const user = await requireAdmin();
  const { pkg, back } = await packageBack(text(fd, "packageId"));
  const result = await revisePackage(pkg.id, user.id);
  revalidatePath(back);
  if (!result.ok) go(back, "error", result.reason);
  go(back, "success", "New draft version created. Any approval for the old version no longer applies.");
}

// ---------------------------------------------------------------- approvals

export async function requestApprovalAction(fd: FormData) {
  const user = await requireAdmin();
  const { pkg, back } = await packageBack(text(fd, "packageId"));
  const action = text(fd, "actionType") as ApprovalAction | undefined;
  if (!action || !APPROVAL_ACTIONS.includes(action)) go(back, "error", "Choose what the approval is for.");
  const result = await requestApproval({ packageId: pkg.id, actionType: action!, userId: user.id });
  revalidatePath(back);
  revalidatePath(HOME);
  if (!result.ok) go(back, "error", result.reason);
  go(back, "success", "Sent to the Approval Centre.");
}

export async function decideApprovalAction(fd: FormData) {
  const user = await requireFounder();
  const back = `${HOME}?tab=approvals`;
  const requestId = ID.safeParse(text(fd, "requestId"));
  const decision = z.enum(["approved", "rejected", "revision_requested"]).safeParse(text(fd, "decision"));
  if (!requestId.success || !decision.success) go(back, "error", "That decision could not be read.");
  const note = text(fd, "note");
  if (decision.data !== "approved" && !note) go(back, "error", "Say why, so the work can be corrected.");
  const stepUp = await verifyStepUp(user.id, text(fd, "code") ?? "");
  if (!stepUp.ok) go(back, "error", stepUp.reason);
  const result = await decideApproval({
    requestId: requestId.data!,
    decision: decision.data!,
    userId: user.id,
    stepUpAt: (stepUp as { at: Date }).at,
    note,
  });
  revalidatePath(HOME);
  if (!result.ok) go(back, "error", result.reason);
  go(back, "success", decision.data === "approved" ? "Approved. You can now carry it out and record the receipt." : "Decision recorded.");
}

export async function startExecutionAction(fd: FormData) {
  const user = await requireFounder();
  const decisionId = ID.safeParse(text(fd, "decisionId"));
  const mode = z.enum(["manual", "human_assisted"]).safeParse(text(fd, "mode") ?? "manual");
  if (!decisionId.success || !mode.success) go(HOME, "error", "That could not be read.");
  const decision = await prisma.approvalDecision.findUnique({ where: { id: decisionId.data! }, include: { Request: true } });
  if (!decision) go(HOME, "error", "That approval could not be found.");
  const back = oppPath(decision!.Request.opportunityId);
  const result = await startExecution({ decisionId: decision!.id, mode: mode.data!, userId: user.id });
  revalidatePath(back);
  if (!result.ok) go(back, "error", result.reason);
  go(back, "success", "Recorded as in progress. Submit it on the portal, then record the outcome here.");
}

export async function recordOutcomeAction(fd: FormData) {
  const user = await requireFounder();
  const executionId = ID.safeParse(text(fd, "executionId"));
  const outcome = z.enum(["confirmed", "rejected", "ambiguous"]).safeParse(text(fd, "outcome"));
  if (!executionId.success || !outcome.success) go(HOME, "error", "That could not be read.");
  const exec = await prisma.executionRecord.findUnique({ where: { id: executionId.data! } });
  if (!exec) go(HOME, "error", "That record could not be found.");
  const back = oppPath(exec!.opportunityId);
  const receipt = text(fd, "receiptVersionId");
  if (receipt && !ID.safeParse(receipt).success) go(back, "error", "Choose the receipt document.");
  const result = await recordExecutionOutcome({
    executionId: exec!.id,
    outcome: outcome.data!,
    portalReference: text(fd, "portalReference"),
    receiptVersionId: receipt,
    userId: user.id,
  });
  revalidatePath(back);
  if (!result.ok) go(back, "error", result.reason);
  go(back, "success", "Outcome recorded.");
}

// ---------------------------------------------------------------- company facts

const FACT_KEY = /^[a-z][a-z0-9_]{1,63}$/;

export async function saveCompanyFact(fd: FormData) {
  const user = await requireFounder();
  const back = `${HOME}?tab=facts`;
  const key = text(fd, "key") ?? "";
  const label = text(fd, "label");
  const value = text(fd, "value");
  if (!FACT_KEY.test(key) || !label || !value) go(back, "error", "A fact needs a key (lower case, underscores), a label and a value.");
  const evidence = text(fd, "evidenceVersionId");
  if (evidence && !ID.safeParse(evidence).success) go(back, "error", "Choose an evidence document.");
  if (evidence) {
    // A verified fact rests on real evidence, never an AI draft (spec section 9).
    const usable = evidenceVerdict(await prisma.companyDocumentVersion.findUnique({ where: { id: evidence } }));
    if (!usable.ok) go(back, "error", usable.reason);
  }
  const wantsPublic = fd.get("publicAllowed") === "on";
  // DECISIONS section 4: the registered office and the founder's name stay off the website.
  if (wantsPublic && !mayBePublicFact(key)) {
    go(back, "error", `Only these facts may be public: ${PUBLIC_FACT_KEYS.join(", ")}. The registered office and personal details never are.`);
  }
  const data = {
    label: label!.slice(0, 120),
    value: value!.slice(0, 2000),
    evidenceVersionId: evidence ?? null,
    verifiedAt: new Date(),
    verifiedById: user.id,
    publicAllowed: wantsPublic && mayBePublicFact(key),
  };
  await prisma.$transaction(async (tx) => {
    await tx.companyFact.upsert({ where: { key }, create: { key, ...data }, update: data });
    // The value is not copied into the audit log: some facts (the registered office) are withheld.
    await audit(tx, user.id, "company_fact.saved", "CompanyFact", key, { publicAllowed: data.publicAllowed, evidence: Boolean(evidence) });
  });
  revalidatePath(HOME);
  go(back, "success", "Saved.");
}


// ---------------------------------------------------------------- sources and imports

/**
 * Switch an official feed on or off (founder only). Nothing is fetched while it
 * is off. Switching on needs the published privacy policy to cover buyer
 * contacts from public tenders first (D12), because that is what a feed stores.
 */
export async function setSourceEnabled(fd: FormData) {
  const user = await requireFounder();
  const back = `${HOME}?tab=sources`;
  const key = text(fd, "key") as OfficialSource | undefined;
  if (!key || !OFFICIAL_SOURCES.includes(key)) go(back, "error", "Only the official feeds can be switched.");
  const enabled = text(fd, "enabled") === "true";
  if (enabled) {
    const policy = await prisma.legalPage.findUnique({ where: { slug: "privacy-policy" }, select: { status: true, body: true } });
    if (!privacyNoticeCoversTenderContacts(policy)) {
      go(
        back,
        "error",
        "Publish the procurement-contacts section of the privacy policy first (Admin → Legal Pages; wording in docs/procurement/privacy-notice-draft.md). A feed stores buyer contacts from public tenders."
      );
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.opportunitySource.update({ where: { key: key! }, data: { enabled } });
    await audit(tx, user.id, enabled ? "procurement.source_enabled" : "procurement.source_disabled", "OpportunitySource", key!, {});
  });
  revalidatePath(HOME);
  go(back, "success", enabled ? "Switched on. It runs every morning; use Run now to fetch straight away." : "Switched off.");
}

/** Fetch one switched-on official feed now (founder only). Same code path as the morning run. */
export async function runSourceNow(fd: FormData) {
  const user = await requireFounder();
  const back = `${HOME}?tab=sources`;
  const key = text(fd, "key") as OfficialSource | undefined;
  if (!key || !OFFICIAL_SOURCES.includes(key)) go(back, "error", "Only the official feeds can be run.");
  const r = await runSource(key!, { trigger: "manual", userId: user.id, budgetMs: 30_000 });
  revalidatePath(HOME);
  const summary = `${r.fetched} notices read, ${r.relevant} IT-relevant: ${r.created} new, ${r.updated} updated, ${r.merged} matched to another portal's copy.`;
  if (r.status === "succeeded") go(back, "success", r.detail ? `${summary} ${r.detail}` : summary);
  if (r.status === "skipped") go(back, "error", r.detail ?? "Skipped.");
  go(back, "error", `${r.status === "retry" ? "The feed is busy or down" : "The run failed"}: ${r.detail ?? "no detail"}. ${summary}`);
}

/**
 * Paste-in import of the ChatGPT 9 am report (D1). Every lead becomes an
 * opportunity marked as from the ChatGPT task, with its own text as evidence.
 * Leads already imported in the last 30 days (same title and link) are skipped.
 * One import at a time, all or nothing: a failure leaves no partial import and
 * is recorded as a failed run.
 */
export async function importChatgptReport(fd: FormData) {
  const user = await requireAdmin();
  const back = `${HOME}?tab=import`;
  const report = String(fd.get("report") ?? "");
  if (report.trim().length < 20) go(back, "error", "Paste the report text first.");
  if (report.length > MAX_REPORT_CHARS) go(back, "error", `That is longer than ${MAX_REPORT_CHARS.toLocaleString("en-GB")} characters. Import it in parts.`);
  const { items, omitted } = parseReportWithCount(report);
  if (items.length === 0) go(back, "error", "No items were found. Leads should be numbered, bulleted or separated by blank lines.");
  if (omitted > 0) go(back, "error", `That report has ${items.length + omitted} leads; at most ${items.length} can be imported at once. Import it in parts.`);

  const runId = crypto.randomUUID();
  await prisma.ingestionRun.create({ data: { id: runId, sourceKey: "chatgpt_task", status: "running", startedById: user.id } });
  let created = 0;
  let skipped = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        // Two imports at once would both pass the duplicate check below.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('procurement:chatgpt-import'))`;
        const since = new Date(Date.now() - 30 * 86_400_000);
        const recent = await tx.opportunity.findMany({
          where: { origin: "chatgpt_task", createdAt: { gte: since } },
          select: { title: true, Evidence: { select: { url: true }, take: 1, orderBy: { createdAt: "asc" } } },
        });
        const known = new Set(recent.map((r) => `${r.title.toLowerCase()}|${r.Evidence[0]?.url ?? ""}`));
        for (const item of items) {
          const key = `${item.title.toLowerCase()}|${item.url ?? ""}`;
          if (known.has(key)) {
            skipped += 1;
            continue;
          }
          known.add(key);
          const id = crypto.randomUUID();
          await tx.opportunity.create({
            data: {
              id,
              kind: item.kind,
              status: initialStatus(item.kind),
              title: item.title,
              summary: item.section ? `Report section: ${item.section}` : null,
              origin: "chatgpt_task",
              confirmedBuying: item.confirmedBuying,
              createdById: user.id,
              Evidence: {
                create: { id: crypto.randomUUID(), kind: "report", url: item.url, quote: item.quote, retrievedAt: new Date(), createdById: user.id },
              },
            },
          });
          await audit(tx, user.id, "opportunity.created", "Opportunity", id, { source: "chatgpt_task", importRunId: runId, kind: item.kind });
          created += 1;
        }
        await tx.ingestionRun.update({
          where: { id: runId },
          data: { status: "succeeded", finishedAt: new Date(), fetched: items.length, created, updated: 0 },
        });
        await tx.opportunitySource.update({ where: { key: "chatgpt_task" }, data: { lastRunAt: new Date(), lastSuccessAt: new Date(), health: "ok" } });
        await audit(tx, user.id, "procurement.report_imported", "IngestionRun", runId, { items: items.length, created, skipped });
      },
      { timeout: 30_000 }
    );
  } catch (error) {
    await prisma.ingestionRun
      .update({
        where: { id: runId },
        data: { status: "failed", finishedAt: new Date(), fetched: items.length, created: 0, errorClass: "internal", errorDetail: error instanceof Error ? error.name : "error" },
      })
      .catch(() => {});
    go(back, "error", "The import failed and nothing was saved. Try again; if it fails again, the report may need splitting.");
  }
  revalidatePath(HOME);
  go(`${HOME}?tab=opportunities`, "success", `Imported ${created} lead(s) from the report${skipped ? `; ${skipped} already imported in the last 30 days were skipped` : ""}. Check each one and archive anything irrelevant.`);
}

// ---------------------------------------------------------------- accounts and partnerships (Phase 3)

const ACCOUNTS = `${HOME}?tab=accounts`;
const PARTNERS = `${HOME}?tab=partnerships`;
const dateField = (fd: FormData, key: string) => {
  const v = text(fd, key);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? undefined : d;
};
/** Add or update a supplier portal or partner programme portal (admin). */
export async function savePortal(fd: FormData) {
  const user = await requireAdmin();
  const parsed = z
    .object({
      id: ID.optional(),
      name: z.string().min(2).max(200),
      kind: z.enum(["procurement_portal", "supplier_portal", "partner_programme"]),
      url: httpUrl.refine((u) => u.startsWith("https://"), "Use the portal's https address."),
      registrationUrl: httpUrl.optional(),
      termsUrl: httpUrl.optional(),
      cost: z.enum(["free", "paid", "unknown"]),
      organisationId: ID.optional(),
      notes: z.string().max(4000).optional(),
    })
    .safeParse({
      id: text(fd, "id"),
      name: text(fd, "name"),
      kind: text(fd, "kind"),
      url: text(fd, "url"),
      registrationUrl: text(fd, "registrationUrl"),
      termsUrl: text(fd, "termsUrl"),
      cost: text(fd, "cost") ?? "unknown",
      organisationId: text(fd, "organisationId"),
      notes: text(fd, "notes"),
    });
  if (!parsed.success) go(ACCOUNTS, "error", parsed.error!.issues[0]?.message ?? "Check the form.");
  const d = parsed.data!;
  // A mistyped requirement is an error, never silently dropped.
  const facts = parseList(text(fd, "requiredFacts"), /^[a-z][a-z0-9_]{1,63}$/);
  if (!facts.ok) go(ACCOUNTS, "error", `Required facts: ${facts.reason} Use lower-case keys such as company_number.`);
  const documents = parseList(text(fd, "requiredDocuments"), /^[a-z][a-z0-9 _-]{1,59}$/);
  if (!documents.ok) go(ACCOUNTS, "error", `Required documents: ${documents.reason}`);
  const result = await savePortalRecord(
    {
      id: d.id,
      name: d.name,
      kind: d.kind,
      url: d.url,
      registrationUrl: d.registrationUrl ?? null,
      termsUrl: d.termsUrl ?? null,
      cost: d.cost,
      organisationId: d.organisationId ?? null,
      notes: d.notes ?? null,
      requiredFacts: (facts as { values: string[] }).values,
      requiredDocuments: (documents as { values: string[] }).values,
    },
    user.id
  );
  revalidatePath(HOME);
  if (!result.ok) go(ACCOUNTS, "error", result.reason);
  const v = (result as { value: { policyReset: boolean } }).value;
  go(ACCOUNTS, "success", v.policyReset ? "Portal saved. Its address or cost changed, so its standing policy is off: switch it on again if it still applies." : "Portal saved.");
}

/** Record or update CYVRIX's account on a portal (D3). Never a password: only the password-manager entry's name. */
export async function saveSupplierAccount(fd: FormData) {
  const user = await requireAdmin();
  const portalId = ID.safeParse(text(fd, "portalId"));
  const status = text(fd, "status") as AccountStatus | undefined;
  if (!portalId.success || !status || !ACCOUNT_STATUSES.includes(status)) go(ACCOUNTS, "error", "Choose the portal and a status.");
  const registeredAt = dateField(fd, "registeredAt");
  const renewalAt = dateField(fd, "renewalAt");
  if (registeredAt === undefined || renewalAt === undefined) go(ACCOUNTS, "error", "Dates must be real dates.");
  const contactAlias = text(fd, "contactAlias");
  if (contactAlias && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactAlias)) go(ACCOUNTS, "error", "The account mailbox must be an email address (a shared alias such as tenders@).");
  const accountId = text(fd, "id");
  if (accountId && !ID.safeParse(accountId).success) go(ACCOUNTS, "error", "That account could not be found.");
  const result = await saveAccount({
    id: accountId,
    portalId: portalId.data!,
    status: status!,
    accountRef: text(fd, "accountRef")?.slice(0, 200) ?? null,
    registeredAt: registeredAt ?? null,
    contactAlias: contactAlias?.toLowerCase().slice(0, 254) ?? null,
    credentialLabel: text(fd, "credentialLabel") ?? null,
    mfaRequired: fd.get("mfaRequired") === "on" ? true : null,
    renewalAt: renewalAt ?? null,
    restrictions: text(fd, "restrictions")?.slice(0, 1000) ?? null,
    notes: text(fd, "notes")?.slice(0, 2000) ?? null,
    userId: user.id,
  });
  revalidatePath(HOME);
  if (!result.ok) go(ACCOUNTS, "error", result.reason);
  go(ACCOUNTS, "success", "Account saved.");
}

/** Switch a portal's standing registration policy (D13). Founder, with a fresh authenticator code. */
export async function setPortalPolicy(fd: FormData) {
  const user = await requireFounder();
  const portalId = ID.safeParse(text(fd, "portalId"));
  if (!portalId.success) go(ACCOUNTS, "error", "That portal could not be found.");
  const on = text(fd, "on") === "true";
  let at = new Date();
  if (on) {
    const stepUp = await verifyStepUp(user.id, text(fd, "code") ?? "");
    if (!stepUp.ok) go(ACCOUNTS, "error", stepUp.reason);
    at = (stepUp as { at: Date }).at;
  }
  const result = await setStandingPolicy(portalId.data!, on, user.id, at);
  revalidatePath(HOME);
  if (!result.ok) go(ACCOUNTS, "error", result.reason);
  go(ACCOUNTS, "success", on ? "Standing policy on: free registrations here with no declarations and no price are pre-approved. You still register by hand." : "Standing policy off.");
}

/** Add or update a partnership programme (spec sections 35-36). */
export async function saveProgramme(fd: FormData) {
  const user = await requireAdmin();
  const parsed = z
    .object({
      id: ID.optional(),
      organisationId: ID,
      name: z.string().min(3).max(200),
      categories: z.array(z.enum(PARTNERSHIP_CATEGORIES)).max(PARTNERSHIP_CATEGORIES.length),
      url: httpUrl.optional(),
      sourceUrl: httpUrl.optional(),
      verified: z.boolean(),
      availability: z.enum(["open", "closed", "invitation_only", "unconfirmed"]),
      fees: z.string().max(500).optional(),
      requirements: z.string().max(4000).optional(),
      portalId: ID.optional(),
    })
    .safeParse({
      id: text(fd, "id"),
      organisationId: text(fd, "organisationId"),
      name: text(fd, "name"),
      categories: fd.getAll("categories").map(String),
      url: text(fd, "url"),
      sourceUrl: text(fd, "sourceUrl"),
      verified: fd.get("verified") === "on",
      availability: text(fd, "availability") ?? "unconfirmed",
      fees: text(fd, "fees"),
      requirements: text(fd, "requirements"),
      portalId: text(fd, "portalId"),
    });
  if (!parsed.success) go(PARTNERS, "error", parsed.error!.issues[0]?.message ?? "Check the form.");
  const d = parsed.data!;
  const result = await saveProgrammeRecord(
    {
      ...d,
      url: d.url ?? null,
      sourceUrl: d.sourceUrl ?? null,
      fees: d.fees ?? null,
      requirements: d.requirements ?? null,
      portalId: d.portalId ?? null,
    },
    user.id
  );
  revalidatePath(HOME);
  if (!result.ok) go(PARTNERS, "error", result.reason);
  go(PARTNERS, "success", d.id ? "Programme updated." : "Programme added.");
}

/** Start pursuing a programme: a partnership opportunity at TargetIdentified, linked to it. */
export async function pursueProgramme(fd: FormData) {
  const user = await requireAdmin();
  const programmeId = ID.safeParse(text(fd, "programmeId"));
  if (!programmeId.success) go(PARTNERS, "error", "That programme could not be found.");
  const result = await pursueProgrammeRecord(programmeId.data!, user.id);
  revalidatePath(HOME);
  if (!result.ok) go(PARTNERS, "error", result.reason);
  const v = (result as { value: { id: string; existing: boolean } }).value;
  go(oppPath(v.id), "success", v.existing ? "Already being pursued." : "Now pursuing this programme. Its lifecycle starts at TargetIdentified.");
}

/** Record a bid/no-bid or partnership assessment (spec 12, 40). Each is kept; a new one never overwrites. */
export async function recordAssessmentAction(fd: FormData) {
  const user = await requireAdmin();
  const id = ID.safeParse(text(fd, "opportunityId"));
  const model = text(fd, "model") as ScoringModel | undefined;
  if (!id.success || (model !== "bid" && model !== "partnership")) go(HOME, "error", "That assessment could not be read.");
  const scores: Record<string, number> = {};
  for (const category of Object.keys(WEIGHTS[model!])) {
    const raw = text(fd, `score_${category}`);
    scores[category] = raw === undefined ? NaN : Number(raw);
  }
  const disqualifiers = (text(fd, "disqualifiers") ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, MAX_DISQUALIFIERS);
  const result = await recordAssessment({ opportunityId: id.data!, model: model!, scores, disqualifiers, assumptions: text(fd, "assumptions"), authorId: user.id });
  revalidatePath(oppPath(id.data!));
  if (!result.ok) go(oppPath(id.data!), "error", result.reason);
  const v = (result as { value: { total: number; recommendation: string } }).value;
  go(oppPath(id.data!), "success", `Assessment recorded: ${v.total} / 100, ${v.recommendation}. This is a recommendation, not a prediction of winning.`);
}

// ---------------------------------------------------------------- Phase 4: tender intelligence

const londonOrNull = (raw: string | undefined, what: string): Date | null => {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) go(HOME, "error", `The ${what} could not be read.`);
  const t = londonWallTimeToUtc(raw);
  if (!t.ok) go(HOME, "error", t.reason);
  return (t as { ok: true; date: Date }).date;
};

export async function setDeadlinesAction(fd: FormData) {
  const user = await requireAdmin();
  const id = ID.safeParse(text(fd, "opportunityId"));
  if (!id.success) go(HOME, "error", "That opportunity could not be found.");
  const deadlineAt = londonOrNull(text(fd, "deadlineAt"), "submission deadline");
  const clarificationDeadlineAt = londonOrNull(text(fd, "clarificationDeadlineAt"), "clarification deadline");
  if (!deadlineAt && !clarificationDeadlineAt) go(oppPath(id.data!), "error", "Enter at least one date.");
  const result = await setDeadlines({ opportunityId: id.data!, deadlineAt, clarificationDeadlineAt, userId: user.id });
  revalidatePath(oppPath(id.data!));
  if (!result.ok) go(oppPath(id.data!), "error", result.reason);
  go(oppPath(id.data!), "success", "Dates saved (London time).");
}

export async function refreshTenderDocumentsAction(fd: FormData) {
  const user = await requireAdmin();
  const id = ID.safeParse(text(fd, "opportunityId"));
  if (!id.success) go(HOME, "error", "That opportunity could not be found.");
  const result = await refreshNoticeDocuments(id.data!, user.id);
  revalidatePath(oppPath(id.data!));
  if (!result.ok) go(oppPath(id.data!), "error", result.reason);
  const added = (result as { value: number }).value;
  go(oppPath(id.data!), "success", added ? `${added} document(s) listed from the notice.` : "No new documents in the notice.");
}

export async function fetchTenderDocumentAction(fd: FormData) {
  const user = await requireAdmin();
  const id = ID.safeParse(text(fd, "documentId"));
  if (!id.success) go(HOME, "error", "That document could not be found.");
  const doc = await prisma.tenderDocument.findUnique({ where: { id: id.data! }, select: { opportunityId: true } });
  if (!doc) go(HOME, "error", "That document could not be found.");
  const result = await fetchTenderDocument(id.data!, user.id);
  revalidatePath(oppPath(doc!.opportunityId));
  if (!result.ok) go(oppPath(doc!.opportunityId), "error", result.reason);
  go(oppPath(doc!.opportunityId), "success", "A scanned copy is stored.");
}

const requirementSchema = z.object({
  id: ID.optional(),
  opportunityId: ID,
  ref: z.string().max(40).optional(),
  text: z.string().min(3).max(2000),
  kind: z.enum(REQUIREMENT_KINDS),
  status: z.enum(REQUIREMENT_STATUSES),
  sourceDocumentId: ID.optional(),
  location: z.string().max(120).optional(),
  evidenceVersionId: ID.optional(),
  notes: z.string().max(2000).optional(),
});

export async function saveRequirementAction(fd: FormData) {
  const user = await requireAdmin();
  const parsed = requirementSchema.safeParse({
    id: text(fd, "id"),
    opportunityId: text(fd, "opportunityId"),
    ref: text(fd, "ref"),
    text: text(fd, "text"),
    kind: text(fd, "kind"),
    status: text(fd, "status"),
    sourceDocumentId: text(fd, "sourceDocumentId"),
    location: text(fd, "location"),
    evidenceVersionId: text(fd, "evidenceVersionId"),
    notes: text(fd, "notes"),
  });
  const back = ID.safeParse(text(fd, "opportunityId")).success ? oppPath(text(fd, "opportunityId")!) : HOME;
  if (!parsed.success) go(back, "error", parsed.error.issues[0]?.message ?? "Check the requirement and try again.");
  const d = parsed.data!;
  const result = await saveRequirement({
    ...d,
    ref: d.ref ?? null,
    sourceDocumentId: d.sourceDocumentId ?? null,
    location: d.location ?? null,
    evidenceVersionId: d.evidenceVersionId ?? null,
    notes: d.notes ?? null,
    userId: user.id,
  });
  revalidatePath(back);
  if (!result.ok) go(back, "error", result.reason);
  go(back, "success", d.id ? "Requirement updated." : "Requirement added.");
}
