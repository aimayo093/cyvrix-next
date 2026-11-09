import "server-only";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { buildAnalystReport } from "@/lib/security-analyst";
import { readScanResult } from "@/lib/security-scan";
import { fillDailySeries, type DayCount } from "./series";
import { londonDayKeys, type RangeDays } from "./time";
import {
  buildQueue,
  OVERDUE_TICKET_STATUSES,
  STAFF_TICKET_STATUSES,
  type QueueItem,
} from "./queue";

/**
 * Data for the admin Today dashboard and the sidebar counts.
 *
 * Every loader returns `{ ok: false }` when it cannot read, and never throws
 * and never substitutes zero: the page shows "—" and says why. Counts come
 * from count/groupBy/SQL, never from loading rows — the pool allows three
 * connections per client (DECISIONS §7).
 */

export type Loaded<T> = { ok: true; data: T } | { ok: false };

async function load<T>(label: string, run: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    console.error(`[dashboard] ${label} could not be read.`, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { ok: false };
  }
}

const CLOSED_LEAD_STATUSES = ["WON", "LOST", "ARCHIVED"] as const;

/** End of today in London, as an instant, for "follow-up due today or earlier". */
function endOfLondonToday(now: Date): Date {
  const todayKey = londonDayKeys(7, now).at(-1) as string;
  // 23:59:59.999 London is at most 01:00 UTC the next day; the queue rule
  // compares London dates exactly, so this only needs to be generous.
  return new Date(Date.parse(`${todayKey}T23:59:59.999Z`) + 3_600_000);
}

