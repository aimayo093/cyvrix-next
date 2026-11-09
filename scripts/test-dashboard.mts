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
import { fillDailySeries, seriesTotal, sparklinePoints } from "../lib/dashboard/series";
import {
  buildQueue,
  summarySentence,
  ticketNeedsStaff,
  type QueueLead,
  type QueueTicket,
} from "../lib/dashboard/queue";

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

// ── Daily series ───────────────────────────────────────────────────────────
const k = ["2026-11-07", "2026-11-08", "2026-11-09"];
check("fill gaps", fillDailySeries([{ day: "2026-11-08", count: 2n }], k), [
  { day: "2026-11-07", count: 0 },
  { day: "2026-11-08", count: 2 },
  { day: "2026-11-09", count: 0 },
]);
check("ignore outside", seriesTotal(fillDailySeries([{ day: "2026-01-01", count: 9 }], k)), 0);
check("flat line no NaN", sparklinePoints([0, 0, 0], 80, 20).includes("NaN"), false);
check("single point", sparklinePoints([5], 80, 20), "0,10 80,10");
check("scaled", sparklinePoints([0, 10], 80, 20), "0,20 80,0");

// ── Work queue ─────────────────────────────────────────────────────────────
const now = new Date("2026-11-09T10:00:00Z");
const past = new Date("2026-11-08T10:00:00Z");
const today = new Date("2026-11-09T00:00:00Z");
const older = new Date("2026-11-01T10:00:00Z");
const twoDaysAgo = new Date("2026-11-07T09:00:00Z");
const hoursAgo = new Date("2026-11-09T05:00:00Z");

const t = (overrides: Partial<QueueTicket> = {}): QueueTicket => ({
  id: "a",
  ticketNumber: "CYV-0001",
  subject: "Printer offline",
  company: "Acme",
  status: "OPEN",
  slaDueAt: null,
  createdAt: hoursAgo,
  ...overrides,
});
const l = (overrides: Partial<QueueLead> = {}): QueueLead => ({
  id: "a",
  name: "Sam",
  company: "Acme",
  source: "contact_form",
  status: "NEW",
  followUpDate: null,
  createdAt: hoursAgo,
  ...overrides,
});

check("waiting on client excluded", buildQueue([t({ status: "WAITING_ON_CLIENT" })], [], now).length, 0);
check("in progress only when overdue", buildQueue([t({ status: "IN_PROGRESS" })], [], now).length, 0);
check("in progress overdue", buildQueue([t({ status: "IN_PROGRESS", slaDueAt: past })], [], now)[0].kind, "overdue");
check("null sla never overdue", buildQueue([t({ status: "OPEN", slaDueAt: null })], [], now)[0].kind, "ticket");
check(
  "lead dedupe as follow up",
  buildQueue([], [l({ status: "NEW", followUpDate: today })], now).map((i) => i.kind),
  ["follow_up"]
);
check("won lead not followed up", buildQueue([], [l({ status: "WON", followUpDate: today })], now).length, 0);
check(
  "overdue sorts first",
  buildQueue([t({ status: "OPEN", createdAt: older }), t({ id: "b", status: "OPEN", slaDueAt: past })], [], now)[0].kind,
  "overdue"
);
check("uncapped", buildQueue([], Array.from({ length: 12 }, (_, i) => l({ id: `l${i}` })), now).length, 12);
check("empty summary", summarySentence([], now), "Nothing is waiting on you.");
check(
  "summary",
  summarySentence(
    buildQueue(
      [t({ status: "OPEN", slaDueAt: past })],
      [l({ createdAt: twoDaysAgo }), l({ id: "x", createdAt: hoursAgo }), l({ id: "y" })],
      now
    ),
    now
  ),
  "3 enquiries waiting, oldest 2 days. 1 ticket past its due date."
);
check(
  "summary tickets only",
  summarySentence(buildQueue([t(), t({ id: "b" })], [], now), now),
  "2 tickets to pick up."
);
check("ticket link",buildQueue([t()], [], now)[0].href, "/admin/ticket-management?filter=all&view=a");
check("lead link", buildQueue([], [l()], now)[0].href, "/admin/leads-crm?view=a");
check("staff rule matches queue", ticketNeedsStaff({ status: "IN_PROGRESS", slaDueAt: null }, now), false);

if (failures > 0) {
  console.error(`\n  ${failures} of ${total} checks failed.\n`);
  process.exit(1);
}
console.log(`\n  All ${total} dashboard checks passed.\n`);
