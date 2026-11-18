/**
 * Phase 2 rules that need no network or database: OCDS normalising, the IT
 * relevance filter, contact handling, cross-portal duplicate keys, the
 * ChatGPT report parser and the morning schedule.
 * Run with: npm run test:procurement-ingest
 */
import { buyerContacts, crossSourceKey, isRelevant, normalise, noticeUrl, withoutContactPoints } from "../lib/procurement/ocds";
import { parseReport } from "../lib/procurement/report-import";
import { isScheduledRun } from "../lib/procurement/schedule";
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

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
