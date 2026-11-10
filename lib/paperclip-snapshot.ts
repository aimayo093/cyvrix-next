import "server-only";
import { prisma } from "@/lib/prisma";
import { loadNavCounts, loadQueue, loadSecuritySummary, loadTiles } from "@/lib/dashboard/loaders";
import { getSiteTraffic } from "@/lib/site-traffic";

/**
 * The company at a glance, for Paperclip's CEO agent.
 *
 * Built from the same loaders as the admin Today page, so the agent and the
 * administrator see the same numbers. Anything that could not be read is null,
 * never 0 (DECISIONS section 11): an agent must not plan around a figure that
 * was really a failed query.
 *
 * Counts and titles only. No client contact details: those are in the feed,
 * behind the same read token, for agents that genuinely need them.
 */
export async function buildSnapshot(now = new Date()) {
  const [counts, queue, tiles, security, traffic, drafts] = await Promise.all([
    loadNavCounts(now),
    loadQueue(now),
    loadTiles(30, now),
    loadSecuritySummary(),
    getSiteTraffic(30, now).catch(() => ({ state: "unavailable" as const })),
    prisma.agentDraft
      .groupBy({ by: ["status"], _count: { _all: true } })
      .then((rows) => Object.fromEntries(rows.map((r) => [r.status, r._count._all])))
      .catch(() => null),
  ]);

  return {
    version: 1,
    generatedAt: now.toISOString(),
    work: counts.ok
      ? { openEnquiries: counts.data.enquiries, openTickets: counts.data.tickets, overdueTickets: counts.data.overdueTickets }
      : null,
    queue: queue.ok
      ? queue.data.map((item) => ({ kind: item.kind, title: item.title, detail: item.detail, since: item.since.toISOString() }))
      : null,
    last30Days: tiles.ok
      ? {
          enquiries: tiles.data.enquiries.total,
          newsletterSubscribers: tiles.data.newsletter.now,
          openTickets: tiles.data.openTickets.now,
        }
      : null,
    security: security.ok
      ? security.data
        ? { score: security.data.score, highestSeverity: security.data.highestSeverity, scannedAt: security.data.ranAt.toISOString() }
        : { score: null, highestSeverity: null, scannedAt: null }
      : null,
    website:
      traffic.state === "ok"
        ? {
            visitors30d: traffic.traffic.visitors,
            pageviews30d: traffic.traffic.pageviews,
            topPages: traffic.traffic.topPages?.slice(0, 10) ?? null,
          }
        : { state: traffic.state },
    drafts,
  };
}
