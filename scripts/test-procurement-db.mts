/**
 * The procurement rules against a real Postgres: transitions, package locking,
 * approval binding, single use, duplicate prevention and the immutability
 * triggers.
 *
 * Runs ONLY against a throwaway local database, never Supabase:
 *   1. start Postgres locally (for example docker run … postgres:17-alpine)
 *   2. apply scripts/fixtures/procurement/stub-schema.sql, then the four
 *      procurement migrations in order (foundation, organisations, hardening,
 *      partnerships)
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
const ingest = await import("../lib/procurement/ingest");
const fx = await import("./fixtures/procurement/ocds");
const agentApi = await import("../lib/procurement/agent-api");
const partnerships = await import("../lib/procurement/partnership-service");
const tender = await import("../lib/procurement/tender-service");

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
  // Phase 4: final approval needs the tender's requirements recorded.
  await prisma.tenderRequirement.create({ data: { id: uuid(), opportunityId: opp, text: "Submit through the buyer's portal", kind: "information" } });
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

  console.log("\n  Confirming and starting at the same moment");
  // While the first attempt is being confirmed, a second approval tries to
  // start. The opportunity lock makes one wait for the other, so the start
  // sees the confirmation and is refused: never two confirmed submissions.
  const oppN = await newOpportunity("Submitting");
  const pkgN = await lockedPackage(oppN, [await newDoc("n-response")]);
  const execN = await service.startExecution({ decisionId: await approve(pkgN), mode: "manual", userId: founder });
  const execNId = execN.ok ? execN.value : "";
  const revN = await service.revisePackage(pkgN, founder);
  const pkgN2 = revN.ok ? revN.value : "";
  await service.lockPackage(pkgN2, founder);
  const decN2 = await approve(pkgN2);
  const receiptN = await newDoc("n-receipt");
  const [confirmN, startN] = await Promise.all([
    service.recordExecutionOutcome({ executionId: execNId, outcome: "confirmed", portalReference: "REF-N", receiptVersionId: receiptN, userId: founder }),
    service.startExecution({ decisionId: decN2, mode: "manual", userId: founder }),
  ]);
  check("the confirmation is recorded", confirmN.ok, true);
  check("the racing second start is refused", startN.ok, false);
  check("one confirmed submission in total", await prisma.executionRecord.count({ where: { opportunityId: oppN, outcome: "confirmed" } }), 1);
  check("and no second attempt left behind", await prisma.executionRecord.count({ where: { opportunityId: oppN } }), 1);

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
  // At least one move must have happened, or a fully failed path would pass.
  check("racing moves leave one unbroken history", steps.length >= 1 && remaining.length === 0 && at === final, true);
  // Same target from two writers: the compare-and-set must let exactly one through.
  const oppE = await newOpportunity("Discovered");
  const raced = await Promise.all(
    [1, 2, 3].map(() => service.transitionOpportunity({ opportunityId: oppE, to: "Validated", actor: "person", userId: founder }))
  );
  check("three identical racing moves: exactly one wins", raced.filter((r) => r.ok).length, 1);
  check("and only one is recorded", await prisma.auditLog.count({ where: { entityId: oppE, action: "opportunity.transition" } }), 1);
  console.log("\n  Official feed ingestion (fake feeds, Phase 2)");
  const FTS = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";
  const calls: string[] = [];
  const s2wStatus: number = 503;
  const fakeFetch = async (url: string) => {
    calls.push(url);
    await new Promise((r) => setTimeout(r, 150));
    if (url.startsWith(FTS)) {
      if (url.includes("cursor=")) return { status: 200, retryAfter: null, body: { releases: [fx.ftsKeywordOnly] } };
      return {
        status: 200,
        retryAfter: null,
        body: {
          releases: [fx.ftsItSupport, fx.ftsTraining, fx.awardOnly],
          links: { next: `${FTS}?stages=tender&limit=100&updatedFrom=2026-11-16T00:00:00&updatedTo=2026-11-18T10:00:00&cursor=abc` },
        },
      };
    }
    if (url.startsWith("https://api.publiccontractsscotland.gov.uk/")) {
      return { status: 200, retryAfter: null, body: { releases: [fx.pcsCopyOfItSupport, fx.pcsCyber] } };
    }
    if (url.startsWith("https://api.sell2wales.gov.wales/")) return { status: s2wStatus, retryAfter: "120", body: s2wStatus === 200 ? { releases: [] } : null };
    throw new Error(`unexpected url ${url}`);
  };
  const morning = new Date("2026-11-18T06:00:00Z");

  const off = await ingest.runSource("fts", { trigger: "cron", fetchJson: fakeFetch, now: morning });
  check("a switched-off source is skipped by the cron", [off.status, calls.length], ["skipped", 0]);

  await prisma.opportunitySource.updateMany({ where: { key: { in: ["fts", "pcs", "s2w"] } }, data: { enabled: true } });
  const fts1 = await ingest.runSource("fts", { trigger: "cron", fetchJson: fakeFetch, now: morning });
  check("both pages read through the cursor", [fts1.status, fts1.fetched, calls.length], ["succeeded", 4, 2]);
  check("only IT tenders kept (support + Wi-Fi/cabling), award and training skipped", [fts1.relevant, fts1.created], [2, 2]);
  check("buyer contact stored once", fts1.contacts, 1);
  const ftsSource = await prisma.opportunitySource.findUniqueOrThrow({ where: { key: "fts" } });
  check("next window starts at the chain's updatedTo", ftsSource.lastSuccessAt?.toISOString(), "2026-11-18T10:00:00.000Z");
  check("no cursor left over", ftsSource.cursor, null);
  check("health ok", ftsSource.health, "ok");
  const itSupport = await prisma.opportunity.findFirstOrThrow({ where: { ocid: "ocds-h6vhtk-0aaaa1" }, include: { Buyer: true, Evidence: true } });
  check("opportunity is a confirmed tender in Discovered", [itSupport.kind, itSupport.status, itSupport.confirmedBuying, itSupport.origin], ["tender", "Discovered", true, "fts"]);
  check("buyer organisation created and marked as a buyer", [itSupport.Buyer?.name, itSupport.Buyer?.categories], ["Example County Council", ["buyer"]]);
  check("evidence links to the notice", itSupport.Evidence[0]?.url, "https://www.find-tender.service.gov.uk/Notice/100001-2026");
  const storedRaw = await prisma.procurementNotice.findFirstOrThrow({ where: { ocid: "ocds-h6vhtk-0aaaa1" } });
  const rawText = JSON.stringify(storedRaw.raw);
  check("stored raw notice has no contact name, email or phone", [rawText.includes("Pat Example"), rawText.includes("@"), rawText.includes("0000 000000")], [false, false, false]);

  calls.length = 0;
  const fts2 = await ingest.runSource("fts", { trigger: "cron", fetchJson: fakeFetch, now: morning });
  check("re-reading the same notices creates nothing", [fts2.created, fts2.updated, fts2.contacts], [0, 0, 0]);

  const pcs = await ingest.runSource("pcs", { trigger: "cron", fetchJson: fakeFetch, now: morning });
  check("PCS copy of the same tender is merged, the cyber tender is new", [pcs.merged, pcs.created], [1, 1]);
  check("the merged tender now has evidence from both portals", await prisma.opportunityEvidence.count({ where: { opportunityId: itSupport.id } }), 2);
  check("opportunities from the feeds so far", await prisma.opportunity.count({ where: { origin: { in: ["fts", "pcs"] } } }), 3);
  check("health board created as a buyer with its contact", await prisma.contact.count({ where: { Organisation: { name: "Example Health Board" } } }), 1);

  const s2w = await ingest.runSource("s2w", { trigger: "cron", fetchJson: fakeFetch, now: morning });
  check("an unavailable feed is recorded as retry, not a crash", [s2w.status, s2w.detail?.includes("503")], ["retry", true]);
  const s2wSource = await prisma.opportunitySource.findUniqueOrThrow({ where: { key: "s2w" } });
  check("and its health shows degraded", s2wSource.health, "degraded");
  const s2wRun = await prisma.ingestionRun.findFirstOrThrow({ where: { sourceKey: "s2w" }, orderBy: { startedAt: "desc" } });
  check("the run is kept with its error", [s2wRun.status, s2wRun.errorClass], ["retry", "unavailable"]);

  const [a1, a2] = await Promise.all([
    ingest.runSource("pcs", { trigger: "manual", fetchJson: fakeFetch, now: morning }),
    ingest.runSource("pcs", { trigger: "manual", fetchJson: fakeFetch, now: morning }),
  ]);
  check("two runs of one source at once: one is turned away", [a1.status, a2.status].sort(), ["skipped", "succeeded"]);
  check("every completed run is audited (5)", await prisma.auditLog.count({ where: { action: "procurement.sync" } }), 5);

  console.log("\n  Agent access: organisations and roles only (D4)");
  const listed = await agentApi.listOpportunitiesForAgents({ after: null, kind: null, status: null, limit: 200 });
  const wire = JSON.stringify(listed);
  check("agents see the feed opportunities", listed.opportunities.some((o) => o.title === "Managed IT Support Services"), true);
  check("no email address reaches an agent", /@/.test(wire), false);
  check("no contact name reaches an agent", wire.includes("Pat Example"), false);
  check("no notice description reaches an agent", wire.includes("Synthetic notice"), false);
  check("contacts exist in the admin all the same", (await prisma.contact.count({ where: { organisationId: { not: null } } })) >= 2, true);
  const orgs = await agentApi.listOrganisationsForAgents("buyer");
  check("agents see buyer organisations by name", orgs.organisations.some((o) => o.name === "Example Health Board"), true);
  check("and no organisation notes or contacts", JSON.stringify(orgs).includes("Created from an official tender notice") || /@/.test(JSON.stringify(orgs)), false);

  const research = agentApi.researchSchema.parse({
    idempotencyKey: "agent-test-0001",
    kind: "commercial",
    title: "Example Retail Ltd opening three Cardiff stores",
    organisation: "Example Retail Ltd",
    evidenceUrl: "https://example.com/retail-news",
    source: { agent: "CCO", issueId: "CYV-99" },
  });
  const first = await agentApi.recordAgentResearch(research);
  check("agent research lands as a new opportunity", first.created, true);
  const landed = await prisma.opportunity.findUniqueOrThrow({ where: { id: first.id }, include: { Buyer: true } });
  check("in Discovered, marked as from Paperclip", [landed.status, landed.origin, landed.paperclipIssueId], ["Discovered", "paperclip", "CYV-99"]);
  check("retrying with the same key returns the original", await agentApi.recordAgentResearch(research), { id: first.id, created: false });
  check(
    "research with an email address is refused before it reaches the database",
    agentApi.researchSchema.safeParse({ ...research, idempotencyKey: "agent-test-0002", title: "Call jo@example.com about IT" }).success,
    false
  );
  check(
    "research citing a LinkedIn profile is refused",
    agentApi.researchSchema.safeParse({ ...research, idempotencyKey: "agent-test-0003", evidenceUrl: "https://www.linkedin.com/in/someone" }).success,
    false
  );
  check("an agent may validate", (await agentApi.agentMove(first.id, "Validated", "CCO")).ok, true);
  check("an agent may not archive or skip ahead", [(await agentApi.agentMove(first.id, "Archived", "CCO")).ok, (await agentApi.agentMove(first.id, "Submitted", "CCO")).ok], [false, false]);
  check("an agent name holding an email is refused", (await agentApi.agentMove(first.id, "Qualified", "cco@example.com")).ok, false);

  console.log("\n  Review fixes (PR 15)");
  // Two different notices from the same portal with the same buyer, title and deadline stay separate.
  const sameTitleOther = fx.release({ ocid: "ocds-h6vhtk-0bbbb1", id: "100010-2026", title: "Managed IT Support Services", cpv: "72253000", amount: 250000 });
  const unreadable = fx.release({ ocid: "ocds-h6vhtk-0bbbb2", id: "100011-2026", title: "", cpv: "72253000" });
  const ftsBefore = await prisma.opportunitySource.findUniqueOrThrow({ where: { key: "fts" } });
  const fetch2 = async (url: string) => ({ status: 200, retryAfter: null, body: { releases: url.startsWith(FTS) ? [sameTitleOther, unreadable] : [] } });
  const fts3 = await ingest.runSource("fts", { trigger: "manual", fetchJson: fetch2, now: morning });
  check("a same-portal notice with the same title is a new opportunity, not merged", [fts3.created, fts3.merged], [1, 0]);
  check("an unreadable relevant notice is recorded on the run", fts3.detail?.includes("unreadable notice"), true);
  const ftsAfter = await prisma.opportunitySource.findUniqueOrThrow({ where: { key: "fts" } });
  check("and the checkpoint is not advanced, so it is read again", [ftsAfter.lastSuccessAt?.toISOString(), ftsAfter.health], [ftsBefore.lastSuccessAt?.toISOString(), "degraded"]);

  // A switched-off feed cannot be run by hand either.
  await prisma.opportunitySource.update({ where: { key: "s2w" }, data: { enabled: false } });
  calls.length = 0;
  const offManual = await ingest.runSource("s2w", { trigger: "manual", fetchJson: fakeFetch, now: morning });
  check("Run now on a switched-off feed reads nothing", [offManual.status, calls.length], ["skipped", 0]);

  // Paging never skips rows that share a timestamp.
  const tied = await prisma.opportunity.findMany({ where: { origin: { in: ["fts", "pcs"] } }, select: { id: true }, take: 3 });
  const stamp = new Date("2026-11-18T09:00:00.000Z");
  await prisma.$executeRaw`UPDATE "public"."Opportunity" SET "updatedAt" = ${stamp} WHERE "id" = ANY(${tied.map((t) => t.id)})`;
  const seen = new Set<string>();
  let cursor: string | null = `${new Date(stamp.getTime() - 1).toISOString()}`;
  for (let page = 0; page < 6 && cursor; page++) {
    const r = await agentApi.listOpportunitiesForAgents({ after: agentApi.parseCursor(cursor, null), kind: null, status: null, limit: 1 });
    r.opportunities.forEach((o) => seen.add(o.id));
    cursor = r.more ? r.next : null;
  }
  check("three rows with one timestamp, paged one at a time: none skipped", tied.every((t) => seen.has(t.id)), true);
  const everything = await prisma.opportunity.count();
  check("a full last page says there is no more", (await agentApi.listOpportunitiesForAgents({ after: null, kind: null, status: null, limit: everything })).more, false);
  check("an empty page keeps the caller's position", (await agentApi.listOpportunitiesForAgents({ after: { at: new Date("2099-01-01T00:00:00Z"), id: null }, kind: null, status: null, limit: 5 })).next, "2099-01-01T00:00:00.000Z");

  // CYVRIX clients are not listed to agents.
  await prisma.$executeRaw`INSERT INTO "public"."ClientCompany" (id, name) VALUES ('client-1', 'Example Client Ltd')`;
  await prisma.organisation.create({ data: { id: uuid(), name: "Example Client Ltd", categories: ["buyer"], clientCompanyId: "client-1" } });
  check("a client organisation is not listed to agents", (await agentApi.listOrganisationsForAgents(null)).organisations.some((o) => o.name === "Example Client Ltd"), false);

  // Titles from the pasted ChatGPT report are withheld.
  const reportLead = uuid();
  await prisma.opportunity.create({ data: { id: reportLead, kind: "commercial", status: "Discovered", title: "Jo Bloggs at Example Ltd is hiring", origin: "chatgpt_task" } });
  const listedAgain = await agentApi.listOpportunitiesForAgents({ after: null, kind: null, status: null, limit: 200 });
  check("a ChatGPT report title never reaches an agent", JSON.stringify(listedAgain).includes("Jo Bloggs"), false);

  // ------------------------------------------------------------ Phase 3
  console.log("\n  Supplier portals and accounts");
  check("six portals seeded", await prisma.supplierPortal.count(), 6);
  const dsp = await prisma.supplierPortal.findFirstOrThrow({ where: { url: "https://contracts.mod.uk/" } });
  const s2wPortal = await prisma.supplierPortal.findFirstOrThrow({ where: { name: "Sell2Wales" } });
  check("only the Defence Sourcing Portal is seeded as free", (await prisma.supplierPortal.findMany({ where: { cost: "free" } })).map((p) => p.name), ["Defence Sourcing Portal"]);
  check("no portal starts with a standing policy", await prisma.supplierPortal.count({ where: { standingPolicy: true } }), 0);
  await rejects(
    "the database refuses a standing policy on a portal not known to be free",
    () => prisma.supplierPortal.update({ where: { id: s2wPortal.id }, data: { standingPolicy: true } }),
    "SupplierPortal_policy_needs_free"
  );
  check("the service refuses it too", (await partnerships.setStandingPolicy(s2wPortal.id, true, founder, new Date())).ok, false);

  check(
    "a password typed as the credential label is refused",
    (await partnerships.saveAccount({ portalId: s2wPortal.id, status: "active", credentialLabel: "Sell2Wales: Xk9#mPq2$vLw8!", userId: founder })).ok,
    false
  );
  const s2wAccount = await partnerships.saveAccount({ portalId: s2wPortal.id, status: "active", credentialLabel: "1Password: Cyvrix / Sell2Wales", userId: founder });
  check("an account with a password-manager label saves", s2wAccount.ok, true);
  const second = await partnerships.saveAccount({ portalId: s2wPortal.id, status: "pending", userId: founder });
  check("a second live account on one portal is refused", second.ok ? "saved" : second.reason.includes("already has an account"), true);
  check("a 'not registered' row beside it is allowed", (await partnerships.saveAccount({ portalId: s2wPortal.id, status: "not_registered", userId: founder })).ok, true);
  check(
    "account audit does not copy the credential label",
    JSON.stringify(await prisma.auditLog.findMany({ where: { entityType: "SupplierAccount" } })).includes("1Password"),
    false
  );

  console.log("\n  Standing registration policy (D13)");
  const policyAt = new Date("2026-11-18T10:00:00.000Z");
  check("policy switched on for the free portal", (await partnerships.setStandingPolicy(dsp.id, true, founder, policyAt)).ok, true);
  async function registrationPackage(destination: string, declarations: string[]) {
    const oppId = await newOpportunity("Discovered");
    const id = uuid();
    await prisma.package.create({ data: { id, opportunityId: oppId, version: 1, destination, declarations } });
    const doc = await newDoc(`registration ${id.slice(0, 6)}`);
    const v = await prisma.companyDocumentVersion.findUniqueOrThrow({ where: { id: doc } });
    await prisma.packageItem.create({ data: { id: uuid(), packageId: id, documentVersionId: doc, label: v.filename, sha256: v.sha256 } });
    const locked = await service.lockPackage(id, founder);
    if (!locked.ok) throw new Error(locked.reason);
    return id;
  }
  const plainReg = await registrationPackage("https://contracts.mod.uk/", []);
  const auto = await service.requestApproval({ packageId: plainReg, actionType: "register_account", userId: founder });
  const autoReq = auto.ok ? await prisma.approvalRequest.findUniqueOrThrow({ where: { id: auto.value } }) : null;
  check("a plain registration on that portal is approved by the policy", autoReq?.status, "approved");
  const autoDecision = auto.ok ? await prisma.approvalDecision.findUnique({ where: { requestId: auto.value } }) : null;
  check("the decision carries the founder and the moment the policy was set", [autoDecision?.decidedById, autoDecision?.stepUpAt?.toISOString()], [founder, policyAt.toISOString()]);
  check("the policy approval is audited", await prisma.auditLog.count({ where: { action: "approval.policy_approved", entityId: auto.ok ? auto.value : "" } }), 1);

  const declaringReg = await registrationPackage("https://contracts.mod.uk/", ["We accept the portal user agreement"]);
  const manual = await service.requestApproval({ packageId: declaringReg, actionType: "register_account", userId: founder });
  check("a registration that makes a declaration waits for the founder", manual.ok ? (await prisma.approvalRequest.findUniqueOrThrow({ where: { id: manual.value } })).status : "failed", "pending");
  const unknownCost = await registrationPackage("https://www.sell2wales.gov.wales/", []);
  const notFree = await service.requestApproval({ packageId: unknownCost, actionType: "register_account", userId: founder });
  check("a portal whose cost is unknown waits for the founder", notFree.ok ? (await prisma.approvalRequest.findUniqueOrThrow({ where: { id: notFree.value } })).status : "failed", "pending");

  console.log("\n  Confirmed registration becomes the account");
  const regExec = await service.startExecution({ decisionId: autoDecision?.id ?? "", mode: "manual", userId: founder });
  check("the founder starts the registration by hand", regExec.ok ? true : regExec.reason, true);
  const regReceipt = await newDoc("dsp confirmation email");
  check(
    "registration confirmed with the portal's reference",
    (await service.recordExecutionOutcome({ executionId: regExec.ok ? regExec.value : "", outcome: "confirmed", portalReference: "DSP-SUP-123", receiptVersionId: regReceipt, userId: founder })).ok,
    true
  );
  const dspAccounts = await prisma.supplierAccount.findMany({ where: { portalId: dsp.id } });
  check("one pending account with that reference", dspAccounts.map((a) => [a.status, a.accountRef, a.approvalDecisionId]), [["pending", "DSP-SUP-123", autoDecision?.id]]);
  check("adding another live account on that portal is refused", (await partnerships.saveAccount({ portalId: dsp.id, status: "active", userId: founder })).ok, false);
  check("switching the policy off clears its authority", (await partnerships.setStandingPolicy(dsp.id, false, founder, new Date())).ok, true);
  check("policy fields cleared", await prisma.supplierPortal.findUniqueOrThrow({ where: { id: dsp.id }, select: { standingPolicy: true, standingPolicyById: true } }), { standingPolicy: false, standingPolicyById: null });

  console.log("\n  Programmes and assessments");
  const vendor = await prisma.organisation.findFirstOrThrow({ where: { isResearchTarget: true } });
  await rejects(
    "a programme cannot be marked verified without a source",
    () => prisma.partnershipProgramme.create({ data: { id: uuid(), organisationId: vendor.id, name: "Unsourced programme", verified: true } }),
    "PartnershipProgramme_verified_needs_source"
  );
  const tenderOpp = await newOpportunity("Discovered");
  const bidScores = { technical_capability: 2, mandatory_eligibility: 4, profitability: 4, delivery_capacity: 4, cash_flow_impact: 3, security_and_compliance: 4, strategic_value: 4 };
  const assessed = await partnerships.recordAssessment({ opportunityId: tenderOpp, model: "bid", scores: bidScores, disqualifiers: [], authorId: founder });
  check("a bid assessment is recorded with its total", assessed.ok ? [assessed.value.total, assessed.value.recommendation] : assessed.reason, [70, "pursue"]);
  check("partnership scoring is refused on a tender", (await partnerships.recordAssessment({ opportunityId: tenderOpp, model: "partnership", scores: {}, disqualifiers: [], authorId: founder })).ok, false);
  const dq = await partnerships.recordAssessment({ opportunityId: tenderOpp, model: "bid", scores: bidScores, disqualifiers: ["Needs ISO 27001 certificate", " "], authorId: founder });
  check("a disqualifier overrides the score", dq.ok ? dq.value.recommendation : dq.reason, "disqualified");
  check("blank disqualifier lines are dropped", dq.ok ? (await prisma.bidAssessment.findUniqueOrThrow({ where: { id: dq.value.id } })).disqualifiers : null, ["Needs ISO 27001 certificate"]);
  const firstAssessment = assessed.ok ? assessed.value.id : "";
  await rejects("an assessment cannot be edited", () => prisma.bidAssessment.update({ where: { id: firstAssessment }, data: { assumptions: "changed" } }), "cannot be changed");
  await rejects("an assessment cannot be deleted", () => prisma.bidAssessment.delete({ where: { id: firstAssessment } }), "cannot be changed");

  // ------------------------------------------------------------ Phase 4
  console.log("\n  Requirements gate");
  const bid = await newOpportunity("Discovered");
  for (const to of ["Validated", "Qualified", "EligibilityReview", "AwaitingBidDecision", "PreparingBid", "QualityReview"]) {
    const r = await service.transitionOpportunity({ opportunityId: bid, to, actor: "founder", userId: founder });
    if (!r.ok) throw new Error(`${to}: ${r.reason}`);
  }
  const toFinal = () => service.transitionOpportunity({ opportunityId: bid, to: "AwaitingFinalApproval", actor: "founder", userId: founder });
  const noReqs = await toFinal();
  check("final approval refused before any requirement is recorded", noReqs.ok ? "moved" : noReqs.reason.includes("Record the tender's requirements"), true);
  const iso = await tender.saveRequirement({ opportunityId: bid, ref: "SQ 4.1", text: "Hold Cyber Essentials", kind: "mandatory", status: "unknown", sourceDocumentId: null, location: null, evidenceVersionId: null, notes: null, userId: founder });
  check("a mandatory requirement is added", iso.ok, true);
  check("an unchecked mandatory requirement blocks final approval", (await toFinal()).ok, false);
  const reqId = iso.ok ? iso.value : "";
  const ceDraft = await newDoc("cyber essentials draft", "ai_draft");
  const withDraft = await tender.saveRequirement({ id: reqId, opportunityId: bid, ref: "SQ 4.1", text: "Hold Cyber Essentials", kind: "mandatory", status: "met", sourceDocumentId: null, location: null, evidenceVersionId: ceDraft, notes: null, userId: founder });
  check("an AI draft is not evidence that it is met", withDraft.ok, false);
  const noEvidence = await tender.saveRequirement({ id: reqId, opportunityId: bid, ref: "SQ 4.1", text: "Hold Cyber Essentials", kind: "mandatory", status: "met", sourceDocumentId: null, location: null, evidenceVersionId: null, notes: null, userId: founder });
  check("met without evidence is refused", noEvidence.ok, false);
  await rejects(
    "the database refuses a mandatory requirement met without evidence",
    () => prisma.tenderRequirement.update({ where: { id: reqId }, data: { status: "met" } }),
    "TenderRequirement_met_needs_evidence"
  );
  const certificate = await newDoc("cyber essentials certificate", "certified_evidence");
  check(
    "met with the certificate",
    (await tender.saveRequirement({ id: reqId, opportunityId: bid, ref: "SQ 4.1", text: "Hold Cyber Essentials", kind: "mandatory", status: "met", sourceDocumentId: null, location: "p.12", evidenceVersionId: certificate, notes: null, userId: founder })).ok,
    true
  );
  const sc = await tender.saveRequirement({ opportunityId: bid, ref: "SQ 4.2", text: "SC clearance for all engineers", kind: "mandatory", status: "not_met", sourceDocumentId: null, location: null, evidenceVersionId: null, notes: null, userId: founder });
  const scBlocked = await toFinal();
  check("an unmet mandatory requirement blocks final approval", scBlocked.ok ? "moved" : scBlocked.reason.includes("not met"), true);
  await tender.saveRequirement({ id: sc.ok ? sc.value : "", opportunityId: bid, ref: "SQ 4.2", text: "SC clearance for all engineers", kind: "mandatory", status: "not_applicable", sourceDocumentId: null, location: null, evidenceVersionId: null, notes: "Lot 2 only; we bid for Lot 1", userId: founder });
  check("with every mandatory requirement met or not applicable, it moves", (await toFinal()).ok, true);
  check("requirement changes are audited on the opportunity", await prisma.auditLog.count({ where: { entityId: bid, action: { in: ["requirement.added", "requirement.updated"] } } }), 4);
  check(
    "a requirement cannot be edited through another opportunity",
    (await tender.saveRequirement({ id: reqId, opportunityId: opp, ref: null, text: "Changed", kind: "information", status: "unknown", sourceDocumentId: null, location: null, evidenceVersionId: null, notes: null, userId: founder })).ok,
    false
  );

  console.log("\n  Deadlines");
  const dated = await newOpportunity("PreparingBid");
  const due = new Date("2026-12-01T12:00:00.000Z");
  check(
    "a question deadline after the submission deadline is refused",
    (await tender.setDeadlines({ opportunityId: dated, deadlineAt: due, clarificationDeadlineAt: new Date("2026-12-02T12:00:00Z"), userId: founder })).ok,
    false
  );
  check("dates set by a person", (await tender.setDeadlines({ opportunityId: dated, deadlineAt: due, clarificationDeadlineAt: new Date("2026-11-25T12:00:00Z"), userId: founder })).ok, true);
  check("both changes audited", await prisma.auditLog.count({ where: { entityId: dated, action: "opportunity.deadline_changed" } }), 2);
  check("saving the same dates again is refused as no change", (await tender.setDeadlines({ opportunityId: dated, deadlineAt: due, clarificationDeadlineAt: null, userId: founder })).ok, false);

  // A newer notice moves the deadline of a bid already being prepared.
  const docsRelease = fx.release({ ocid: "ocds-h6vhtk-0ddd01", id: "200001-2026", title: "Network refresh and IT support", cpv: "72253000", deadline: "2026-12-10T12:00:00Z" }) as Record<string, unknown> & { tender: Record<string, unknown> };
  docsRelease.tender.documents = [
    { url: "https://www.find-tender.service.gov.uk/Notice/Attachment/777", title: "Specification", documentType: "technicalSpecifications" },
    { url: "https://in-tendhost.co.uk/examplecouncil/aspx/Tenders", title: "Tender pack" },
  ];
  const once = async (releases: unknown[]) =>
    ingest.runSource("fts", { trigger: "manual", fetchJson: async (url: string) => ({ status: 200, retryAfter: null, body: { releases: url.startsWith(FTS) ? releases : [] } }), now: morning });
  await prisma.opportunitySource.update({ where: { key: "fts" }, data: { enabled: true } });
  await once([docsRelease]);
  const docsOpp = await prisma.opportunity.findFirstOrThrow({ where: { ocid: "ocds-h6vhtk-0ddd01" } });
  await prisma.opportunity.update({ where: { id: docsOpp.id }, data: { status: "PreparingBid" } });
  const extended = fx.release({ ocid: "ocds-h6vhtk-0ddd01", id: "200002-2026", title: "Network refresh and IT support (amended)", cpv: "72253000", deadline: "2026-12-17T12:00:00Z" });
  await once([extended]);
  const afterExtension = await prisma.opportunity.findUniqueOrThrow({ where: { id: docsOpp.id } });
  check("an extension reaches a bid in preparation", afterExtension.deadlineAt?.toISOString(), "2026-12-17T12:00:00.000Z");
  check("but its other facts are left as the team had them", afterExtension.title, "Network refresh and IT support");
  const changeLog = await prisma.auditLog.findFirst({ where: { entityId: docsOpp.id, action: "opportunity.deadline_changed" }, orderBy: { createdAt: "desc" } });
  check("the extension is audited with both dates", [(changeLog?.metadata as Record<string, unknown>)?.change, (changeLog?.metadata as Record<string, unknown>)?.by], ["extended", "notice"]);

  console.log("\n  Tender documents");
  const listedDocs = await tender.refreshNoticeDocuments(docsOpp.id, founder);
  check("the notice's documents are listed", listedDocs.ok ? listedDocs.value : listedDocs.reason, 2);
  check("listing again adds nothing", (await tender.refreshNoticeDocuments(docsOpp.id, founder)).ok ? (await prisma.tenderDocument.count({ where: { opportunityId: docsOpp.id } })) : -1, 2);
  check("a record with no notice cannot list documents", (await tender.refreshNoticeDocuments(dated, founder)).ok, false);
  const portalDoc = await prisma.tenderDocument.findFirstOrThrow({ where: { opportunityId: docsOpp.id, sourceUrl: { contains: "in-tendhost" } } });
  let networkCalls = 0;
  const noNetwork = async () => {
    networkCalls += 1;
    throw new Error("no network in tests");
  };
  const portalFetch = await tender.fetchTenderDocument(portalDoc.id, founder, noNetwork);
  check("a buyer portal link is refused without any request", [portalFetch.ok, networkCalls], [false, 0]);
  const refusedRow = await prisma.tenderDocument.findUniqueOrThrow({ where: { id: portalDoc.id } });
  check("the refusal and its reason are kept", [refusedRow.status, refusedRow.refusal?.includes("not an official notice service")], ["refused", true]);
  const specDoc = await prisma.tenderDocument.findFirstOrThrow({ where: { opportunityId: docsOpp.id, sourceUrl: { contains: "find-tender" } } });
  const notAPdf = async () => new Response(new TextEncoder().encode("<html>sign in</html>"), { status: 200 });
  const htmlFetch = await tender.fetchTenderDocument(specDoc.id, founder, notAPdf);
  check("a page that is not a document is not stored", [htmlFetch.ok, (await prisma.tenderDocument.findUniqueOrThrow({ where: { id: specDoc.id } })).status], [false, "refused"]);
  // A stored copy is the record of what the buyer published.
  await prisma.$executeRaw`UPDATE "public"."TenderDocument" SET "status" = 'stored', "storagePath" = 'tenders/x/y.pdf', "sha256" = ${sha("spec")}, "sizeBytes" = 10 WHERE "id" = ${specDoc.id}`;
  await rejects("a stored copy's hash cannot be changed", () => prisma.tenderDocument.update({ where: { id: specDoc.id }, data: { sha256: sha("other") } }), "cannot be changed");
  await rejects("a stored copy cannot be deleted", () => prisma.tenderDocument.delete({ where: { id: specDoc.id } }), "cannot be deleted");
  check("a stored copy is not fetched again", (await tender.fetchTenderDocument(specDoc.id, founder, noNetwork)).ok, false);

} finally {
  await prisma.$disconnect();
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
