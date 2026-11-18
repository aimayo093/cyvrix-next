/**
 * Opportunity lifecycles (spec sections 14 and 43), as data.
 *
 * Pure: no database and no `server-only`, so `npm run test:procurement` can run
 * it. `lib/procurement/transition.ts` gathers the facts from the database and
 * applies the result.
 *
 * Gates decide who or what may make a move:
 *   person    any signed-in administrator
 *   founder   SUPER_ADMIN only (bid authorisation, contract acceptance)
 *   approval  an approved, unexpired, unused founder decision for one of the
 *             listed actions, bound to the current package (02-design §5)
 *   executed  a confirmed execution of one of the listed actions, with a receipt
 *   evidence  an uploaded document from the buyer or organisation
 *   requirements  a person, once the tender's requirements are recorded and
 *             every mandatory one is met or not applicable (Phase 4)
 * Agents may make only the moves that list "agent". Nothing an agent sends can
 * reach Submitted, Awarded, ApprovedPartner or any approved state.
 */

import { requirementsGate } from "./requirements";

export const OPPORTUNITY_KINDS = ["commercial", "tender", "partnership", "assignment"] as const;
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

export type Actor = "agent" | "person" | "founder" | "system";

export type ApprovalAction =
  | "submit_tender"
  | "submit_application"
  | "register_account"
  | "send_email"
  | "send_quote"
  | "accept_contract"
  | "accept_assignment"
  | "spend";

export const APPROVAL_ACTIONS: readonly ApprovalAction[] = [
  "submit_tender",
  "submit_application",
  "register_account",
  "send_email",
  "send_quote",
  "accept_contract",
  "accept_assignment",
  "spend",
];

type Gate =
  | { kind: "person"; agent?: boolean }
  | { kind: "founder" }
  | { kind: "approval"; actions: ApprovalAction[] }
  | { kind: "executed"; actions: ApprovalAction[] }
  | { kind: "evidence" }
  | { kind: "requirements" };

type Move = { from: string; to: string; gate: Gate };

const person: Gate = { kind: "person" };
const personOrAgent: Gate = { kind: "person", agent: true };
const founder: Gate = { kind: "founder" };

/** Spec section 14, for commercial leads, tenders and assignments. */
const PIPELINE: Move[] = [
  { from: "Discovered", to: "Validated", gate: personOrAgent },
  // Not in the spec's diagram: discarding an obviously irrelevant record.
  { from: "Discovered", to: "Archived", gate: person },
  { from: "Validated", to: "Qualified", gate: personOrAgent },
  { from: "Validated", to: "Archived", gate: person },
  { from: "Qualified", to: "EligibilityReview", gate: person },
  { from: "EligibilityReview", to: "RegistrationRequired", gate: person },
  { from: "RegistrationRequired", to: "EligibilityReview", gate: person },
  { from: "EligibilityReview", to: "AwaitingBidDecision", gate: person },
  { from: "EligibilityReview", to: "NoBid", gate: person },
  { from: "AwaitingBidDecision", to: "PreparingBid", gate: founder },
  { from: "AwaitingBidDecision", to: "NoBid", gate: founder },
  { from: "PreparingBid", to: "QualityReview", gate: person },
  { from: "QualityReview", to: "PreparingBid", gate: person },
  { from: "QualityReview", to: "AwaitingFinalApproval", gate: { kind: "requirements" } },
  { from: "AwaitingFinalApproval", to: "PreparingBid", gate: founder },
  { from: "AwaitingFinalApproval", to: "ApprovedForSubmission", gate: { kind: "approval", actions: ["submit_tender", "send_quote"] } },
  { from: "AwaitingFinalApproval", to: "Rejected", gate: founder },
  { from: "ApprovedForSubmission", to: "Submitting", gate: person },
  { from: "Submitting", to: "Submitted", gate: { kind: "executed", actions: ["submit_tender", "send_quote"] } },
  { from: "Submitting", to: "SubmissionFailed", gate: person },
  { from: "SubmissionFailed", to: "AwaitingFinalApproval", gate: { kind: "requirements" } },
  { from: "Submitted", to: "UnderEvaluation", gate: person },
  { from: "UnderEvaluation", to: "ClarificationRequired", gate: person },
  { from: "ClarificationRequired", to: "UnderEvaluation", gate: person },
  { from: "UnderEvaluation", to: "Awarded", gate: { kind: "evidence" } },
  { from: "UnderEvaluation", to: "Unsuccessful", gate: person },
  { from: "Awarded", to: "ContractReview", gate: person },
  { from: "ContractReview", to: "OperationalHandover", gate: { kind: "approval", actions: ["accept_contract", "accept_assignment"] } },
];

