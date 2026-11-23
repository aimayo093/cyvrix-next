/**
 * Phase 4 rules that need no network or database: deadline alerts, date
 * changes from newer notices, tender document links and the safe fetcher (with
 * a fake fetch), and the requirements checklist.
 * Run with: npm run test:procurement-tender
 */
import { complianceMatrixCsv, csvCell } from "../lib/procurement/compliance-matrix";
import { packageManifestText } from "../lib/procurement/package-manifest";
import { dateChange,deadlineAlerts, recordDateChanges, urgency } from "../lib/procurement/deadlines";
import { requirementProblem, requirementsGate, summarise } from "../lib/procurement/requirements";
import { fetchPublicDocument, fetchRefusal, MAX_FETCH_BYTES, noticeDocuments, safeFilename, withTypeExtension } from "../lib/procurement/tender-documents";

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

const now = new Date("2026-11-19T12:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

console.log("\n  Deadlines");
check("an hour ago is passed", urgency(new Date(now.getTime() - 3_600_000), now), "passed");
check("eight days ago is no longer shown", urgency(inDays(-8), now), null);
check("tomorrow is within 2 days", urgency(inDays(1), now), "within_2_days");
check("in 5 days is within 7", urgency(inDays(5), now), "within_7_days");
check("in 10 days is within 14", urgency(inDays(10), now), "within_14_days");
check("in 30 days is not shown", urgency(inDays(30), now), null);
const alerts = deadlineAlerts(
  [
    { id: "a", title: "Bid A", status: "PreparingBid", deadlineAt: inDays(5), clarificationDeadlineAt: inDays(1) },
    { id: "b", title: "Bid B", status: "Submitted", deadlineAt: inDays(1), clarificationDeadlineAt: null },
    { id: "c", title: "Lead C", status: "Discovered", deadlineAt: inDays(-1), clarificationDeadlineAt: inDays(3) },
  ],
  now
);
check("alerts soonest first; submitted records left out", alerts.map((a) => `${a.opportunityId}:${a.kind}:${a.urgency}`), [
  "c:submission:passed",
  "a:clarification:within_2_days",
  "a:submission:within_7_days",
]);
check("a question deadline after the submission deadline is ignored", alerts.some((a) => a.opportunityId === "c" && a.kind === "clarification"), false);

console.log("\n  Date changes from a newer notice");
check("a first date is set", dateChange(null, inDays(3)), "set");
check("a later date is an extension", dateChange(inDays(3), inDays(5)), "extended");
check("an earlier date is brought forward", dateChange(inDays(5), inDays(3)), "brought_forward");
check("the same date is no change", dateChange(inDays(3), inDays(3)), null);
check("a date left out is no change (never blanked)", dateChange(inDays(3), null), null);
check(
  "both dates recorded",
  recordDateChanges({ deadlineAt: inDays(5), clarificationDeadlineAt: null }, { deadlineAt: inDays(7), clarificationDeadlineAt: inDays(2) }).map((c) => `${c.field}:${c.change}`),
  ["deadlineAt:extended", "clarificationDeadlineAt:set"]
);

console.log("\n  Tender document links");
check("Find a Tender over HTTPS may be fetched", fetchRefusal("https://www.find-tender.service.gov.uk/Notice/Attachment/123"), null);
check("a buyer's e-tendering portal is listed, not fetched", fetchRefusal("https://in-tendhost.co.uk/council/aspx/Tenders")?.includes("not an official notice service"), true);
check("HTTP is not fetched", fetchRefusal("http://www.find-tender.service.gov.uk/x"), "Only HTTPS links are fetched.");
check("sign-in details in a link are refused", fetchRefusal("https://user:pw@www.find-tender.service.gov.uk/x"), "Links with sign-in details are not fetched.");
check("a look-alike host is refused", fetchRefusal("https://www.find-tender.service.gov.uk.evil.example/x") !== null, true);
check("a non-standard port is refused", fetchRefusal("https://www.sell2wales.gov.wales:8443/x") !== null, true);
check("an internal address is refused", fetchRefusal("https://169.254.169.254/latest/meta-data") !== null, true);
const listed = noticeDocuments([
  { tender: { documents: [
    { url: "https://www.find-tender.service.gov.uk/Notice/Attachment/1", title: "Specification", documentType: "technicalSpecifications", format: "application/pdf" },
    { url: "https://www.find-tender.service.gov.uk/Notice/Attachment/1", title: "Duplicate" },
    { url: "javascript:alert(1)", title: "Bad" },
    { url: "/relative/path", title: "Relative" },
    { url: "https://in-tendhost.co.uk/x", description: "Tender pack" },
  ] } },
  { tender: { documents: [{ url: "https://www.find-tender.service.gov.uk/Notice/Attachment/2" }] } },
  { tender: { documents: "not a list" } },
]);
check("documents listed once each, unsafe links dropped", listed.map((d) => [d.url, d.title]), [
  ["https://www.find-tender.service.gov.uk/Notice/Attachment/1", "Specification"],
  ["https://in-tendhost.co.uk/x", "Tender pack"],
  ["https://www.find-tender.service.gov.uk/Notice/Attachment/2", "Tender document"],
]);
check("filename from the header, made safe", safeFilename('attachment; filename="../../etc/pass wd?.pdf"', "https://x.example/a"), "_.._etc_pass wd_.pdf");
check("filename from the address when no header", safeFilename(null, "https://x.example/files/Spec%20v2.pdf"), "Spec v2.pdf");
check("an extensionless text attachment is named .txt", withTypeExtension("tender-document", "text/plain; charset=utf-8"), "tender-document.txt");
check("an extensionless PDF is named .pdf", withTypeExtension("Attachment", "application/pdf"), "Attachment.pdf");
check("a name with an extension is left alone", withTypeExtension("Spec v2.pdf", "text/plain"), "Spec v2.pdf");
check("an unknown type adds nothing", withTypeExtension("tender-document", "application/octet-stream"), "tender-document");

console.log("\n  Safe fetching (fake network)");
const ALLOWED = "https://www.find-tender.service.gov.uk/Notice/Attachment/1";
type Step = { status: number; location?: string; body?: Uint8Array; length?: string };
function fakeFetch(steps: Record<string, Step>) {
  const seen: string[] = [];
  const impl = async (url: string, init: RequestInit) => {
    seen.push(url);
    if (init.redirect !== "manual") throw new Error("redirects must be manual");
    const s = steps[url];
    if (!s) throw new Error(`unexpected fetch of ${url}`);
    const headers = new Headers();
    if (s.location) headers.set("location", s.location);
    if (s.length) headers.set("content-length", s.length);
    return new Response(s.body ? (s.body as Uint8Array<ArrayBuffer>) : null, { status: s.status, headers });
  };
  return { impl, seen };
}
const pdf = new TextEncoder().encode("%PDF-1.4 test");
{
  const f = fakeFetch({ [ALLOWED]: { status: 200, body: pdf } });
  const r = await fetchPublicDocument(ALLOWED, f.impl);
  check("an allowed document is fetched", r.ok ? r.buffer.length : r.reason, pdf.length);
}
{
  const f = fakeFetch({ [ALLOWED]: { status: 302, location: "https://attacker.example/x" } });
  const r = await fetchPublicDocument(ALLOWED, f.impl);
  check("a redirect off the list is refused before it is followed", [r.ok, f.seen.length], [false, 1]);
}
{
  const f = fakeFetch({ [ALLOWED]: { status: 302, location: "/Notice/Attachment/9" }, "https://www.find-tender.service.gov.uk/Notice/Attachment/9": { status: 200, body: pdf } });
  const r = await fetchPublicDocument(ALLOWED, f.impl);
  check("a relative redirect on the same host is followed", r.ok ? r.finalUrl : r.reason, "https://www.find-tender.service.gov.uk/Notice/Attachment/9");
}
{
  const loop: Record<string, Step> = { [ALLOWED]: { status: 302, location: ALLOWED } };
  const r = await fetchPublicDocument(ALLOWED, fakeFetch(loop).impl);
  check("a redirect loop stops", r.ok ? "fetched" : r.reason, "The link redirects too many times.");
}
{
  const r = await fetchPublicDocument(ALLOWED, fakeFetch({ [ALLOWED]: { status: 200, length: String(MAX_FETCH_BYTES + 1), body: pdf } }).impl);
  check("a declared oversize file is refused", r.ok, false);
}
{
  const big = new Uint8Array(MAX_FETCH_BYTES + 10);
  const r = await fetchPublicDocument(ALLOWED, fakeFetch({ [ALLOWED]: { status: 200, body: big } }).impl);
  check("an oversize body is refused while reading", r.ok ? "fetched" : r.reason.includes("larger than 5 MB"), true);
}
{
  const r = await fetchPublicDocument(ALLOWED, fakeFetch({ [ALLOWED]: { status: 403 } }).impl);
  check("a sign-in wall is reported", r.ok ? "fetched" : r.reason.includes("403"), true);
}
{
  const r = await fetchPublicDocument("https://in-tendhost.co.uk/x", fakeFetch({}).impl);
  check("a link off the list is never requested", r.ok, false);
}
{
  // Headers arrive, then the connection drops mid-download.
  const broken = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("%PDF-1.4 partial"));
      controller.error(new Error("socket hang up"));
    },
  });
  const r = await fetchPublicDocument(ALLOWED, async () => new Response(broken, { status: 200 }));
  check("a download cut off mid-stream is a refusal, not a crash", r.ok ? "fetched" : r.reason.includes("cut off"), true);
}

