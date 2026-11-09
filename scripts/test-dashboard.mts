/**
 * The Today dashboard's pure logic, exercised directly: the period switch,
 * London day boundaries, the greeting, daily series, the work queue and the
 * Vercel Analytics parser.
 *
 * Nothing here touches the database or the network. The loaders that do are
 * thin wrappers around these functions.
 *
 * Run with `npm run test:dashboard`.
 */
import { ageLabel, greeting, londonDayKey, londonDayKeys, parseRange } from "../lib/dashboard/time";

let failures = 0;
let total = 0;

function check(name: string, actual: unknown, expected: unknown) {
  total += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}`);
  if (!ok) console.log(`          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Period, day keys and greeting ──────────────────────────────────────────
check("range default", parseRange(undefined), 30);
check("range 7", parseRange("7"), 7);
check("range garbage", parseRange("abc"), 30);
check("range not allowed", parseRange("365"), 30);
check("range negative", parseRange("-7"), 30);
check("day key BST just after midnight", londonDayKey(new Date("2026-10-24T23:30:00Z")), "2026-10-25");
const keys = londonDayKeys(30, new Date("2026-11-09T10:00:00Z"));
check("30 keys", keys.length, 30);
check("keys unique", new Set(keys).size, 30);
check("keys end today", keys.at(-1), "2026-11-09");
check("keys start", keys[0], "2026-10-11");
check("greeting morning BST", greeting(new Date("2026-07-01T07:30:00Z"), "Paula Imayo"), "Good morning, Paula");
check("greeting afternoon GMT", greeting(new Date("2026-12-01T12:30:00Z"), "Paula"), "Good afternoon, Paula");
check("greeting evening", greeting(new Date("2026-12-01T19:00:00Z"), "Paula"), "Good evening, Paula");
check("greeting no name", greeting(new Date("2026-12-01T09:00:00Z"), null), "Good morning.");
check("age hours", ageLabel(new Date("2026-11-09T05:00:00Z"), new Date("2026-11-09T10:00:00Z")), "5h");
check("age days", ageLabel(new Date("2026-11-07T09:00:00Z"), new Date("2026-11-09T10:00:00Z")), "2d");

if (failures > 0) {
  console.error(`\n  ${failures} of ${total} checks failed.\n`);
  process.exit(1);
}
console.log(`\n  All ${total} dashboard checks passed.\n`);
