/**
 * Phase 2 rules that need no network or database: OCDS normalising, the IT
 * relevance filter, contact handling, cross-portal duplicate keys, the
 * ChatGPT report parser and the morning schedule.
 * Run with: npm run test:procurement-ingest
 */
import { buyerContacts, crossSourceKey, isRelevant, normalise, noticeUrl, withoutContactPoints } from "../lib/procurement/ocds";
import { parseReport, parseReportWithCount } from "../lib/procurement/report-import";
import { privacyNoticeCoversTenderContacts } from "../lib/procurement/privacy-gate";
import { isScheduledRun } from "../lib/procurement/schedule";
import { agentOpportunity, containsPersonalData, isPublicLink, scrub, WITHHELD_TITLE } from "../lib/procurement/agent-view";
import { rangesAgree, valuesAgree } from "../lib/procurement/ingest-rules";
import { authorise } from "../lib/paperclip-auth";
import {
  awardOnly,
  ftsItSupport,
  ftsKeywordOnly,
  ftsTraining,
  PARAGRAPH_REPORT,
  pcsCopyOfItSupport,
  pcsCyber,
  SAMPLE_REPORT,
} from "./fixtures/procurement/ocds";

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

console.log("\n  Relevance");
check("IT support CPV is relevant", isRelevant(ftsItSupport), { relevant: true, why: "CPV 72253000" });
check("training framework is not", isRelevant(ftsTraining).relevant, false);
check("wording catches IT in a building contract", isRelevant(ftsKeywordOnly).relevant, true);
check("cyber wording with a generic CPV is relevant", isRelevant(pcsCyber).relevant, true);

console.log("\n  Normalising");
const n = normalise("fts", ftsItSupport)!;
check("ocid and release id", [n.ocid, n.releaseId], ["ocds-h6vhtk-0aaaa1", "100001-2026"]);
check("title", n.title, "Managed IT Support Services");
check("deadline is a date", n.deadlineAt?.toISOString(), "2026-12-15T12:00:00.000Z");
check("value", [n.valueMin, n.valueMax, n.currency], [null, 250000, "GBP"]);
check("region from delivery address", n.regions, ["UKL"]);
check("Find a Tender notice link", n.noticeUrl, "https://www.find-tender.service.gov.uk/Notice/100001-2026");
check("PCS uses its canonical link", noticeUrl("pcs", pcsCopyOfItSupport), "https://api.publiccontractsscotland.gov.uk/v1/Notice?id=ocds-r6ebe6-0000000001");
check("missing title gives nothing", normalise("fts", { ...ftsItSupport, tender: { ...ftsItSupport.tender, title: "" } }), null);
check("award-only releases are tagged as such (ingest skips them)", awardOnly.tag, ["award"]);

console.log("\n  Contacts (personal data)");
const contacts = buyerContacts(ftsItSupport);
check("only the buyer's contact point is taken", contacts.length, 1);
check("email lower-cased", contacts[0].email, "procurement@example.gov.uk");
check("an invalid email is dropped", buyerContacts({ ...pcsCyber, parties: [{ roles: ["buyer"], name: "X", contactPoint: { name: "A", email: "not-an-email" } }] })[0].email, null);
const stripped = withoutContactPoints(ftsItSupport);
check("the stored raw copy has no contact points", (stripped.parties ?? []).every((p) => !p.contactPoint), true);
check("and the original is untouched", Boolean(ftsItSupport.parties?.[0].contactPoint), true);

console.log("\n  Cross-portal duplicates");
const pcsN = normalise("pcs", pcsCopyOfItSupport)!;
check("same tender on two portals gives the same key", crossSourceKey(n), crossSourceKey(pcsN));
check("a different tender does not", crossSourceKey(n) === crossSourceKey(normalise("pcs", pcsCyber)!), false);
check("no deadline means no key", crossSourceKey({ buyerName: "X", title: "Y", deadlineAt: null }), null);

console.log("\n  ChatGPT report parser");
const items = parseReport(SAMPLE_REPORT);
check("five leads, the repeated one counted once", items.length, 5);
check("sections are kept", items.map((i) => i.section), [
  "Commercial opportunities",
  "Commercial opportunities",
  "Government and public sector",
  "Government and public sector",
  "Defence and security-cleared",
]);
check("markdown and the link are removed from titles", items[0].title, "Example Logistics Ltd - moving to new Swansea offices, hiring an IT manager.");
check("first link is the evidence", items[0].url, "https://example.com/news/move");
check("commercial leads stay commercial", items[0].kind, "commercial");
check("government leads become tenders", items[2].kind, "tender");
check("an ITT is a confirmed buying opportunity", items[2].confirmedBuying, true);
check("a news item is not", items[0].confirmedBuying, false);
check("a continuation line stays with its lead", items[3].quote.includes("second line"), true);
check("a lead with no link keeps its text as evidence", [items[3].url, items[3].quote.length > 10], [null, true]);
const paras = parseReport(PARAGRAPH_REPORT);
check("paragraph reports split on blank lines", paras.map((p) => p.url), ["https://example.com/retail", "https://example.com/housing"]);
check("nothing to parse gives nothing", parseReport("\n\n   \n"), []);

