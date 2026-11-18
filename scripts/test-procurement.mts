/**
 * The procurement rules that need no database: lifecycles, manifest hashing,
 * approval expiry and the execution checks (docs/procurement/02-design.md §4–5).
 * Run with: npm run test:procurement
 */
import {
  approvalExpiry,
  canDecide,
  canExecute,
  canonicalJson,
  evidenceVerdict,
  mayBePublicFact,
  manifestSha256,
  type ExecutionCheckInput,
} from "../lib/procurement/approval-core";
import { checkTransition, initialStatus, nextStates, statesFor, type OpportunityKind, type TransitionFacts } from "../lib/procurement/lifecycle";
import { londonWallTimeToUtc } from "../lib/procurement/london-time";

/** States reachable by walking the machine from its starting status. */
function reachable(kind: OpportunityKind): Set<string> {
  const seen = new Set([initialStatus(kind)]);
  const queue = [initialStatus(kind)];
  while (queue.length) {
    for (const { to } of nextStates(kind, queue.shift()!)) {
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
  }
  return seen;
}

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}
const okOf = (v: { ok: boolean }) => v.ok;

const none: TransitionFacts = { actor: "person", currentApprovals: [], confirmedExecutions: [], requirements: { recorded: 1, mandatoryOpen: 0, mandatoryNotMet: 0 } };
const as = (actor: TransitionFacts["actor"], extra: Partial<TransitionFacts> = {}): TransitionFacts => ({ ...none, actor, ...extra });

console.log("\n  Lifecycle: tenders and commercial (spec section 14)");
check("tenders start Discovered", initialStatus("tender"), "Discovered");
check("partnerships start TargetIdentified", initialStatus("partnership"), "TargetIdentified");
check("agent may validate", okOf(checkTransition("tender", "Discovered", "Validated", as("agent"))), true);
check("agent may qualify", okOf(checkTransition("tender", "Validated", "Qualified", as("agent"))), true);
check("agent may not archive", okOf(checkTransition("tender", "Validated", "Archived", as("agent"))), false);
check("agent may not start bid review", okOf(checkTransition("tender", "Qualified", "EligibilityReview", as("agent"))), false);
check("no skipping states", okOf(checkTransition("tender", "Discovered", "Submitted", as("founder"))), false);
check("bid authorisation is founder only", okOf(checkTransition("tender", "AwaitingBidDecision", "PreparingBid", as("person"))), false);
check("founder authorises bid", okOf(checkTransition("tender", "AwaitingBidDecision", "PreparingBid", as("founder"))), true);
check(
  "ApprovedForSubmission refused without approval, even for the founder",
  okOf(checkTransition("tender", "AwaitingFinalApproval", "ApprovedForSubmission", as("founder"))),
  false
);
check(
  "ApprovedForSubmission with a current submit_tender approval",
  okOf(checkTransition("tender", "AwaitingFinalApproval", "ApprovedForSubmission", as("person", { currentApprovals: ["submit_tender"] }))),
  true
);
check(
  "an approval for a different action does not count",
  okOf(checkTransition("tender", "AwaitingFinalApproval", "ApprovedForSubmission", as("founder", { currentApprovals: ["send_email"] }))),
  false
);
check(
  "an agent cannot use an approval",
  okOf(checkTransition("tender", "AwaitingFinalApproval", "ApprovedForSubmission", as("agent", { currentApprovals: ["submit_tender"] }))),
  false
);
check("Submitted needs a confirmed receipt", okOf(checkTransition("tender", "Submitting", "Submitted", as("founder"))), false);
check(
  "Submitted with a confirmed submit_tender",
  okOf(checkTransition("tender", "Submitting", "Submitted", as("person", { confirmedExecutions: ["submit_tender"] }))),
  true
);
check("Awarded needs evidence", okOf(checkTransition("tender", "UnderEvaluation", "Awarded", as("founder"))), false);
check("Awarded with evidence", okOf(checkTransition("tender", "UnderEvaluation", "Awarded", as("person", { evidenceVersionId: "x" }))), true);
check("agent cannot mark Awarded even with evidence", okOf(checkTransition("tender", "UnderEvaluation", "Awarded", as("agent", { evidenceVersionId: "x" }))), false);
check("system actor cannot move anything", okOf(checkTransition("tender", "Discovered", "Validated", as("system"))), false);
check("SubmissionFailed returns to final approval", okOf(checkTransition("tender", "SubmissionFailed", "AwaitingFinalApproval", as("person"))), true);
const reqs = (recorded: number, mandatoryOpen: number, mandatoryNotMet: number) => ({ requirements: { recorded, mandatoryOpen, mandatoryNotMet } });
check("final approval refused for a tender with no requirements recorded", okOf(checkTransition("tender", "QualityReview", "AwaitingFinalApproval", as("person", reqs(0, 0, 0)))), false);
check("a quotation needs no recorded requirements", okOf(checkTransition("commercial", "QualityReview", "AwaitingFinalApproval", as("person", reqs(0, 0, 0)))), true);
check("an unchecked mandatory requirement blocks final approval", okOf(checkTransition("tender", "QualityReview", "AwaitingFinalApproval", as("person", reqs(3, 1, 0)))), false);
check("an unmet mandatory requirement blocks final approval", okOf(checkTransition("tender", "SubmissionFailed", "AwaitingFinalApproval", as("founder", reqs(3, 0, 1)))), false);
check("an agent cannot reach final approval", okOf(checkTransition("tender", "QualityReview", "AwaitingFinalApproval", as("agent"))), false);
check("OperationalHandover is final", nextStates("tender", "OperationalHandover"), []);
check(
  "every spec-14 state is reachable from Discovered",
  ["Discovered", "Validated", "Qualified", "EligibilityReview", "RegistrationRequired", "AwaitingBidDecision", "PreparingBid", "QualityReview", "AwaitingFinalApproval", "ApprovedForSubmission", "Submitting", "Submitted", "SubmissionFailed", "UnderEvaluation", "ClarificationRequired", "Awarded", "Unsuccessful", "ContractReview", "OperationalHandover", "NoBid", "Rejected", "Archived"].filter((s) => !reachable("tender").has(s)),
  []
);
check("every state in the tender machine is reachable", statesFor("tender").filter((s) => !reachable("tender").has(s)), []);
check("every state in the partnership machine is reachable", statesFor("partnership").filter((s) => !reachable("partnership").has(s)), []);

