/**
 * Phase 3 rules: supplier accounts, registration readiness, the standing
 * registration policy (D13) and the bid / partnership scoring models (spec
 * sections 12 and 40). Pure, so they are tested without a database
 * (npm run test:procurement-partnerships).
 */
import { EVIDENCE_STATUSES } from "./approval-core";

/** Spec section 36. A programme can be several of these. */
export const PARTNERSHIP_CATEGORIES = [
  "field_engineering_subcontractor",
  "managed_service_delivery",
  "infrastructure_subcontractor",
  "cybersecurity_delivery",
  "government_supplier",
  "defence_supply_chain",
  "manufacturer_authorised_service",
  "manufacturer_warranty_repair",
  "technology_reseller",
  "distribution_partner",
  "cloud_partner",
  "professional_services",
  "engineering_resource_supplier",
  "structured_cabling_subcontractor",
  "remote_support_delivery",
] as const;

export const PARTNERSHIP_CATEGORY_LABEL: Record<(typeof PARTNERSHIP_CATEGORIES)[number], string> = {
  field_engineering_subcontractor: "Direct field engineering subcontractor",
  managed_service_delivery: "Managed IT service delivery partner",
  infrastructure_subcontractor: "Enterprise infrastructure subcontractor",
  cybersecurity_delivery: "Cybersecurity service delivery partner",
  government_supplier: "Government procurement supplier",
  defence_supply_chain: "Defence supply-chain subcontractor",
  manufacturer_authorised_service: "Manufacturer authorised service provider",
  manufacturer_warranty_repair: "Manufacturer warranty repair provider",
  technology_reseller: "Technology reseller",
  distribution_partner: "Distribution partner",
  cloud_partner: "Cloud technology partner",
  professional_services: "Professional services partner",
  engineering_resource_supplier: "Engineering resource supplier",
  structured_cabling_subcontractor: "Structured cabling subcontractor",
  remote_support_delivery: "Remote support delivery partner",
};

/**
 * Spec section 36: revenue-generating service delivery comes before reseller
 * and distribution programmes that bring no engineering work.
 */
export const SERVICE_DELIVERY_CATEGORIES = new Set<string>([
  "field_engineering_subcontractor",
  "managed_service_delivery",
  "infrastructure_subcontractor",
  "cybersecurity_delivery",
  "manufacturer_authorised_service",
  "manufacturer_warranty_repair",
  "engineering_resource_supplier",
  "structured_cabling_subcontractor",
  "remote_support_delivery",
]);

export const ACCOUNT_STATUSES = ["active", "pending", "incomplete", "expired", "rejected", "suspended", "not_registered", "unknown"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
/** Statuses that count as "an account exists" for the one-per-portal rule. */
export const LIVE_ACCOUNT_STATUSES: readonly AccountStatus[] = ["active", "pending", "incomplete", "expired", "suspended", "unknown"];
/** Live statuses a newly confirmed registration may replace. An active account is never overwritten. */
export const REREGISTERABLE_STATUSES: readonly AccountStatus[] = ["pending", "incomplete", "expired", "suspended", "unknown"];

/**
 * D7: the credential label names a password-manager entry ("1Password: Cyvrix /
 * Sell2Wales"). It must never be the password itself. A run of 12 or more
 * characters with no spaces, mixing letters with digits or symbols (hyphens
 * aside, so "procurement-portals" is a name), looks like a secret and is
 * refused. Runs are split on spaces only, so a key with slashes or colons in it
 * (wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY) is still one run.
 */
export function credentialLabelProblem(label: string): string | null {
  const t = label.trim();
  if (t.length < 3 || t.length > 120) return "Give the password-manager entry's name (3 to 120 characters).";
  const runs = t.split(/\s+/).filter(Boolean);
  const secretLike = runs.some((r) => {
    if (/^https?:\/\//i.test(r)) return false;
    const core = r.replace(/[:,]+$/, "");
    // A bare domain ("sell2wales.gov.uk") names a site, not a secret.
    if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(core)) return false;
    return core.length >= 12 && /[A-Za-z]/.test(core) && /[\d_]|[^\w-]/.test(core);
  });
  if (secretLike) return "That looks like a password or key. Enter only the name of the entry in your password manager, never the secret.";
  return null;
}

/**
 * D13: the founder's standing policy covers one portal at one address. A
 * change to where registrations go, or to the portal no longer being free,
 * ends it; the founder switches it on again, with a fresh code, if it still applies.
 */
export function policyMustReset(
  before: { url: string; registrationUrl: string | null; cost: string },
  after: { url: string; registrationUrl: string | null; cost: string }
): boolean {
  const same = (a: string | null, b: string | null) => (a ? normaliseAddress(a) : null) === (b ? normaliseAddress(b) : null);
  return after.cost !== "free" || !same(before.url, after.url) || !same(before.registrationUrl ?? null, after.registrationUrl ?? null) || before.cost !== after.cost;
}

/**
 * A form's comma- or line-separated list. Any entry that does not match is an
 * error, never silently dropped: a mistyped requirement must not make a
 * registration look ready.
 */
export function parseList(raw: string | undefined, re: RegExp, max = 30): { ok: true; values: string[] } | { ok: false; reason: string } {
  const values = (raw ?? "").split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const bad = values.find((v) => !re.test(v));
  if (bad) return { ok: false, reason: `"${bad.slice(0, 60)}" is not a valid entry.` };
  if (values.length > max) return { ok: false, reason: `At most ${max} entries.` };
  return { ok: true, values: [...new Set(values)] };
}

/**
 * A portal address in the one form it is stored and compared in: lower-case
 * scheme and host, no default port, no fragment, no trailing slash on a
 * path. Anything that is not a URL is returned trimmed, as it was.
 */
export function normaliseAddress(raw: string): string {
  const t = raw.trim();
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return t;
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return t;
  }
}