console.log("\n  Morning schedule (London)");
check("06:00 UTC in winter (06:00 London) runs", isScheduledRun(new Date("2026-12-01T06:00:00Z")), true);
check("06:00 UTC in summer (07:00 London) runs", isScheduledRun(new Date("2026-07-01T06:00:00Z")), true);
check("midday does not", isScheduledRun(new Date("2026-12-01T12:00:00Z")), false);
check("09:00 London does not (that is the ChatGPT report's slot)", isScheduledRun(new Date("2026-12-01T09:00:00Z")), false);

console.log("\n  Agent view: organisations and roles only (D4)");
check("an email address is personal data", containsPersonalData("Contact pat.example@council.example for details"), true);
check("a UK phone number is personal data", containsPersonalData("Call 01792 000000"), true);
check("an international number is personal data", containsPersonalData("Call +44 20 0000 0000"), true);
check("a LinkedIn profile link is personal data", containsPersonalData("See https://www.linkedin.com/in/someone"), true);
check("a mailto link is personal data", containsPersonalData("mailto:x"), true);
check("dates and values are not mistaken for phones", containsPersonalData("Deadline 2026-12-15 12:00, value 250000, ref 100001-2026"), false);
check(
  "an organisation and a role are fine",
  containsPersonalData("Head of IT at Example Council, notice https://www.find-tender.service.gov.uk/Notice/100001-2026"),
  false
);
check("scrub removes emails and phones", scrub("Ask a@b.example or 01792 000000"), "Ask [email removed] or [phone removed]");
check("public https link allowed", isPublicLink("https://www.find-tender.service.gov.uk/Notice/1"), true);
check("plain http refused", isPublicLink("http://example.com"), false);
check("social profile refused", isPublicLink("https://facebook.com/someone"), false);
const view = agentOpportunity({
  id: "o1",
  kind: "tender",
  status: "Discovered",
  title: "IT support - contact a@b.example",
  origin: "fts",
  confirmedBuying: true,
  deadlineAt: new Date("2026-12-15T12:00:00Z"),
  clarificationDeadlineAt: null,
  valueMin: null,
  valueMax: { toString: () => "250000" },
  currency: "GBP",
  region: "UKL",
  cpv: ["72253000"],
  updatedAt: new Date("2026-11-18T08:00:00Z"),
  Buyer: { name: "Example County Council" },
  Evidence: [{ url: "https://www.find-tender.service.gov.uk/Notice/100001-2026" }, { url: "https://www.linkedin.com/in/someone" }, { url: null }],
});
check("the agent view has exactly the allowed fields", Object.keys(view).sort(), [
  "buyer",
  "clarificationDeadlineAt",
  "confirmedBuying",
  "cpv",
  "currency",
  "deadlineAt",
  "id",
  "kind",
  "links",
  "origin",
  "region",
  "status",
  "title",
  "updatedAt",
  "valueMax",
  "valueMin",
]);
check("an email in a title is removed", view.title, "IT support - contact [email removed]");
check("only public links are passed on", view.links, ["https://www.find-tender.service.gov.uk/Notice/100001-2026"]);

console.log("\n  Procurement token scope");
const R = "r".repeat(40);
const D = "d".repeat(40);
const P = "p".repeat(40);
check("off with no procurement token", authorise("procurement", `Bearer ${P}`, { PAPERCLIP_READ_TOKEN: R }), "off");
check("its own token works", authorise("procurement", `Bearer ${P}`, { PAPERCLIP_READ_TOKEN: R, PAPERCLIP_PROCUREMENT_TOKEN: P }), "ok");
check("the read token does not open it", authorise("procurement", `Bearer ${R}`, { PAPERCLIP_READ_TOKEN: R, PAPERCLIP_PROCUREMENT_TOKEN: P }), "unauthorised");
check("the procurement token does not open client data", authorise("read", `Bearer ${P}`, { PAPERCLIP_READ_TOKEN: R, PAPERCLIP_PROCUREMENT_TOKEN: P }), "unauthorised");
check("reusing the read token switches it off", authorise("procurement", `Bearer ${R}`, { PAPERCLIP_READ_TOKEN: R, PAPERCLIP_PROCUREMENT_TOKEN: R }), "off");
check("reusing the draft token switches it off", authorise("procurement", `Bearer ${D}`, { PAPERCLIP_DRAFT_TOKEN: D, PAPERCLIP_PROCUREMENT_TOKEN: D }), "off");
check("a short token is off", authorise("procurement", "Bearer short", { PAPERCLIP_PROCUREMENT_TOKEN: "short" }), "off");