/** Spec section 43, for partnership programmes. */
const PARTNERSHIP: Move[] = [
  { from: "TargetIdentified", to: "Researching", gate: personOrAgent },
  { from: "Researching", to: "ProgrammeVerified", gate: personOrAgent },
  { from: "Researching", to: "NoPublicProgramme", gate: personOrAgent },
  { from: "NoPublicProgramme", to: "OutreachPreparation", gate: person },
  { from: "OutreachPreparation", to: "AwaitingOutreachApproval", gate: person },
  { from: "AwaitingOutreachApproval", to: "Contacted", gate: { kind: "executed", actions: ["send_email"] } },
  { from: "Contacted", to: "ProgrammeVerified", gate: person },
  { from: "Contacted", to: "Monitoring", gate: person },
  { from: "ProgrammeVerified", to: "EligibilityReview", gate: person },
  { from: "EligibilityReview", to: "Ineligible", gate: person },
  { from: "EligibilityReview", to: "RegistrationRequired", gate: person },
  { from: "RegistrationRequired", to: "RegistrationPrepared", gate: person },
  { from: "RegistrationPrepared", to: "AwaitingRegistrationApproval", gate: person },
  { from: "AwaitingRegistrationApproval", to: "AccountCreated", gate: { kind: "executed", actions: ["register_account"] } },
  { from: "AccountCreated", to: "ApplicationPreparation", gate: person },
  { from: "ApplicationPreparation", to: "QualityReview", gate: person },
  { from: "QualityReview", to: "ApplicationPreparation", gate: person },
  { from: "QualityReview", to: "AwaitingFinalApproval", gate: { kind: "requirements" } },
  { from: "AwaitingFinalApproval", to: "ApplicationSubmitted", gate: { kind: "executed", actions: ["submit_application"] } },
  { from: "AwaitingFinalApproval", to: "ApplicationPreparation", gate: founder },
  { from: "ApplicationSubmitted", to: "UnderReview", gate: person },
  { from: "UnderReview", to: "AdditionalInformationRequired", gate: person },
  { from: "AdditionalInformationRequired", to: "UnderReview", gate: person },
  { from: "UnderReview", to: "ApprovedPartner", gate: { kind: "evidence" } },
  { from: "UnderReview", to: "Rejected", gate: person },
  { from: "ApprovedPartner", to: "ActiveOpportunityMonitoring", gate: person },
  { from: "ActiveOpportunityMonitoring", to: "AssignmentReceived", gate: person },
  { from: "AssignmentReceived", to: "CommercialAssessment", gate: person },
  { from: "CommercialAssessment", to: "AssignmentApproval", gate: person },
  { from: "AssignmentApproval", to: "ServiceDelivery", gate: { kind: "approval", actions: ["accept_assignment"] } },
  { from: "ServiceDelivery", to: "ActiveOpportunityMonitoring", gate: person },
  { from: "Rejected", to: "RemediationReview", gate: person },
  { from: "RemediationReview", to: "Researching", gate: person },
];

const machineFor = (kind: OpportunityKind) => (kind === "partnership" ? PARTNERSHIP : PIPELINE);

export function initialStatus(kind: OpportunityKind): string {
  return kind === "partnership" ? "TargetIdentified" : "Discovered";
}

export function statesFor(kind: OpportunityKind): string[] {
  const seen = new Set<string>([initialStatus(kind)]);
  for (const move of machineFor(kind)) {
    seen.add(move.from);
    seen.add(move.to);
  }
  return [...seen];
}

export function nextStates(kind: OpportunityKind, from: string): { to: string; gate: Gate["kind"] }[] {
  return machineFor(kind)
    .filter((move) => move.from === from)
    .map((move) => ({ to: move.to, gate: move.gate.kind }));
}

/** What the database says, gathered by the caller just before the move. */
export type TransitionFacts = {
  actor: Actor;
  /** Actions with an approved, unexpired, unused decision bound to the current locked package. */
  currentApprovals: ApprovalAction[];
  /** Actions with a confirmed execution that has at least one receipt. */
  confirmedExecutions: ApprovalAction[];
  /** A document version uploaded as evidence for this move. */
  evidenceVersionId?: string | null;
  /** The requirements checklist, counted in the same transaction (Phase 4). */
  requirements: { recorded: number; mandatoryOpen: number; mandatoryNotMet: number };
};

export type TransitionVerdict = { ok: true } | { ok: false; reason: string };

export function checkTransition(
  kind: OpportunityKind,
  from: string,
  to: string,
  facts: TransitionFacts
): TransitionVerdict {
  const move = machineFor(kind).find((m) => m.from === from && m.to === to);
  if (!move) return { ok: false, reason: `${from} cannot move to ${to}.` };

  const { gate } = move;
  if (facts.actor === "agent" && !(gate.kind === "person" && gate.agent)) {
    return { ok: false, reason: `An agent cannot move a record to ${to}.` };
  }
  if (facts.actor === "system") {
    return { ok: false, reason: "Status changes need a person or a listed agent move." };
  }

  switch (gate.kind) {
    case "person":
      return { ok: true };
    case "founder":
      return facts.actor === "founder" ? { ok: true } : { ok: false, reason: `Only the founder can move a record to ${to}.` };
    case "approval": {
      if (!gate.actions.some((a) => facts.currentApprovals.includes(a))) {
        return { ok: false, reason: `${to} needs a current founder approval (${gate.actions.join(" or ")}).` };
      }
      // A submission approval is only usable while the checklist is still
      // clear: a requirement changed after approval stops it here.
      return to === "ApprovedForSubmission" ? requirementsGate(kind, facts.requirements) : { ok: true };
    }
    case "executed":
      return gate.actions.some((a) => facts.confirmedExecutions.includes(a))
        ? { ok: true }
        : { ok: false, reason: `${to} needs a confirmed ${gate.actions.join(" or ")} with a receipt.` };
    case "evidence":
      return facts.evidenceVersionId
        ? { ok: true }
        : { ok: false, reason: `${to} needs an uploaded document from the buyer or organisation as evidence.` };
    case "requirements":
      return requirementsGate(kind, facts.requirements);
  }
}
