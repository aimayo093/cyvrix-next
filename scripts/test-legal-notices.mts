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
  legalNoticeEmail,
  legalNoticeNotification,
} from "../lib/legal-notices-core";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

const published = { status: "PUBLISHED", title: "Privacy Policy", body: "One.\n\nTwo." };

// ── When a notice goes out ────────────────────────────────────────────────
check("first publish notifies", legalChangeNeedsNotice(null, published), true);
check("draft to published notifies", legalChangeNeedsNotice({ ...published, status: "DRAFT" }, published), true);
check("changed wording notifies", legalChangeNeedsNotice(published, { ...published, body: "One.\n\nTwo, changed." }), true);
check("changed title notifies", legalChangeNeedsNotice(published, { ...published, title: "Privacy Notice" }), true);
check("same text again does not", legalChangeNeedsNotice(published, { ...published }), false);
check("whitespace-only edit does not", legalChangeNeedsNotice(published, { ...published, body: "One.  \r\n\r\n  Two." }), false);
check("saving a draft does not", legalChangeNeedsNotice(published, { ...published, status: "DRAFT", body: "New." }), false);
check("unpublishing does not", legalChangeNeedsNotice(published, { ...published, status: "DRAFT" }), false);

// ── What it says ──────────────────────────────────────────────────────────
check("summary on one line", cleanChangeSummary("  Added\n\nemail\tretention "), "Added email retention");
check("summary bounded", cleanChangeSummary("x".repeat(2000)).length, LEGAL_NOTICE_SUMMARY_MAX);
const url = "https://cyvrix.co.uk/privacy-policy";
const email = legalNoticeEmail({ title: "Privacy Policy", summary: "Email retention added.", url, name: "Sam", date: "15 November 2026" });
check("subject names the document", email.subject, "We have updated our Privacy Policy");
check("email links to the document", email.text.includes(url), true);
check("email carries the summary", email.text.includes("What changed: Email retention added."), true);
check("email says it is a service message", /service message/.test(email.text), true);
check("no summary, no empty line for it", legalNoticeEmail({ title: "Terms", summary: "", url, date: "1 May 2027" }).text.includes("What changed"), false);
check("no name, plain greeting", legalNoticeEmail({ title: "Terms", summary: "", url, name: " ", date: "1 May 2027" }).text.startsWith("Hello,"), true);
check("notification falls back without a summary", legalNoticeNotification({ title: "Cookie Policy", summary: "", url }).body.startsWith("Our Cookie Policy has changed."), true);

// ── Both ways public legal text changes are wired ─────────────────────────
const actions = fs.readFileSync(path.join(process.cwd(), "lib/admin-actions.ts"), "utf8");
for (const fn of ["saveLegalPage", "restoreReviewedLegalPage"]) {
  const start = actions.indexOf(`export async function ${fn}(`);
  const end = actions.indexOf("\nexport async function ", start + 1);
  const body = actions.slice(start, end === -1 ? undefined : end);
  check(`${fn} checks for a notice`, start >= 0 && body.includes("legalChangeNeedsNotice(") && body.includes("notifyLegalChange("), true);
}
const server = fs.readFileSync(path.join(process.cwd(), "lib/legal-notices.ts"), "utf8");
check("one email per recipient, never a shared To", /sendEmail\(\{ to: user\.email/.test(server), true);
check("only active accounts", /where: \{ active: true \}/.test(server), true);

if (failures) {
  console.error(`\n  ${failures} legal-notice check(s) failed.`);
  process.exit(1);
}
console.log("\n  All legal-notice checks passed.");
