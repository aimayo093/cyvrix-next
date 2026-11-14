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
  nextUidBatch,
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
const server = "mail.example.net:993";
const midKey = inboundExternalId({ mailbox: "Admin@cyvrix.co.uk", server, messageId: "<abc@mail.example>", uid: 7, uidValidity: BigInt(9) });
check("Message-ID preferred, hashed, mailbox lower-cased", /^admin@cyvrix\.co\.uk\|mid\|[0-9a-f]{64}$/.test(midKey), true);
check("brackets do not change the Message-ID key", midKey === inboundExternalId({ mailbox: "admin@cyvrix.co.uk", server, messageId: "abc@mail.example", uid: 1, uidValidity: 1 }), true);
check("UID key carries server and UIDVALIDITY", inboundExternalId({ mailbox: "admin@cyvrix.co.uk", server: "Mail.Example.net:993", messageId: null, uid: 7, uidValidity: BigInt(9) }), "admin@cyvrix.co.uk|uid|mail.example.net:993|9|7");
check("same message, two syncs, one key", inboundExternalId({ mailbox: "a@b.c", server, messageId: "<x@y>", uid: 1, uidValidity: 1 }) === inboundExternalId({ mailbox: "a@b.c", server: "other:143", messageId: "<x@y>", uid: 99, uidValidity: 2 }), true);
const longA = "a".repeat(400) + "@x";
const longB = "a".repeat(400) + "@y";
check("two long Message-IDs never merge", inboundExternalId({ mailbox: "a@b.c", server, messageId: longA, uid: 1, uidValidity: 1 }) === inboundExternalId({ mailbox: "a@b.c", server, messageId: longB, uid: 1, uidValidity: 1 }), false);
check("key length bounded", midKey.length < 120, true);

// ── Batches drain oldest first ────────────────────────────────────────────
check("oldest first, past the cursor only", nextUidBatch([9, 3, 5, 3, 1], 2, 10), [3, 5, 9]);
check("a backlog is read in batches", nextUidBatch(Array.from({ length: 250 }, (_, i) => i + 1), 0, 100).at(-1), 100);
check("the next run continues after the first batch", nextUidBatch(Array.from({ length: 250 }, (_, i) => i + 1), 100, 100)[0], 101);

// ── Text ──────────────────────────────────────────────────────────────────
check("CRLF normalised", capText("a\r\nb"), "a\nb");
check("control characters removed, tabs kept", capText("a\u0000b\tc\u0007"), "ab\tc");
const long = capText("x".repeat(EMAIL_TEXT_MAX + 50));
check("long text capped with a note", long.startsWith("x".repeat(1000)) && long.includes("[Truncated"), true);
check("the note fits inside the cap", long.length <= EMAIL_TEXT_MAX, true);
check("long subject capped at the limit", capSubject("s".repeat(500)).length, 300);
check("empty subject named", capSubject("   "), "(no subject)");
check("subject on one line", capSubject("Re:\r\n  hello"), "Re: hello");

// ── Retention and sync timing ─────────────────────────────────────────────
check("24 months back", retentionCutoff(new Date("2026-11-14T12:00:00Z")).toISOString(), "2024-11-14T12:00:00.000Z");
check("29 February clamps to 28 February", retentionCutoff(new Date("2028-02-29T00:00:00Z")).toISOString(), "2026-02-28T00:00:00.000Z");
check("never synced is due", inboxSyncDue(null, new Date()), true);
check("synced a minute ago is not due", inboxSyncDue(new Date(Date.now() - 60_000).toISOString(), new Date()), false);
check("synced three minutes ago is due", inboxSyncDue(new Date(Date.now() - 180_000).toISOString(), new Date()), true);
check("garbage timestamp is due", inboxSyncDue("not a date", new Date()), true);

// ── Errors never carry credentials ────────────────────────────────────────
const leaked = safeMailError(new Error("Invalid login: 535 Authentication failed\nC: AUTH PLAIN dXNlcgBwYXNz\nS: 535"));
check("AUTH exchange redacted", /dXNlcgBwYXNz/.test(leaked), false);
check("reason kept", leaked.includes("535"), true);
check("known secret values redacted anywhere", safeMailError(new Error("connect failed for hunter2-secret at host"), ["hunter2-secret"]).includes("hunter2-secret"), false);
check("password fields redacted", safeMailError(new Error("config password=abc123 rejected")).includes("abc123"), false);
check("URL credentials redacted", safeMailError(new Error("imap://user:pw123@mail.example failed")).includes("pw123"), false);
check("error length bounded", safeMailError(new Error("y".repeat(1000))).length <= 300, true);

// ── Email never reaches the AI workforce ──────────────────────────────────
for (const file of ["lib/paperclip-snapshot.ts", "lib/paperclip-snapshot-core.ts", "lib/executive-os-feed.ts", "lib/agent-drafts.ts"]) {
  const full = path.join(process.cwd(), file);
  // A renamed file must fail here, not silently drop out of the check.
  check(`${file} exists`, fs.existsSync(full), true);
  if (!fs.existsSync(full)) continue;
  check(`${file} never reads email history`, /emailMessage|email-history/i.test(fs.readFileSync(full, "utf8")), false);
}
// Only these files may touch the email table directly.
const allowed = new Set(["lib/email-history.ts", "scripts/test-email-history.mts"]);
const touching: string[] = [];
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "generated", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mts)$/.test(entry.name) && /prisma\.emailMessage\b/.test(fs.readFileSync(full, "utf8"))) {
      touching.push(path.relative(process.cwd(), full).split(path.sep).join("/"));
    }
  }
}
for (const dir of ["app", "lib", "components", "scripts"]) if (fs.existsSync(dir)) walk(dir);
check("only the email-history module reads the email table", touching.filter((f) => !allowed.has(f)), []);

// ── The fallback privacy policy says so (the live CMS copy is edited separately)
const policy = JSON.stringify(getDefaultLegalDocument("privacy-policy"));
check("policy discloses kept emails", policy.includes("admin@cyvrix.co.uk mailbox"), true);
check("policy states email retention", policy.includes("kept there for 24 months and then deleted"), true);

if (failures) {
  console.error(`\n  ${failures} email-history check(s) failed.`);
  process.exit(1);
}
console.log("\n  All email-history checks passed.");
