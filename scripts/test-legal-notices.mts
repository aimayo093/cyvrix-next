/**
 * Notices to account holders when public legal text changes (DECISIONS §19).
 * Run: npm run test:legal-notices
 */
import fs from "node:fs";
import path from "node:path";
import {
  LEGAL_NOTICE_SUMMARY_MAX,
  cleanChangeSummary,
  legalChangeNeedsNotice,
  legalNoticeDate,
  legalNoticeEmail,
  legalNoticeNotification,
  legalVersionHash,
  visibleLegalText,
} from "../lib/legal-notices-core";
import { getDefaultLegalDocument } from "../lib/legal-content";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

const slug = "privacy-policy";
const para = "This paragraph is long enough to count as substantive legal content for the public page, and it says something real.";
const body = [para, para + " Second.", para + " Third."].join("\n\n");
const published = { status: "PUBLISHED", title: "Privacy Policy", body };

// ── When a notice goes out ────────────────────────────────────────────────
check("changed wording notifies", legalChangeNeedsNotice(slug, published, { ...published, body: body + "\n\nA new paragraph." }), true);
check("changed title notifies", legalChangeNeedsNotice(slug, published, { ...published, title: "Privacy Notice" }), true);
check("first real publish over the default notifies", legalChangeNeedsNotice(slug, null, published), true);
check("same text again does not", legalChangeNeedsNotice(slug, published, { ...published }), false);
check("whitespace-only edit does not", legalChangeNeedsNotice(slug, published, { ...published, body: body.replace(/\n\n/g, "  \r\n\r\n  ") }), false);
check("saving a draft does not", legalChangeNeedsNotice(slug, published, { ...published, status: "DRAFT", body: "New." }), false);
check("republishing identical text from draft does not", legalChangeNeedsNotice(slug, { ...published, status: "DRAFT" }, published) === legalChangeNeedsNotice(slug, null, published), true);

// Restoring the reviewed wording over a stub: the public page already showed
// the reviewed default, so visitors see no change and nobody is emailed.
const reviewed = getDefaultLegalDocument(slug)!;
const restoredBody = (reviewed.sections?.length
  ? reviewed.sections.map((s) => [s.heading, ...s.paragraphs].join("\n\n"))
  : reviewed.paragraphs
).join("\n\n");
const stub = { status: "PUBLISHED", title: "Privacy Policy", body: "Placeholder." };
check("restore over a stub visitors never saw does not", legalChangeNeedsNotice(slug, stub, { status: "PUBLISHED", title: reviewed.title, body: restoredBody, reviewNotice: reviewed.reviewNotice }), false);
check("restore over different live wording does", legalChangeNeedsNotice(slug, published, { status: "PUBLISHED", title: reviewed.title, body: restoredBody, reviewNotice: reviewed.reviewNotice }), true);

// ── Versions ──────────────────────────────────────────────────────────────
const v1 = legalVersionHash(visibleLegalText(slug, published));
check("version hash is stable", v1 === legalVersionHash(visibleLegalText(slug, { ...published })), true);
check("version hash ignores whitespace", v1 === legalVersionHash(visibleLegalText(slug, { ...published, body: body.replace(/\n\n/g, "\n\n\n") })), true);
check("version hash follows the wording", v1 === legalVersionHash(visibleLegalText(slug, { ...published, title: "Other" })), false);
check("a changed review notice notifies", legalChangeNeedsNotice(slug, { ...published, reviewNotice: "Reviewed in 2026." }, { ...published, reviewNotice: "Reviewed in 2027." }), true);

// ── What it says ──────────────────────────────────────────────────────────
check("summary on one line", cleanChangeSummary("  Added\n\nemail\tretention "), "Added email retention");
check("summary bounded", cleanChangeSummary("x".repeat(2000)).length, LEGAL_NOTICE_SUMMARY_MAX);
check("date is the saved date, in London time", legalNoticeDate(new Date("2026-07-14T23:30:00Z")), "15 July 2026");
const url = "https://cyvrix.co.uk/privacy-policy";
const email = legalNoticeEmail({ title: "Privacy Policy", summary: "Email retention added.", url, name: "Sam", date: "15 November 2026" });
const lines = email.text.split("\n");
check("subject names the document", email.subject, "We have updated our Privacy Policy");
check("the link is a line of its own, exactly", lines[lines.indexOf("You can read it in full here:") + 1], url);
check("email carries the summary", lines.includes("What changed: Email retention added."), true);
check("email says it is a service message", /service message/.test(email.text), true);
check("no summary, no line for it", legalNoticeEmail({ title: "Terms", summary: "", url, date: "1 May 2027" }).text.split("\n").some((l) => l.startsWith("What changed")), false);
check("no name, plain greeting", legalNoticeEmail({ title: "Terms", summary: "", url, name: " ", date: "1 May 2027" }).text.split("\n")[0], "Hello,");
check("notification falls back without a summary", legalNoticeNotification({ title: "Cookie Policy", summary: "", url }).body.startsWith("Our Cookie Policy has changed."), true);

// ── Both ways public legal text changes are wired, and gated ──────────────
const actions = fs.readFileSync(path.join(process.cwd(), "lib/admin-actions.ts"), "utf8");
for (const fn of ["saveLegalPage", "restoreReviewedLegalPage"]) {
  const start = actions.indexOf(`export async function ${fn}(`);
  const end = actions.indexOf("\nexport async function ", start + 1);
  const source = actions.slice(start, end === -1 ? undefined : end);
  const gate = source.search(/if \((route && )?legalChangeNeedsNotice\(/);
  const notify = source.indexOf("notifyLegalChange(");
  // The notify call must be the only one, and inside the block the gate opens.
  const gateBlockEnd = gate >= 0 ? source.indexOf("\n  }\n", gate) : -1;
  check(`${fn}: notify only inside the notice gate`, start >= 0 && gate >= 0 && notify > gate && notify < gateBlockEnd && source.split("notifyLegalChange(").length === 2, true);
  const write = source.search(/prisma\.\$transaction\(/);
  check(`${fn}: notice scheduled after the write`, write >= 0 && gate > write, true);
}
const server = fs.readFileSync(path.join(process.cwd(), "lib/legal-notices.ts"), "utf8");
check("one email per recipient, never a shared To", /sendEmail\(\{ to: user\.email/.test(server), true);
check("only active accounts", /where: \{ active: true \}/.test(server), true);
const at = (needle: string) => server.indexOf(needle);
check("recipients are read before the version is claimed", at("prisma.user") >= 0 && at("claimVersion(input") > at("prisma.user"), true);
check("each version claimed once before sending", at("claimVersion(input") >= 0 && at("claimVersion(input") < at("sendEmail("), true);
check("a start entry is written before any email", at('"legal_change_notice_started"') >= 0 && at('"legal_change_notice_started"') < at("sendEmail("), true);

if (failures) {
  console.error(`\n  ${failures} legal-notice check(s) failed.`);
  process.exit(1);
}
console.log("\n  All legal-notice checks passed.");