console.log("\n  Requirements");
check("a mandatory requirement is met only with evidence", requirementProblem({ kind: "mandatory", status: "met", evidenceVersionId: null, text: "ISO 27001 certificate" }) !== null, true);
check("with evidence it saves", requirementProblem({ kind: "mandatory", status: "met", evidenceVersionId: "v1", text: "ISO 27001 certificate" }), null);
check("a scored requirement may be met without a file", requirementProblem({ kind: "scored", status: "met", evidenceVersionId: null, text: "Describe your approach" }), null);
check("an unknown kind is refused", requirementProblem({ kind: "nice_to_have", status: "unknown", evidenceVersionId: null, text: "xyz" }) !== null, true);
const rows = [
  { kind: "mandatory", status: "met", ref: "SQ 1", text: "Insurance" },
  { kind: "mandatory", status: "unknown", ref: null, text: "Cyber Essentials" },
  { kind: "mandatory", status: "not_met", ref: "SQ 3", text: "SC clearance for   all staff" },
  { kind: "scored", status: "partly_met", ref: null, text: "Approach" },
];
check("summary counts", summarise(rows), { recorded: 4, mandatory: 3, mandatoryOpen: 1, mandatoryNotMet: 1, disqualifiers: ["SQ 3: SC clearance for all staff"] });
check(
  "a met requirement on lapsed evidence counts as open, as the gate counts it",
  summarise([{ kind: "mandatory", status: "met", ref: null, text: "Insurance", evidenceCurrent: false }]).mandatoryOpen,
  1
);
check("gate: a tender with nothing recorded", requirementsGate("tender", { recorded: 0, mandatoryOpen: 0, mandatoryNotMet: 0 }).ok, false);
check("gate: a quotation with nothing recorded", requirementsGate("commercial", { recorded: 0, mandatoryOpen: 0, mandatoryNotMet: 0 }).ok, true);
check("gate: an unmet mandatory requirement", requirementsGate("tender", { recorded: 4, mandatoryOpen: 0, mandatoryNotMet: 1 }).ok, false);
check("gate: an open mandatory requirement", requirementsGate("tender", { recorded: 4, mandatoryOpen: 1, mandatoryNotMet: 0 }).ok, false);
check("gate: all clear", requirementsGate("tender", { recorded: 4, mandatoryOpen: 0, mandatoryNotMet: 0 }).ok, true);

