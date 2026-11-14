/**
 * Email history and inbox (DECISIONS §17). Run: npm run test:email-history
 */
import fs from "node:fs";
import path from "node:path";
import {
  EMAIL_TEXT_MAX,
  capSubject,
  capText,
  inboundExternalId,
  inboxSyncDue,
  normaliseAddress,
  retentionCutoff,
  safeMailError,
} from "../lib/email-history-core";
import { getDefaultLegalDocument } from "../lib/legal-content";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

// ── Addresses ──────────────────────────────────────────────────────────────
check("display name form", normaliseAddress('"Sales Team" <Sales@Example.co.uk>'), "sales@example.co.uk");
check("bare address", normaliseAddress("  info@example.com "), "info@example.com");
check("trailing punctuation dropped", normaliseAddress("info@example.com,"), "info@example.com");
check("no address", normaliseAddress("Undisclosed recipients"), "");
check("null", normaliseAddress(null), "");

// ── De-duplication keys ───────────────────────────────────────────────────
check("Message-ID preferred, brackets dropped", inboundExternalId({ mailbox: "Admin@cyvrix.co.uk", messageId: "<abc@mail.example>", uid: 7, uidValidity: BigInt(9) }), "admin@cyvrix.co.uk|mid|abc@mail.example");
check("UID needs UIDVALIDITY when there is no Message-ID", inboundExternalId({ mailbox: "admin@cyvrix.co.uk", messageId: null, uid: 7, uidValidity: BigInt(9) }), "admin@cyvrix.co.uk|uid|9|7");
check("same message, two syncs, one key", inboundExternalId({ mailbox: "a@b.c", messageId: "<x@y>", uid: 1, uidValidity: 1 }) === inboundExternalId({ mailbox: "a@b.c", messageId: "<x@y>", uid: 99, uidValidity: 2 }), true);

// ── Text ──────────────────────────────────────────────────────────────────
check("CRLF normalised", capText("a\r\nb"), "a\nb");
check("control characters removed, tabs kept", capText("a\u0000b\tc\u0007"), "ab\tc");
const long = capText("x".repeat(EMAIL_TEXT_MAX + 50));
check("long text capped with a note", long.startsWith("x".repeat(EMAIL_TEXT_MAX)) && long.includes("[Truncated"), true);
check("empty subject named", capSubject("   "), "(no subject)");
check("subject on one line", capSubject("Re:\r\n  hello"), "Re: hello");

// ── Retention and sync timing ─────────────────────────────────────────────
check("24 months back", retentionCutoff(new Date("2026-11-14T12:00:00Z")).toISOString(), "2024-11-14T12:00:00.000Z");
check("never synced is due", inboxSyncDue(null, new Date()), true);
check("synced a minute ago is not due", inboxSyncDue(new Date(Date.now() - 60_000).toISOString(), new Date()), false);
check("synced three minutes ago is due", inboxSyncDue(new Date(Date.now() - 180_000).toISOString(), new Date()), true);
check("garbage timestamp is due", inboxSyncDue("not a date", new Date()), true);

// ── Errors never carry credentials ────────────────────────────────────────
const leaked = safeMailError(new Error("Invalid login: 535 Authentication failed\nC: AUTH PLAIN dXNlcgBwYXNz\nS: 535"));
check("AUTH exchange redacted", /dXNlcgBwYXNz/.test(leaked), false);
check("reason kept", leaked.includes("535"), true);
check("error length bounded", safeMailError(new Error("y".repeat(1000))).length <= 300, true);

// ── Email never reaches the AI workforce ──────────────────────────────────
for (const file of ["lib/paperclip-snapshot.ts", "lib/paperclip-snapshot-core.ts", "lib/executive-os-feed.ts", "lib/agent-drafts.ts"]) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  check(`${file} never reads email history`, /emailMessage|email-history/i.test(fs.readFileSync(full, "utf8")), false);
}

// ── The privacy policy says so ────────────────────────────────────────────
const policy = JSON.stringify(getDefaultLegalDocument("privacy-policy"));
check("policy discloses kept emails", policy.includes("we keep a copy of the message"), true);
check("policy states email retention", policy.includes("kept for 24 months and then deleted"), true);

if (failures) {
  console.error(`\n  ${failures} email-history check(s) failed.`);
  process.exit(1);
}
console.log("\n  All email-history checks passed.");