/**
 * The forms an address may have been stored in: as typed, normalised, and
 * normalised with a trailing slash (the seeded portals end in "/"). Matching
 * on all of them means a trailing slash or a capital letter in the host does
 * not decide whether a standing policy applies.
 */
export function addressVariants(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const n = normaliseAddress(t);
  let withSlash = n;
  try {
    if (/^https?:\/\//i.test(n) && !new URL(n).search) withSlash = `${n}/`;
  } catch {
    // Not a parsable URL (normaliseAddress returned it as typed): no slash form.
  }
  return [...new Set([t, n, withSlash])];
}

/**
 * Spec section 35: a programme is verified against the organisation's own
 * page, so the source must be on the organisation's recorded website (or a
 * subdomain of it). With no website recorded there is nothing to check
 * against, and a programme cannot be marked verified.
 */
export function sourceMatchesOrganisation(sourceUrl: string, website: string | null): boolean {
  if (!website) return false;
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
    const site = new URL(website).hostname.toLowerCase().replace(/^www\./, "");
    return host === site || host.endsWith(`.${site}`);
  } catch {
    return false;
  }
}

export type PolicyInput = {
  portal: { standingPolicy: boolean; cost: string } | null;
  actionType: string;
  declarations: unknown;
  priceSnapshot: unknown;
};

/**
 * D13: a registration is pre-approved by the standing policy only when the
 * portal is free and has the policy switched on, and the package makes no
 * declarations and carries no price. Anything else comes to the founder.
 */
export function standingPolicyApplies(input: PolicyInput): { applies: boolean; why: string } {
  if (input.actionType !== "register_account") return { applies: false, why: "Only registrations can be pre-approved." };
  if (!input.portal) return { applies: false, why: "The package is not linked to a supplier portal." };
  if (!input.portal.standingPolicy) return { applies: false, why: "This portal has no standing policy." };
  if (input.portal.cost !== "free") return { applies: false, why: "Only free portals can be pre-approved." };
  if (Array.isArray(input.declarations) && input.declarations.length > 0) return { applies: false, why: "The package makes declarations, which you approve yourself." };
  if (input.priceSnapshot !== null && input.priceSnapshot !== undefined) return { applies: false, why: "The package carries a price." };
  return { applies: true, why: "Free portal with a standing policy; no declarations and no price." };
}

export type ReadinessInput = {
  requiredFacts: string[];
  requiredDocuments: string[];
  facts: { key: string; verifiedAt: Date | null }[];
  documents: { kind: string; status: string; expiresAt: Date | null }[];
  now: Date;
};

const EVIDENCE: readonly string[] = EVIDENCE_STATUSES;

/** Which verified facts and current documents a registration still lacks. */
export function registrationReadiness(input: ReadinessInput): { ready: boolean; missingFacts: string[]; missingDocuments: string[] } {
  const facts = new Set(input.facts.filter((f) => f.verifiedAt).map((f) => f.key));
  const docKinds = new Set(
    input.documents
      .filter((d) => EVIDENCE.includes(d.status) && (!d.expiresAt || d.expiresAt.getTime() > input.now.getTime()))
      .map((d) => d.kind.toLowerCase())
  );
  const missingFacts = input.requiredFacts.filter((k) => !facts.has(k));
  const missingDocuments = input.requiredDocuments.filter((k) => !docKinds.has(k.toLowerCase()));
  return { ready: missingFacts.length === 0 && missingDocuments.length === 0, missingFacts, missingDocuments };
}