export function loadQueue(now: Date): Promise<Loaded<QueueItem[]>> {
  return load("Work queue", async () => {
    const [tickets, leads] = await Promise.all([
      prisma.ticket.findMany({
        where: { status: { in: [...OVERDUE_TICKET_STATUSES] } },
        select: { id: true, ticketNumber: true, subject: true, company: true, status: true, slaDueAt: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
      prisma.lead.findMany({
        where: {
          OR: [
            { status: "NEW" },
            { followUpDate: { lte: endOfLondonToday(now) }, status: { notIn: [...CLOSED_LEAD_STATUSES] } },
          ],
        },
        select: { id: true, name: true, company: true, source: true, status: true, followUpDate: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
    ]);
    return buildQueue(tickets, leads, now);
  });
}

export type NavCounts = { enquiries: number; tickets: number; overdueTickets: number };

export function loadNavCounts(now: Date): Promise<Loaded<NavCounts>> {
  return load("Sidebar counts", async () => {
    const overdueWhere = { status: { in: [...OVERDUE_TICKET_STATUSES] }, slaDueAt: { lt: now } };
    const [enquiries, staffTickets, overdueTickets, overdueInProgress] = await Promise.all([
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.ticket.count({ where: { status: { in: [...STAFF_TICKET_STATUSES] } } }),
      prisma.ticket.count({ where: overdueWhere }),
      prisma.ticket.count({ where: { status: "IN_PROGRESS", slaDueAt: { lt: now } } }),
    ]);
    // Queue tickets = new/open/escalated, plus in-progress ones once overdue.
    return { enquiries, tickets: staffTickets + overdueInProgress, overdueTickets };
  });
}

/** Tables a per-day series may be drawn from. A fixed map, never input. */
const SERIES_TABLES = {
  Lead: Prisma.raw('"public"."Lead"'),
  Ticket: Prisma.raw('"public"."Ticket"'),
  NewsletterSubscriber: Prisma.raw('"public"."NewsletterSubscriber"'),
} as const;

export async function loadDailyCounts(
  table: keyof typeof SERIES_TABLES,
  keys: string[]
): Promise<{ day: string; count: bigint }[]> {
  // A day before the first key, so London's offset cannot drop early rows.
  const since = new Date(Date.parse(`${keys[0]}T00:00:00Z`) - 86_400_000);
  return prisma.$queryRaw<{ day: string; count: bigint }[]>`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS day,
           count(*) AS count
    FROM ${SERIES_TABLES[table]}
    WHERE "createdAt" >= ${since}
    GROUP BY 1`;
}

export type TileData = {
  enquiries: { total: number; daily: DayCount[] };
  openTickets: { now: number; daily: DayCount[] };
  newsletter: { now: number; daily: DayCount[] };
  security: { score: number | null; history: number[] };
};

export function loadTiles(range: RangeDays, now: Date): Promise<Loaded<TileData>> {
  return load("Dashboard figures", async () => {
    const keys = londonDayKeys(range, now);
    const since = new Date(Date.parse(`${keys[0]}T00:00:00Z`) - 86_400_000);
    const [leadRows, ticketRows, subscriberRows, openTickets, subscribers, scans] = await Promise.all([
      loadDailyCounts("Lead", keys),
      loadDailyCounts("Ticket", keys),
      loadDailyCounts("NewsletterSubscriber", keys),
      prisma.ticket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      prisma.newsletterSubscriber.count({ where: { status: "subscribed" } }),
      prisma.auditLog.findMany({
        where: { action: "SECURITY_SCAN_RUN", createdAt: { gte: since } },
        select: { metadata: true },
        orderBy: { createdAt: "asc" },
        take: 90,
      }),
    ]);
    const enquiryDaily = fillDailySeries(leadRows, keys);
    const history = scans.map((scan) => readScanResult(scan.metadata)?.score).filter((s): s is number => typeof s === "number");
    return {
      enquiries: { total: enquiryDaily.reduce((sum, day) => sum + day.count, 0), daily: enquiryDaily },
      openTickets: { now: openTickets, daily: fillDailySeries(ticketRows, keys) },
      newsletter: { now: subscribers, daily: fillDailySeries(subscriberRows, keys) },
      security: { score: history.at(-1) ?? null, history },
    };
  });
}

export type SecuritySummary = { ranAt: Date; score: number; highestSeverity: string | null };

/** The latest scan, or `data: null` when no scan has run yet. */
export function loadSecuritySummary(): Promise<Loaded<SecuritySummary | null>> {
  return load("Security summary", async () => {
    const latest = await prisma.auditLog.findFirst({
      where: { action: "SECURITY_SCAN_RUN" },
      orderBy: { createdAt: "desc" },
      select: { metadata: true, createdAt: true },
    });
    const result = latest ? readScanResult(latest.metadata) : null;
    if (!latest || !result) return null;
    const report = await buildAnalystReport(result);
    return { ranAt: latest.createdAt, score: result.score, highestSeverity: report.highestSeverity };
  });
}

/** Entity types written by content actions — what "the website changed" means. */
const CONTENT_ENTITY_TYPES = [
  "CmsPage",
  "PageSection",
  "BlogPost",
  "LegalPage",
  "Service",
  "ServicePackage",
  "Industry",
  "CareerJob",
  "SiteSetting",
  "BrandAsset",
  "PartnerLogo",
  "TrustedBusinessLogo",
  "ComplianceCard",
];

async function namesFor(userIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
  return new Map(users.map((user) => [user.id, user.name?.trim() || user.email]));
}

const humanise = (action: string) => {
  const text = action.replace(/[_-]+/g, " ").toLowerCase().trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export type ActivityEntry = { id: string; action: string; who: string; when: Date };

export function loadWebsiteActivity(): Promise<Loaded<{ edits: { what: string; who: string; when: Date }[]; blogDrafts: number }>> {
  return load("Website activity", async () => {
    const [entries, blogDrafts] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityType: { in: CONTENT_ENTITY_TYPES } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { action: true, userId: true, createdAt: true },
      }),
      prisma.blogPost.count({ where: { status: "DRAFT" } }),
    ]);
    const names = await namesFor(entries.map((entry) => entry.userId));
    return {
      edits: entries.map((entry) => ({
        what: humanise(entry.action),
        who: (entry.userId && names.get(entry.userId)) || "System",
        when: entry.createdAt,
      })),
      blogDrafts,
    };
  });
}

export function loadRecentActivity(): Promise<Loaded<ActivityEntry[]>> {
  return load("Recent activity", async () => {
    const entries = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, action: true, userId: true, createdAt: true },
    });
    const names = await namesFor(entries.map((entry) => entry.userId));
    return entries.map((entry) => ({
      id: entry.id,
      action: humanise(entry.action),
      who: (entry.userId && names.get(entry.userId)) || "System",
      when: entry.createdAt,
    }));
  });
}
