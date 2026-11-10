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
import fs from "node:fs";
import path from "node:path";
import { ADMIN_NAV, activeNavItem } from "../lib/admin-nav";
import { ageLabel, greeting, londonDayKey, londonDayKeys, parseRange } from "../lib/dashboard/time";
import { fillDailySeries, scoreHistory, seriesTotal, sparklinePoints } from "../lib/dashboard/series";
import { canManageSecurityCenter } from "../lib/roles";
import {
  buildQueue,
  summarySentence,
  ticketNeedsStaff,
  type QueueLead,
  type QueueTicket,
} from "../lib/dashboard/queue";
import { parseCount, parseDaily, parseTopPages, trafficCacheProfile } from "../lib/dashboard/traffic-parse";

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
check("fill gaps", fillDailySeries([{ day: "2026-11-08", count: BigInt(2) }], k), [
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

// ── Vercel Web Analytics parsing ───────────────────────────────────────────
const trafficKeys = londonDayKeys(30, new Date("2026-11-09T10:00:00Z"));
const daily = parseDaily(
  {
    version: 1,
    data: [
      { timestamp: "2026-11-08T00:00:00.000Z", pageviews: 220, visitors: 180 },
      { timestamp: "2026-11-09T00:00:00.000Z", pageviews: 30, visitors: 20 },
    ],
  },
  trafficKeys
);
check("daily visitors", daily?.visitors, 200);
check("daily pageviews", daily?.pageviews, 250);
// Data starts on 8 Nov, so the series covers 8–9 Nov only (see review 3 below).
check("daily covers available days", daily?.daily.length, 2);
check("daily value lands on its day", daily?.daily.find((d) => d.day === "2026-11-08")?.count, 180);
check("error payload", parseDaily({ error: { code: "forbidden" } }, trafficKeys), null);
check("data not array", parseDaily({ data: { pageviews: 3 } }, trafficKeys), null);
check(
  "available days",
  parseDaily({ data: [{ timestamp: "2026-10-31T00:00:00.000Z", pageviews: 1, visitors: 1 }] }, trafficKeys)?.availableDays,
  10
);
check(
  "top pages drop Others",
  parseTopPages({
    data: [
      { requestPath: "/", pageviews: 50, visitors: 40 },
      { requestPath: "Others", pageviews: 9, visitors: 9 },
    ],
  }),
  [{ path: "/", pageviews: 50 }]
);
check("count", parseCount({ version: 1, data: { pageviews: 1250, visitors: 980 } }), { pageviews: 1250, visitors: 980 });
check("count bad shape", parseCount({ data: [] }), null);
check("top pages bad shape",parseTopPages({ data: [{ pageviews: 1 }] }), null);

// ── Final review fixes ─────────────────────────────────────────────────────
// Review 1: the newest scan is the "latest", whatever the window holds.
check("score history oldest first", scoreHistory([95, undefined, 90, 80]), [80, 90, 95]);
// Review 2: only roles that can open the Security Centre see its posture.
check("security posture for admin", canManageSecurityCenter("ADMIN"), true);
check("no security posture for content manager", canManageSecurityCenter("CONTENT_MANAGER"), false);
check("no security posture for finance viewer", canManageSecurityCenter("FINANCE_VIEWER"), false);
// Review 3: days the analytics provider has no data for are not drawn as zero.
const shortHistory = parseDaily(
  { data: [{ timestamp: "2026-10-31T00:00:00.000Z", pageviews: 1, visitors: 1 }] },
  trafficKeys
);
check("short history series covers only available days", shortHistory?.daily.length, 10);
check("short history series starts at first available day", shortHistory?.daily[0]?.day, "2026-10-31");
const noHistory = parseDaily({ data: [] }, trafficKeys);
check("no data yet: no available days", noHistory?.availableDays, 0);
check("no data yet: no series", noHistory?.daily, []);
// Review 4: a failed call is cached briefly, a good one for the hour.
check("unavailable cached for minutes", trafficCacheProfile({ state: "unavailable" }), "minutes");
check("ok cached for hours", trafficCacheProfile({ state: "ok" }), "hours");
check("not configured cached for minutes", trafficCacheProfile({ state: "not_configured" }), "minutes");

// ── Admin navigation ───────────────────────────────────────────────────────
const allNavHrefs = () => ADMIN_NAV.flatMap((group) => [...group.primary, ...(group.more ?? [])].map((item) => item.href));
const missingAdminPages = () => {
  const dir = path.join(process.cwd(), "app", "admin");
  const pages = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("[") && fs.existsSync(path.join(dir, entry.name, "page.tsx")))
    .map((entry) => `/admin/${entry.name}`);
  const linked = new Set(allNavHrefs());
  return ["/admin", ...pages].filter((href) => !linked.has(href)).sort();
};
check("every admin page in nav once", allNavHrefs().length, new Set(allNavHrefs()).size);
check("nav covers all pages", missingAdminPages(), []);
check("active exact", activeNavItem("/admin")?.name, "Today");
check("active prefix", activeNavItem("/admin/leads-crm")?.name, "Enquiries");
check("dashboard not prefix of all", activeNavItem("/admin/unknown"), null);

// Review follow-ups.
check("an impossible calendar date is rejected", parseDaily({ data: [{ timestamp: "2026-13-01T00:00:00Z", visitors: 1, pageviews: 1 }] }, ["2026-11-10"]), null);
{
  const { parsePage, lastPageFor } = await import("../components/admin/AdminPager");
  check("page 2junk is page 1", parsePage("2junk"), 1);
  check("page 0 is page 1", parsePage("0"), 1);
  check("page 3 is page 3", parsePage("3"), 3);
  check("last page of 100 at 50", lastPageFor(100), 2);
  check("last page of none is 1", lastPageFor(0), 1);
}

if (failures > 0) {
  console.error(`\n  ${failures} of ${total} checks failed.\n`);
  process.exit(1);
}
console.log(`\n  All ${total} dashboard checks passed.\n`);