// ---------------------------------------------------------------- scoring

export type ScoringModel = "bid" | "partnership";

/** Spec section 12 (bid/no-bid) and section 40 (partnerships): initial weights, in percent. */
export const WEIGHTS: Record<ScoringModel, Record<string, number>> = {
  bid: {
    technical_capability: 20,
    mandatory_eligibility: 20,
    profitability: 20,
    delivery_capacity: 15,
    cash_flow_impact: 10,
    security_and_compliance: 10,
    strategic_value: 5,
  },
  partnership: {
    revenue_potential: 25,
    existing_technical_capability: 20,
    accessibility_and_eligibility: 15,
    recurring_assignment_potential: 15,
    profitability: 10,
    strategic_importance: 10,
    onboarding_cost: 5,
  },
};

export const CATEGORY_LABEL: Record<string, string> = {
  technical_capability: "Technical capability",
  mandatory_eligibility: "Mandatory eligibility",
  profitability: "Profitability",
  delivery_capacity: "Delivery capacity",
  cash_flow_impact: "Cash-flow impact (5 = no strain)",
  security_and_compliance: "Security and compliance",
  strategic_value: "Strategic value",
  revenue_potential: "Revenue potential",
  existing_technical_capability: "Existing technical capability",
  accessibility_and_eligibility: "Accessibility and eligibility",
  recurring_assignment_potential: "Recurring assignment potential",
  strategic_importance: "Strategic importance",
  onboarding_cost: "Onboarding cost (5 = cheapest)",
};

export type Recommendation = "pursue" | "consider" | "decline" | "disqualified";

/** Initial thresholds on the 0-100 total. A recommendation, not a probability of winning. */
export const THRESHOLDS = { pursue: 70, consider: 50 } as const;

export type ScoreResult = { total: number; recommendation: Recommendation; problems: string[] };

/**
 * Scores are 0-5 per category. The total is the weighted sum on a 0-100 scale.
 * Any disqualifier (a mandatory requirement not met and not fixable in time)
 * overrides the number: the recommendation is "disqualified" (spec 12 and 40).
 */
export function scoreAssessment(model: ScoringModel, scores: Record<string, number>, disqualifiers: string[]): ScoreResult {
  const weights = WEIGHTS[model];
  const problems: string[] = [];
  let total = 0;
  for (const [category, weight] of Object.entries(weights)) {
    const s = scores[category];
    if (typeof s !== "number" || !Number.isInteger(s) || s < 0 || s > 5) {
      problems.push(`${CATEGORY_LABEL[category] ?? category}: give a whole number from 0 to 5.`);
      continue;
    }
    total += (weight * s) / 5;
  }
  // Own properties only: "constructor" or "toString" is not a category.
  for (const key of Object.keys(scores)) if (!Object.hasOwn(weights, key)) problems.push(`Unknown category: ${key}.`);
  total = Math.round(total * 100) / 100;
  const real = disqualifiers.map((d) => d.trim()).filter(Boolean);
  const recommendation: Recommendation = real.length
    ? "disqualified"
    : total >= THRESHOLDS.pursue
      ? "pursue"
      : total >= THRESHOLDS.consider
        ? "consider"
        : "decline";
  return { total, recommendation, problems };
}

// ------------------------------------------------------------ dashboard (§46)

const STAGES = {
  registrationRequired: ["RegistrationRequired", "RegistrationPrepared", "AwaitingRegistrationApproval"],
  registered: [
    "AccountCreated", "ApplicationPreparation", "QualityReview", "AwaitingFinalApproval", "ApplicationSubmitted",
    "UnderReview", "AdditionalInformationRequired", "ApprovedPartner", "ActiveOpportunityMonitoring",
    "AssignmentReceived", "CommercialAssessment", "AssignmentApproval", "ServiceDelivery",
  ],
  preparing: ["ApplicationPreparation", "QualityReview"],
  awaitingApproval: ["AwaitingFinalApproval"],
  submitted: ["ApplicationSubmitted"],
  underReview: ["UnderReview", "AdditionalInformationRequired"],
  approved: ["ApprovedPartner", "ActiveOpportunityMonitoring", "AssignmentReceived", "CommercialAssessment", "AssignmentApproval", "ServiceDelivery"],
  rejected: ["Rejected", "RemediationReview"],
  activeAssignments: ["AssignmentReceived", "CommercialAssessment", "AssignmentApproval", "ServiceDelivery"],
} as const;