console.log("\n  Review fixes (PR 15)");
const kw = (title: string) => isRelevant({ ocid: "o", id: "1", tag: ["tender"], tender: { title, classification: { scheme: "CPV", id: "45000000" } } }).relevant;
check("'it services' does not match 'audit services'", kw("Internal audit services"), false);
check("'lan' does not match 'plan' or 'clean'", [kw("Business plan review"), kw("Cleaning contract")], [false, false]);
check("whole-word IT phrases still match", [kw("IT services framework"), kw("LAN upgrade"), kw("Break/fix support")], [true, true, true]);
check(
  "an email is lower-cased",
  buyerContacts({ ...pcsCyber, parties: [{ roles: ["buyer"], name: "X", contactPoint: { email: "Tenders@Example.GOV.uk" } }] })[0].email,
  "tenders@example.gov.uk"
);
const colon = parseReport("1. Example Ltd needs a new MSP\nSource:\nhttps://example.com/msp\n2. Second lead here https://example.com/two");
check("a 'Source:' line inside a lead does not become a heading", [colon.length, colon[0].url, colon[0].section], [2, "https://example.com/msp", null]);
check("'deadline' alone is not a buying signal", parseReport("1. Example Ltd office move, deadline for decision March https://example.com/m")[0].confirmedBuying, false);
check("a request for information is not either", parseReport("1. Example Council request for information on IT support https://example.com/rfi")[0].confirmedBuying, false);
const many = Array.from({ length: 105 }, (_, n) => `${n + 1}. Lead number ${n + 1} https://example.com/${n}`).join("\n");
check("over 100 leads are counted, not silently dropped", parseReportWithCount(many).omitted, 5);
check("same title with different links are two leads", parseReport("1. Desktop support - Example A https://a.example\n2. Desktop support - Example A https://b.example").length, 2);
check("international 00 numbers are personal data", containsPersonalData("Call 0044 20 0000 0000"), true);
check("a date range is not a phone number", containsPersonalData("Contract 01-12-2026 - 15-12-2027"), false);
check("a profile link in a title is removed", scrub("Lead via https://www.linkedin.com/in/someone today"), "Lead via [link removed] today");
check(
  "ChatGPT report titles are withheld from agents",
  agentOpportunity({ ...{ id: "o2", kind: "commercial", status: "Discovered", title: "Jo Bloggs at Example Ltd is hiring", origin: "chatgpt_task", confirmedBuying: false, deadlineAt: null, clarificationDeadlineAt: null, valueMin: null, valueMax: null, currency: "GBP", region: null, cpv: [], updatedAt: new Date() } }).title,
  WITHHELD_TITLE
);
check("values within 25% agree", [valuesAgree(100000, 120000), valuesAgree(100000, 200000), valuesAgree(null, 5)], [true, false, true]);
check("a published zero is a value, not a missing one", [valuesAgree(0, 1000000), valuesAgree(0, 0)], [false, true]);
check("equal maxima do not excuse conflicting minima", rangesAgree({ valueMin: 10000, valueMax: 500000 }, { valueMin: 400000, valueMax: 500000 }), false);
check("both bounds agreeing merges", rangesAgree({ valueMin: null, valueMax: 500000 }, { valueMin: 400000, valueMax: 450000 }), true);
check("privacy gate: a passing mention of public tenders is not the section", privacyNoticeCoversTenderContacts({ status: "PUBLISHED", body: "We do not sell data from public tenders." }), false);
check("privacy gate: unpublished policy blocks", privacyNoticeCoversTenderContacts({ status: "DRAFT", body: "Business contacts from public tenders" }), false);
check("privacy gate: published without the section blocks", privacyNoticeCoversTenderContacts({ status: "PUBLISHED", body: "We collect your email." }), false);
check("privacy gate: published with the section passes", privacyNoticeCoversTenderContacts({ status: "PUBLISHED", body: "## Business contacts from public tenders\n…" }), true);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