console.log("\n  Lifecycle: partnerships (spec section 43)");
check("agent may research", okOf(checkTransition("partnership", "TargetIdentified", "Researching", as("agent"))), true);
check("agent may record a verified programme", okOf(checkTransition("partnership", "Researching", "ProgrammeVerified", as("agent"))), true);
check("Contacted needs a confirmed email send", okOf(checkTransition("partnership", "AwaitingOutreachApproval", "Contacted", as("founder"))), false);
check(
  "Contacted after a confirmed send_email",
  okOf(checkTransition("partnership", "AwaitingOutreachApproval", "Contacted", as("person", { confirmedExecutions: ["send_email"] }))),
  true
);
check("AccountCreated needs a confirmed registration", okOf(checkTransition("partnership", "AwaitingRegistrationApproval", "AccountCreated", as("founder"))), false);
check("ApplicationSubmitted needs a receipt", okOf(checkTransition("partnership", "AwaitingFinalApproval", "ApplicationSubmitted", as("founder"))), false);
check("ApprovedPartner needs evidence", okOf(checkTransition("partnership", "UnderReview", "ApprovedPartner", as("founder"))), false);
check("agent can never mark ApprovedPartner", okOf(checkTransition("partnership", "UnderReview", "ApprovedPartner", as("agent", { evidenceVersionId: "x" }))), false);
check("ServiceDelivery needs an accept_assignment approval", okOf(checkTransition("partnership", "AssignmentApproval", "ServiceDelivery", as("founder"))), false);
check("tender moves do not apply to partnerships", okOf(checkTransition("partnership", "Discovered", "Validated", as("person"))), false);

