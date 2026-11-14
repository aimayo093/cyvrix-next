/**
 * Checks the access control and cursor handling of the Executive OS feed
 * (app/api/integrations/executive-os/feed).
 *
 * Run with: npm run test:feed
 *
 * The feed hands enquiry data to another system, so the parts that decide who
 * gets it are checked here: the route stays off without a long token, only the
 * exact bearer token is accepted, and a tampered or malformed cursor falls back
 * to "from the start" instead of throwing or reading arbitrary input.
 */
import { encodeCursor, feedAuthorised, feedToken, parseCursor } from "../lib/executive-os-feed-core";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  const label = ok ? "PASS" : "FAIL";
  const detail = ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  console.log(`  ${label}  ${name}${detail}`);
}

const token = "t".repeat(48);

console.log("\n  Switching the feed on");
check("off when the token is unset", feedToken({}), null);
check("off when the token is shorter than 32 characters", feedToken({ EXECUTIVE_OS_FEED_TOKEN: "short-token" }), null);
check("on with a 48-character token", feedToken({ EXECUTIVE_OS_FEED_TOKEN: ` ${token} ` }), token);

console.log("\n  Bearer token");
check("exact token accepted", feedAuthorised(`Bearer ${token}`, token), true);
check("missing header refused", feedAuthorised(null, token), false);
check("wrong token refused", feedAuthorised(`Bearer ${"x".repeat(48)}`, token), false);
check("token prefix refused", feedAuthorised(`Bearer ${token.slice(0, 40)}`, token), false);
check("token without the Bearer scheme refused", feedAuthorised(token, token), false);
check("empty bearer refused", feedAuthorised("Bearer ", token), false);

console.log("\n  Cursor");
const cursor = { lead: { at: "2026-10-02T09:00:00.000Z", id: "a1" }, ticket: { at: "2026-10-01T09:00:00.000Z", id: "t1" } };
check("round trip", parseCursor(encodeCursor(cursor)), { ...cursor, message: undefined, privacy: undefined });
check("no cursor starts from the beginning", parseCursor(null), {});
check("garbage starts from the beginning", parseCursor("not-base64-json"), {});
check("invalid date dropped", parseCursor(encodeCursor({ lead: { at: "yesterday", id: "a" } })).lead, undefined);
check("oversized cursor ignored", parseCursor("a".repeat(5000)), {});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