export type PartnershipSummary = {
  targets: number;
  programmes: number;
  verifiedProgrammes: number;
  openProgrammes: number;
  pursuing: number;
  eligible: number;
  registrationRequired: number;
  registered: number;
  preparing: number;
  awaitingApproval: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
  activeAssignments: number;
};

/**
 * The §46 executive summary, counted from what is recorded. "Eligible" is a
 * programme whose pursuit got past the eligibility review. Partnership revenue
 * is not counted: nothing records it yet, and a number would be invented.
 */
export function partnershipSummary(
  targets: number,
  programmes: { verified: boolean; availability: string }[],
  pursuits: { status: string }[]
): PartnershipSummary {
  const count = (states: readonly string[]) => pursuits.filter((p) => states.includes(p.status)).length;
  return {
    targets,
    programmes: programmes.length,
    verifiedProgrammes: programmes.filter((p) => p.verified).length,
    openProgrammes: programmes.filter((p) => p.verified && p.availability === "open").length,
    pursuing: pursuits.length,
    eligible: count([...STAGES.registrationRequired, ...STAGES.registered]),
    registrationRequired: count(STAGES.registrationRequired),
    registered: count(STAGES.registered),
    preparing: count(STAGES.preparing),
    awaitingApproval: count(STAGES.awaitingApproval),
    submitted: count(STAGES.submitted),
    underReview: count(STAGES.underReview),
    approved: count(STAGES.approved),
    rejected: count(STAGES.rejected),
    activeAssignments: count(STAGES.activeAssignments),
  };
}

// ------------------------------------------------------- registration pack (§8, §39)

/**
 * Answers about certifications, accreditations and security clearance are
 * never filled in from a stored fact: the founder answers them from the
 * certificate itself, so a lapsed or mistaken record cannot be repeated on a
 * registration form (spec §39: never invent or overstate evidence).
 */
const CERTIFICATION_LIKE = /certif|accredit|clearance|vetting|iso[_\s]?\d|cyber_?essentials|bpss|(^|_)(ce|ce_plus|sc|dv|npp?v\d?)(_|$)/i;

export function isCertificationQuestion(key: string): boolean {
  return CERTIFICATION_LIKE.test(key);
}

export type PackFact = { key: string; label: string; value: string | null; state: "ready" | "unverified" | "missing" | "answer_yourself" };
export type PackDocument = { kind: string; title: string | null; versionId: string | null; filename: string | null; expiresAt: Date | null; state: "ready" | "missing" };

/**
 * What a registration form needs, from the portal's list of required facts and
 * documents: each verified fact's value, each document's current evidence
 * version, and what is missing. Only verified facts and current evidence are
 * offered (a draft or an expired certificate is "missing").
 */
export function registrationPack(input: {
  requiredFacts: string[];
  requiredDocuments: string[];
  facts: { key: string; label: string; value: string; verifiedAt: Date | null }[];
  documents: { kind: string; title: string; versionId: string; filename: string; status: string; expiresAt: Date | null; version: number }[];
  now: Date;
}): { facts: PackFact[]; documents: PackDocument[]; complete: boolean } {
  const facts: PackFact[] = input.requiredFacts.map((key) => {
    const f = input.facts.find((x) => x.key === key);
    if (isCertificationQuestion(key)) return { key, label: f?.label ?? key, value: null, state: "answer_yourself" };
    if (!f) return { key, label: key, value: null, state: "missing" };
    if (!f.verifiedAt) return { key, label: f.label, value: null, state: "unverified" };
    return { key, label: f.label, value: f.value, state: "ready" };
  });
  const documents: PackDocument[] = input.requiredDocuments.map((kind) => {
    const current = input.documents
      .filter((d) => d.kind.toLowerCase() === kind.toLowerCase() && EVIDENCE.includes(d.status) && (!d.expiresAt || d.expiresAt.getTime() > input.now.getTime()))
      .sort((a, b) => b.version - a.version)[0];
    return current
      ? { kind, title: current.title, versionId: current.versionId, filename: current.filename, expiresAt: current.expiresAt, state: "ready" }
      : { kind, title: null, versionId: null, filename: null, expiresAt: null, state: "missing" };
  });
  const complete = facts.every((f) => f.state === "ready" || f.state === "answer_yourself") && documents.every((d) => d.state === "ready");
  return { facts, documents, complete };
}