console.log("\n  Compliance matrix");
check("a formula in buyer text is neutralised", csvCell("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
check("a leading minus is neutralised", csvCell("-1+2"), `"'-1+2"`);
check("plain text is quoted", csvCell("Insurance, £5m"), `"Insurance, £5m"`);
check("an empty value is an empty cell", csvCell(null), `""`);
{
  const csv = complianceMatrixCsv([
    { ref: "SQ 1", kind: "mandatory", text: "Hold PI insurance", status: "not_met", source: "ITT", location: "p4", evidence: null, evidenceCurrent: null, notes: null },
    { ref: null, kind: "scored", text: "Approach", status: "met", source: null, location: null, evidence: "Method v2 (m.pdf)", evidenceCurrent: false, notes: "line1\nline2" },
  ]);
  const lines = csv.replace(/^﻿/, "").split("\r\n");
  check("a header and one line per requirement", lines.filter(Boolean).length, 3);
  check("status is readable and lapsed evidence is flagged", lines[2].includes('"met"') && lines[2].includes("no (lapsed or superseded)"), true);
  check("starts with a byte-order mark for spreadsheets", csv.charCodeAt(0), 0xfeff);
}

console.log("\n  Package manifest");
{
  const text = packageManifestText({
    opportunityTitle: "Network refresh\r\nFingerprint:  forged",
    destination: "https://portal.example/tender/1",
    version: 2,
    status: "locked",
    manifestSha256: "a".repeat(64),
    lockedAt: new Date("2026-11-23T01:00:00Z"),
    price: { amount: 12500, basis: "fixed" },
    declarations: ["No conflicts of interest"],
    items: [{ label: "Method statement", filename: "method.pdf", sha256: "b".repeat(64), sizeBytes: 1234 }],
  });
  check("a line break in a title cannot forge a line", text.split("\r\n").filter((l) => l.startsWith("Fingerprint:")).length, 1);
  check("each file's sha256 is listed", text.includes(`sha256: ${"b".repeat(64)}`), true);
  check("the package fingerprint is listed", text.includes(`Fingerprint:  ${"a".repeat(64)}`), true);
  const draft = packageManifestText({ opportunityTitle: "x", destination: "y", version: 1, status: "draft", manifestSha256: null, lockedAt: null, price: null, declarations: [], items: [] });
  check("an unlocked package says it is not approved", draft.includes("not an approved package"), true);
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
