/**
 * Phase 3 rules: supplier accounts, registration readiness, the standing
 * registration policy (D13) and the bid / partnership scoring models (spec
 * sections 12 and 40). Pure, so they are tested without a database
 * (npm run test:procurement-partnerships).
 */

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

/**
 * D7: the credential label names a password-manager entry ("1Password: Cyvrix /
 * Sell2Wales"). It must never be the password itself. A long run of characters
 * with no spaces, mixing letters with digits or symbols, looks like a secret and
 * is refused. Names are short and readable.
 */
export function credentialLabelProblem(label: string): string | null {
  const t = label.trim();
  if (t.length < 3 || t.length > 120) return "Give the password-manager entry's name (3 to 120 characters).";
  const runs = t.split(/[\s:/|,>-]+/).filter(Boolean);
  const secretLike = runs.some((r) => r.length >= 12 && /[A-Za-z]/.test(r) && /[\d\W_]/.test(r) && !/^https?/.test(r));
  if (secretLike) return "That looks like a password or key. Enter only the name of the entry in your password manager, never the secret.";
  return null;
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

const EVIDENCE = ["verified", "founder_approved", "certified_evidence"];

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
  for (const key of Object.keys(scores)) if (!(key in weights)) problems.push(`Unknown category: ${key}.`);
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
