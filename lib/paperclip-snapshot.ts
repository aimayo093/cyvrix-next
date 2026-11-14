import "server-only";
import { prisma } from "@/lib/prisma";
import { loadNavCounts, loadQueue, loadSecuritySummary, loadTiles } from "@/lib/dashboard/loaders";
import { getSiteTraffic } from "@/lib/site-traffic";
import { publicTopPages } from "@/lib/paperclip-snapshot-core";

/**
 * The company at a glance, for Paperclip's CEO agent.
 *
 * Built from the same loaders as the admin Today page, so the agent and the
 * administrator see the same numbers. Anything that could not be read is null,
 * never 0 (DECISIONS section 11): an agent must not plan around a figure that
 * was really a failed query.
 *
 * No personal data: counts, kinds and ages only. Queue items carry no name,
 * company, subject or ticket number, because agents may run on a model
 * provider outside the UK (DeepSeek processes data in China) and there is no
 * lawful basis to send personal data there. Names live only in the feed,
 * which must not be given to such agents (DECISIONS section 15).
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
      ? queue.data.map((item) => ({ kind: item.kind, since: item.since.toISOString() }))
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
            topPages: traffic.traffic.topPages ? publicTopPages(traffic.traffic.topPages) : null,
          }
        : { state: traffic.state },
    drafts,
  };
}