console.log("\n  Manifest");
const items = [
  { documentVersionId: "b", sha256: "2".repeat(64), label: "Pricing" },
  { documentVersionId: "a", sha256: "1".repeat(64), label: "Response" },
];
const base = { destination: "https://portal.example/tender/1", items, priceSnapshot: { amount: 1000, currency: "GBP" }, declarations: ["I declare A"] };
const m = manifestSha256(base);
check("is a sha256", /^[0-9a-f]{64}$/.test(m), true);
check("item order does not matter", manifestSha256({ ...base, items: [...items].reverse() }), m);
check("key order does not matter", manifestSha256({ ...base, priceSnapshot: { currency: "GBP", amount: 1000 } }), m);
check("a changed file changes it", manifestSha256({ ...base, items: [{ ...items[0], sha256: "3".repeat(64) }, items[1]] }) !== m, true);
check("a changed price changes it", manifestSha256({ ...base, priceSnapshot: { amount: 1001, currency: "GBP" } }) !== m, true);
check("a changed declaration changes it", manifestSha256({ ...base, declarations: ["I declare B"] }) !== m, true);
check("a changed destination changes it", manifestSha256({ ...base, destination: "https://elsewhere.example" }) !== m, true);
check("an added file changes it", manifestSha256({ ...base, items: [...items, { documentVersionId: "c", sha256: "4".repeat(64), label: "CV" }] }) !== m, true);
check("a relabelled file changes it", manifestSha256({ ...base, items: [{ ...items[0], label: "Prices" }, items[1]] }) !== m, true);
check("canonical JSON sorts keys", canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');

console.log("\n  Approval expiry and deciding");
const now = new Date("2026-11-15T12:00:00Z");
check("seven days with no deadline", approvalExpiry(now, null)?.toISOString(), "2026-11-22T12:00:00.000Z");
check("never past the deadline", approvalExpiry(now, new Date("2026-11-17T12:00:00Z"))?.toISOString(), "2026-11-17T12:00:00.000Z");
check("null once the deadline has passed", approvalExpiry(now, new Date("2026-11-15T11:59:00Z")), null);
check("pending and current can be decided", okOf(canDecide({ status: "pending", expiresAt: new Date("2026-11-16T00:00:00Z") }, now)), true);
check("decided cannot be decided again", okOf(canDecide({ status: "approved", expiresAt: new Date("2026-11-16T00:00:00Z") }, now)), false);
check("expired cannot be decided", okOf(canDecide({ status: "pending", expiresAt: new Date("2026-11-15T11:00:00Z") }, now)), false);

console.log("\n  Executing an approved action");
const good: ExecutionCheckInput = {
  now,
  action: "submit_tender",
  request: { actionType: "submit_tender", manifestSha256: m, opportunityId: "o1" },
  decision: { decision: "approved", manifestSha256: m, expiresAt: new Date("2026-11-20T00:00:00Z") },
  pkg: { status: "locked", manifestSha256: m, opportunityId: "o1" },
  recomputedManifest: m,
  alreadyUsed: false,
  hasConfirmedSameAction: false,
  hasUnresolvedSameAction: false,
};
check("approved, current, unchanged: allowed", okOf(canExecute(good)), true);
check("no decision: refused", okOf(canExecute({ ...good, decision: null })), false);
check("rejected: refused", okOf(canExecute({ ...good, decision: { ...good.decision!, decision: "rejected" } })), false);
check("different action: refused", okOf(canExecute({ ...good, action: "send_email" })), false);
check("expired: refused", okOf(canExecute({ ...good, now: new Date("2026-11-21T00:00:00Z") })), false);
check("replay (already used): refused", okOf(canExecute({ ...good, alreadyUsed: true })), false);
check("package superseded: refused", okOf(canExecute({ ...good, pkg: { ...good.pkg, status: "superseded" } })), false);
check("package unlocked: refused", okOf(canExecute({ ...good, pkg: { ...good.pkg, status: "draft" } })), false);
check("file changed after approval: refused", okOf(canExecute({ ...good, recomputedManifest: "f".repeat(64) })), false);
check("package from another opportunity: refused", okOf(canExecute({ ...good, pkg: { ...good.pkg, opportunityId: "o2" } })), false);
check("duplicate submission: refused", okOf(canExecute({ ...good, hasConfirmedSameAction: true })), false);
check("earlier attempt pending or unclear: refused", okOf(canExecute({ ...good, hasUnresolvedSameAction: true })), false);

console.log("\n  Evidence and receipts");
check("verified document is evidence", okOf(evidenceVerdict({ status: "verified" })), true);
check("founder-approved document is evidence", okOf(evidenceVerdict({ status: "founder_approved" })), true);
check("certified evidence is evidence", okOf(evidenceVerdict({ status: "certified_evidence" })), true);
check("an AI draft is never evidence", okOf(evidenceVerdict({ status: "ai_draft" })), false);
check("a superseded version is not evidence", okOf(evidenceVerdict({ status: "superseded" })), false);
check("a missing document is not evidence", okOf(evidenceVerdict(null)), false);
check("an expired document is not evidence", okOf(evidenceVerdict({ status: "verified", expiresAt: new Date("2026-01-01T00:00:00Z") }, new Date("2026-11-15T00:00:00Z"))), false);
check("an unexpired document is evidence", okOf(evidenceVerdict({ status: "verified", expiresAt: new Date("2027-01-01T00:00:00Z") }, new Date("2026-11-15T00:00:00Z"))), true);

console.log("\n  Withheld company facts");
check("registered office is never public", mayBePublicFact("registered_office"), false);
check("a renamed address is never public", mayBePublicFact("address_line_1"), false);
check("founder name is never public", mayBePublicFact("founder_name"), false);
check("an alias for a person is never public", mayBePublicFact("owner_name"), false);
check("company number may be public", mayBePublicFact("company_number"), true);
check("trading location may be public", mayBePublicFact("trading_location"), true);

console.log("\n  London deadlines");
const london = (s: string) => {
  const r = londonWallTimeToUtc(s);
  return r.ok ? r.date.toISOString() : "refused";
};
check("winter: London is UTC", london("2026-12-01T12:00"), "2026-12-01T12:00:00.000Z");
check("summer: London is UTC+1", london("2026-07-01T12:00"), "2026-07-01T11:00:00.000Z");
check("an impossible date is refused", london("2026-02-31T12:00"), "refused");
check("a nonexistent hour (clocks forward, 29 Mar 2026) is refused", london("2026-03-29T01:30"), "refused");
check("the hour after the change is fine", london("2026-03-29T02:00"), "2026-03-29T01:00:00.000Z");
check("a repeated hour (clocks back, 25 Oct 2026) is refused", london("2026-10-25T01:30"), "refused");
check("the hour after that change is fine", london("2026-10-25T02:00"), "2026-10-25T02:00:00.000Z");
check("a malformed value is refused", london("2026-07-01 12:00"), "refused");
check("a two-digit-era year is refused, not misread", london("0099-06-01T12:00"), "refused");

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
