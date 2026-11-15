/**
 * The procurement rules against a real Postgres: transitions, package locking,
 * approval binding, single use, duplicate prevention and the immutability
 * triggers.
 *
 * Runs ONLY against a throwaway local database, never Supabase:
 *   1. start Postgres locally (for example docker run … postgres:17-alpine)
 *   2. apply scripts/fixtures/procurement/stub-schema.sql, then the three
 *      procurement migrations in order (foundation, organisations, hardening)
 *
 * The stub has no audit hash-chain triggers: the chain itself is tested by the
 * Security Center's audit_log_verify() on the real database, not here.
 *   3. PROCUREMENT_TEST_DATABASE_URL=postgresql://…@127.0.0.1:…/test npm run test:procurement-db
 */
import crypto from "node:crypto";

const url = process.env.PROCUREMENT_TEST_DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
// URL.hostname keeps the brackets on an IPv6 address.
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error("Refusing to run: PROCUREMENT_TEST_DATABASE_URL must point at a local throwaway database.");
  process.exit(2);
}
process.env.DATABASE_URL = url;

const { prisma } = await import("../lib/prisma");
const service = await import("../lib/procurement/service");

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}
async function rejects(name: string, fn: () => Promise<unknown>, contains: string) {
  try {
    await fn();
    check(name, "no error", `error containing "${contains}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(name, message.includes(contains), true);
  }
}
const uuid = () => crypto.randomUUID();
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const founder = "founder-user";

async function newDoc(title: string, status = "verified") {
  const documentId = uuid();
  const id = uuid();
  await prisma.companyDocument.create({ data: { id: documentId, title, kind: "test" } });
  await prisma.companyDocumentVersion.create({
    data: { id, documentId, version: 1, status, storagePath: `${documentId}/${id}.pdf`, filename: `${title}.pdf`, sha256: sha(title), sizeBytes: 10 },
  });
  return id;
}

async function newOpportunity(status: string) {
  const id = uuid();
  await prisma.opportunity.create({ data: { id, kind: "tender", status, title: `Test ${id.slice(0, 6)}`, origin: "manual" } });
  return id;
}

async function lockedPackage(opportunityId: string, docs: string[]) {
  const id = uuid();
  await prisma.package.create({ data: { id, opportunityId, version: 1, destination: "https://portal.example/t/1", declarations: ["I declare the test"] } });
  for (const d of docs) {
    const v = await prisma.companyDocumentVersion.findUniqueOrThrow({ where: { id: d } });
    await prisma.packageItem.create({ data: { id: uuid(), packageId: id, documentVersionId: d, label: v.filename, sha256: v.sha256 } });
  }
  const locked = await service.lockPackage(id, founder);
  if (!locked.ok) throw new Error(locked.reason);
  return id;
}

async function approve(packageId: string) {
  const req = await service.requestApproval({ packageId, actionType: "submit_tender", userId: founder });
  if (!req.ok) throw new Error(req.reason);
  const dec = await service.decideApproval({ requestId: req.value, decision: "approved", userId: founder, stepUpAt: new Date() });
  if (!dec.ok) throw new Error(dec.reason);
  return (await prisma.approvalDecision.findUniqueOrThrow({ where: { requestId: req.value } })).id;
}

try {
  console.log("\n  Seed");
  check("52 organisations", await prisma.organisation.count({ where: { isResearchTarget: true } }), 52);
  check("ten sources, all off", await prisma.opportunitySource.count({ where: { enabled: false } }), 10);

  console.log("\n  Transitions");
  const opp = await newOpportunity("Discovered");
  check("agent validates", (await service.transitionOpportunity({ opportunityId: opp, to: "Validated", actor: "agent", userId: null })).ok, true);
  check("agent cannot archive", (await service.transitionOpportunity({ opportunityId: opp, to: "Archived", actor: "agent", userId: null })).ok, false);
  for (const to of ["Qualified", "EligibilityReview", "AwaitingBidDecision", "PreparingBid", "QualityReview", "AwaitingFinalApproval"]) {
    const r = await service.transitionOpportunity({ opportunityId: opp, to, actor: "founder", userId: founder });
    if (!r.ok) throw new Error(`${to}: ${r.reason}`);
  }
  check("walked to AwaitingFinalApproval", (await prisma.opportunity.findUniqueOrThrow({ where: { id: opp } })).status, "AwaitingFinalApproval");
  check("each move audited", await prisma.auditLog.count({ where: { entityId: opp, action: "opportunity.transition" } }), 7);
  check(
    "ApprovedForSubmission refused without approval",
    (await service.transitionOpportunity({ opportunityId: opp, to: "ApprovedForSubmission", actor: "founder", userId: founder })).ok,
    false
  );

  console.log("\n  Packages and approval");
  const d1 = await newDoc("response");
  const d2 = await newDoc("pricing");
  const pkg = await lockedPackage(opp, [d1, d2]);
  await rejects(
    "a locked package's items cannot be added",
    () => prisma.packageItem.create({ data: { id: uuid(), packageId: pkg, documentVersionId: d1, label: "dup", sha256: sha("x") } }),
    "cannot change"
  );
  await rejects(
    "a locked package's items cannot be removed",
    () => prisma.packageItem.deleteMany({ where: { packageId: pkg } }),
    "cannot change"
  );
  await rejects(
    "a stored file cannot be replaced",
    () => prisma.companyDocumentVersion.update({ where: { id: d1 }, data: { sha256: sha("other") } }),
    "cannot be replaced"
  );
  const decision = await approve(pkg);
  check("approval recorded with the package fingerprint", (await prisma.approvalDecision.findUniqueOrThrow({ where: { id: decision } })).manifestSha256, (await prisma.package.findUniqueOrThrow({ where: { id: pkg } })).manifestSha256);
  await rejects("a decision cannot be edited", () => prisma.approvalDecision.update({ where: { id: decision }, data: { note: "changed" } }), "cannot be changed");
  await rejects("a decision cannot be deleted", () => prisma.approvalDecision.delete({ where: { id: decision } }), "cannot be changed");
  check(
    "ApprovedForSubmission with the approval",
    (await service.transitionOpportunity({ opportunityId: opp, to: "ApprovedForSubmission", actor: "person", userId: founder })).ok,
    true
  );

  console.log("\n  Execution");
  const tooSoon = await service.startExecution({ decisionId: decision, mode: "manual", userId: founder });
  check("starting before Submitting is refused and does not use the approval", tooSoon.ok, false);
  check("Submitting",(await service.transitionOpportunity({ opportunityId: opp, to: "Submitting", actor: "founder", userId: founder })).ok, true);
  const exec = await service.startExecution({ decisionId: decision, mode: "manual", userId: founder });
  check("execution starts", exec.ok, true);
  check("the same approval cannot be used twice", (await service.startExecution({ decisionId: decision, mode: "manual", userId: founder })).ok, false);
  check("Submitted refused before a receipt", (await service.transitionOpportunity({ opportunityId: opp, to: "Submitted", actor: "founder", userId: founder })).ok, false);
  const execId = exec.ok ? exec.value : "";
  check(
    "confirmed refused without a receipt",
    (await service.recordExecutionOutcome({ executionId: execId, outcome: "confirmed", portalReference: "REF-1", userId: founder })).ok,
    false
  );
  const receiptDoc = await newDoc("receipt");
  check(
    "confirmed refused without a portal reference",
    (await service.recordExecutionOutcome({ executionId: execId, outcome: "confirmed", receiptVersionId: receiptDoc, userId: founder })).ok,
    false
  );
  check(
    "confirmed with receipt and reference",
    (await service.recordExecutionOutcome({ executionId: execId, outcome: "confirmed", portalReference: "REF-1", receiptVersionId: receiptDoc, userId: founder })).ok,
    true
  );
  check("Submitted after the receipt", (await service.transitionOpportunity({ opportunityId: opp, to: "Submitted", actor: "founder", userId: founder })).ok, true);
  const receipt = await prisma.receipt.findFirstOrThrow({ where: { executionId: execId } });
  await rejects("a receipt cannot be edited", () => prisma.receipt.update({ where: { id: receipt.id }, data: { note: "x" } }), "cannot be changed");

  console.log("\n  Duplicate submission");
  const revised = await service.revisePackage(pkg, founder);
  check("revise creates a new draft version", revised.ok, true);
  const v2 = revised.ok ? revised.value : "";
  check("new version is a draft", (await prisma.package.findUniqueOrThrow({ where: { id: v2 } })).status, "draft");
  check("lock v2", (await service.lockPackage(v2, founder)).ok, true);
  const decision2 = await approve(v2);
  const early = await service.startExecution({ decisionId: decision2, mode: "manual", userId: founder });
  check("cannot start a submission outside Submitting", early.ok ? "allowed" : early.reason, "Move the opportunity to Submitting before you start.");
  // Force the status back (as a stale page might) to reach the duplicate check itself.
  await prisma.opportunity.update({ where: { id: opp }, data: { status: "Submitting" } });
  const dup = await service.startExecution({ decisionId: decision2, mode: "manual", userId: founder });
  check("a second confirmed submission is refused", dup.ok ? "allowed" : dup.reason, "This has already been carried out for this opportunity.");

  console.log("\n  Changes after approval");
  const oppB = await newOpportunity("AwaitingFinalApproval");
  const pkgB = await lockedPackage(oppB, [await newDoc("b-response")]);
  const decisionB = await approve(pkgB);
  check("revise after approval", (await service.revisePackage(pkgB, founder)).ok, true);
  check("the old approval no longer opens the gate", (await service.transitionOpportunity({ opportunityId: oppB, to: "ApprovedForSubmission", actor: "founder", userId: founder })).ok, false);
  await prisma.opportunity.update({ where: { id: oppB }, data: { status: "Submitting" } });
  const stale = await service.startExecution({ decisionId: decisionB, mode: "manual", userId: founder });
  check("the old approval cannot be carried out", stale.ok ? "allowed" : stale.reason, "The package is no longer the approved version.");

  console.log("\n  Expiry and deadlines");
  const oppC = await newOpportunity("AwaitingFinalApproval");
  await prisma.opportunity.update({ where: { id: oppC }, data: { deadlineAt: new Date(Date.now() - 60_000) } });
  const pkgC = await lockedPackage(oppC, [await newDoc("c-response")]);
  const late = await service.requestApproval({ packageId: pkgC, actionType: "submit_tender", userId: founder });
  check("no approval request after the deadline", late.ok ? "allowed" : late.reason, "The deadline has passed.");

  console.log("\n  Review fixes (PR 14)");
  // AI drafts are not evidence or receipts.
  const oppF = await newOpportunity("UnderEvaluation");
  const draftDoc = await newDoc("f-draft-award-letter", "ai_draft");
  const draftMove = await service.transitionOpportunity({ opportunityId: oppF, to: "Awarded", actor: "founder", userId: founder, evidenceVersionId: draftDoc });
  check("an AI draft cannot evidence an award", draftMove.ok ? "allowed" : draftMove.reason, "An AI draft is not evidence. Upload the document you received.");
  const realDoc = await newDoc("f-award-letter");
  check("a verified document can", (await service.transitionOpportunity({ opportunityId: oppF, to: "Awarded", actor: "founder", userId: founder, evidenceVersionId: realDoc })).ok, true);

  // An expired, undecided request is retired so a new one can be made.
  const oppG = await newOpportunity("AwaitingFinalApproval");
  const pkgG = await lockedPackage(oppG, [await newDoc("g-response")]);
  const firstReq = await service.requestApproval({ packageId: pkgG, actionType: "submit_tender", userId: founder });
  check("first request", firstReq.ok, true);
  const firstId = firstReq.ok ? firstReq.value : "";
  check("a second request while the first is live is refused", (await service.requestApproval({ packageId: pkgG, actionType: "submit_tender", userId: founder })).ok, false);
  await prisma.approvalRequest.update({ where: { id: firstId }, data: { expiresAt: new Date(Date.now() - 1000) } });
  check("after expiry a new request is accepted", (await service.requestApproval({ packageId: pkgG, actionType: "submit_tender", userId: founder })).ok, true);
  check("the lapsed request is marked expired", (await prisma.approvalRequest.findUniqueOrThrow({ where: { id: firstId } })).status, "expired");
  check("and that is audited", await prisma.auditLog.count({ where: { entityId: firstId, action: "approval.expired" } }), 1);

  // No new attempt while an earlier one is unclear.
  const oppH = await newOpportunity("Submitting");
  const pkgH = await lockedPackage(oppH, [await newDoc("h-response")]);
  const decH1 = await approve(pkgH);
  const execH1 = await service.startExecution({ decisionId: decH1, mode: "manual", userId: founder });
  check("first attempt starts", execH1.ok, true);
  const execH1Id = execH1.ok ? execH1.value : "";
  check("marked unclear", (await service.recordExecutionOutcome({ executionId: execH1Id, outcome: "ambiguous", userId: founder })).ok, true);
  const revH = await service.revisePackage(pkgH, founder);
  const pkgH2 = revH.ok ? revH.value : "";
  await service.lockPackage(pkgH2, founder);
  const decH2 = await approve(pkgH2);
  const retry = await service.startExecution({ decisionId: decH2, mode: "manual", userId: founder });
  check("a new approval cannot start while the first is unclear", retry.ok ? "allowed" : retry.reason, "An earlier attempt is still pending or unclear. Check the portal and record its outcome first.");
  const draftReceipt = await newDoc("h-draft-receipt", "ai_draft");
  check(
    "an AI draft cannot be the receipt",
    (await service.recordExecutionOutcome({ executionId: execH1Id, outcome: "confirmed", portalReference: "REF-H", receiptVersionId: draftReceipt, userId: founder })).ok,
    false
  );
  check("reconciled as rejected", (await service.recordExecutionOutcome({ executionId: execH1Id, outcome: "rejected", userId: founder })).ok, true);
  check("then a new attempt may start", (await service.startExecution({ decisionId: decH2, mode: "manual", userId: founder })).ok, true);

  console.log("\n  Database hardening (migration 20261115130000)");
  const oppJ = await newOpportunity("AwaitingFinalApproval");
  const docJ = await newDoc("j-response");
  const pkgJ = await lockedPackage(oppJ, [docJ]);
  await rejects("a locked package's destination cannot change", () => prisma.package.update({ where: { id: pkgJ }, data: { destination: "https://elsewhere.example" } }), "content cannot change");
  await rejects("a locked package's declarations cannot change", () => prisma.package.update({ where: { id: pkgJ }, data: { declarations: ["something else"] } }), "content cannot change");
  await rejects("a locked package cannot go back to draft", () => prisma.package.update({ where: { id: pkgJ }, data: { status: "draft" } }), "cannot move from locked to draft");
  await rejects("a locked package cannot be deleted", () => prisma.package.delete({ where: { id: pkgJ } }), "cannot be deleted");
  const draftJ = uuid();
  await prisma.package.create({ data: { id: draftJ, opportunityId: oppJ, version: 2, destination: "https://portal.example/t/1" } });
  const itemJ = await prisma.packageItem.findFirstOrThrow({ where: { packageId: pkgJ } });
  await rejects("an item cannot be moved out of a locked package", () => prisma.packageItem.update({ where: { id: itemJ.id }, data: { packageId: draftJ } }), "cannot change");
  await rejects(
    "an item's hash must match its document version",
    () => prisma.packageItem.create({ data: { id: uuid(), packageId: draftJ, documentVersionId: docJ, label: "forged", sha256: sha("not the file") } }),
    "must match its document version"
  );
  await rejects("a stored version's scan result cannot be rewritten", () => prisma.companyDocumentVersion.update({ where: { id: docJ }, data: { scan: { clean: true } } }), "cannot be replaced or edited");
  check(
    "a stored version's status can still change",
    (await prisma.companyDocumentVersion.update({ where: { id: docJ }, data: { status: "founder_approved" } })).status,
    "founder_approved"
  );
  await rejects("an unknown status is refused by the database", () => prisma.opportunity.update({ where: { id: oppJ }, data: { status: "Won" } }), "Opportunity_status_check");
  check("a draft package can still be deleted", (await prisma.package.delete({ where: { id: draftJ } })).id, draftJ);

  console.log("\n  Recording an outcome twice at once");
  const oppK = await newOpportunity("Submitting");
  const pkgK = await lockedPackage(oppK, [await newDoc("k-response")]);
  const execK = await service.startExecution({ decisionId: await approve(pkgK), mode: "manual", userId: founder });
  const execKId = execK.ok ? execK.value : "";
  const receiptK = await newDoc("k-receipt");
  const both = await Promise.all([
    service.recordExecutionOutcome({ executionId: execKId, outcome: "confirmed", portalReference: "REF-K1", receiptVersionId: receiptK, userId: founder }),
    service.recordExecutionOutcome({ executionId: execKId, outcome: "confirmed", portalReference: "REF-K2", receiptVersionId: receiptK, userId: founder }),
  ]);
  check("exactly one outcome is recorded", both.filter((r) => r.ok).length, 1);
  check("and one receipt is stored", await prisma.receipt.count({ where: { executionId: execKId } }), 1);

  console.log("\n  One unresolved attempt per action (database)");
  const oppL = await newOpportunity("Submitting");
  const pkgL = await lockedPackage(oppL, [await newDoc("l-response")]);
  const decL = await approve(pkgL);
  check("first attempt starts", (await service.startExecution({ decisionId: decL, mode: "manual", userId: founder })).ok, true);
  const revL = await service.revisePackage(pkgL, founder);
  const pkgL2 = revL.ok ? revL.value : "";
  await service.lockPackage(pkgL2, founder);
  const decL2 = await approve(pkgL2);
  await rejects(
    "the database refuses a second unresolved attempt even if the app check is skipped",
    () =>
      prisma.executionRecord.create({
        data: { id: uuid(), approvalDecisionId: decL2, opportunityId: oppL, actionType: "submit_tender", mode: "manual", submittedManifestSha256: sha("x") },
      }),
    "Unique constraint"
  );

  console.log("\n  Partnership resubmission after remediation");
  const oppM = uuid();
  await prisma.opportunity.create({ data: { id: oppM, kind: "partnership", status: "AwaitingFinalApproval", title: "Partner M", origin: "manual" } });
  const pkgM = await lockedPackage(oppM, [await newDoc("m-application")]);
  const reqM = await service.requestApproval({ packageId: pkgM, actionType: "submit_application", userId: founder });
  const reqMId = reqM.ok ? reqM.value : "";
  await service.decideApproval({ requestId: reqMId, decision: "approved", userId: founder, stepUpAt: new Date() });
  const decM = (await prisma.approvalDecision.findUniqueOrThrow({ where: { requestId: reqMId } })).id;
  const execM = await service.startExecution({ decisionId: decM, mode: "manual", userId: founder });
  await service.recordExecutionOutcome({ executionId: execM.ok ? execM.value : "", outcome: "confirmed", portalReference: "APP-1", receiptVersionId: await newDoc("m-receipt"), userId: founder });
  check("first application submitted", (await service.transitionOpportunity({ opportunityId: oppM, to: "ApplicationSubmitted", actor: "founder", userId: founder })).ok, true);
  for (const to of ["UnderReview", "Rejected", "RemediationReview"]) {
    await service.transitionOpportunity({ opportunityId: oppM, to, actor: "founder", userId: founder });
  }
  // Fast-forward the remediation to a fresh final approval (a new round).
  await new Promise((r) => setTimeout(r, 5));
  await prisma.opportunity.update({ where: { id: oppM }, data: { status: "AwaitingFinalApproval", statusChangedAt: new Date() } });
  check(
    "the old confirmation does not reopen ApplicationSubmitted",
    (await service.transitionOpportunity({ opportunityId: oppM, to: "ApplicationSubmitted", actor: "founder", userId: founder })).ok,
    false
  );
  const revM = await service.revisePackage(pkgM, founder);
  const pkgM2 = revM.ok ? revM.value : "";
  await service.lockPackage(pkgM2, founder);
  const reqM2 = await service.requestApproval({ packageId: pkgM2, actionType: "submit_application", userId: founder });
  const reqM2Id = reqM2.ok ? reqM2.value : "";
  await service.decideApproval({ requestId: reqM2Id, decision: "approved", userId: founder, stepUpAt: new Date() });
  const decM2 = (await prisma.approvalDecision.findUniqueOrThrow({ where: { requestId: reqM2Id } })).id;
  const execM2 = await service.startExecution({ decisionId: decM2, mode: "manual", userId: founder });
  check("a remediated application can be submitted again", execM2.ok, true);
  await service.recordExecutionOutcome({ executionId: execM2.ok ? execM2.value : "", outcome: "confirmed", portalReference: "APP-2", receiptVersionId: await newDoc("m-receipt-2"), userId: founder });
  check("and moves to ApplicationSubmitted on its own receipt", (await service.transitionOpportunity({ opportunityId: oppM, to: "ApplicationSubmitted", actor: "founder", userId: founder })).ok, true);

  console.log("\n  Concurrency");
  // Two moves from the same status at once. Depending on timing both may be
  // legal one after the other (Discovered→Validated→Archived), so the check is
  // the invariant itself: one unbroken audit chain ending at the stored status.
  const oppD = await newOpportunity("Discovered");
  await Promise.all([
    service.transitionOpportunity({ opportunityId: oppD, to: "Validated", actor: "person", userId: founder }),
    service.transitionOpportunity({ opportunityId: oppD, to: "Archived", actor: "person", userId: founder }),
  ]);
  // Walk the chain by from/to rather than by timestamp: rows written in the
  // same millisecond have no reliable order.
  const trail = await prisma.auditLog.findMany({ where: { entityId: oppD, action: "opportunity.transition" } });
  const steps = trail.map((t) => t.metadata as { from: string; to: string });
  const final = (await prisma.opportunity.findUniqueOrThrow({ where: { id: oppD } })).status;
  let at = "Discovered";
  const remaining = [...steps];
  while (remaining.length) {
    const next = remaining.findIndex((s) => s.from === at);
    if (next < 0) break;
    at = remaining.splice(next, 1)[0].to;
  }
  check("racing moves leave one unbroken history", remaining.length === 0 && at === final, true);
  // Same target from two writers: the compare-and-set must let exactly one through.
  const oppE = await newOpportunity("Discovered");
  const raced = await Promise.all(
    [1, 2, 3].map(() => service.transitionOpportunity({ opportunityId: oppE, to: "Validated", actor: "person", userId: founder }))
  );
  check("three identical racing moves: exactly one wins", raced.filter((r) => r.ok).length, 1);
  check("and only one is recorded", await prisma.auditLog.count({ where: { entityId: oppE, action: "opportunity.transition" } }), 1);
} finally {
  await prisma.$disconnect();
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
