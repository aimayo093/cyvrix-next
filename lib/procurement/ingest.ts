import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { canonicalJson } from "./approval-core";
import {
  defaultFetchJson,
  FeedError,
  fetchFtsPage,
  fetchProactisMonth,
  ftsFirstUrl,
  PROACTIS_NOTICE_TYPES,
  type FetchJson,
} from "./feeds";
import { crossSourceKey, isRelevant, normalise, withoutContactPoints, type NormalisedNotice, type OcdsRelease } from "./ocds";
import { rangesAgree } from "./ingest-rules";
import { initialStatus } from "./lifecycle";
import { audit } from "./service";

/**
 * Pulls the official feeds into the CRM (docs/procurement/02-design.md §2.1).
 *
 * - Only IT-relevant notices are kept (ocds.isRelevant); the rest are counted.
 * - The raw release is stored once, contact points removed, keyed by
 *   (source, ocid, release id) and hashed.
 * - One opportunity per OCID. A copy of the same tender on another portal is
 *   added to the first as evidence, never stored twice.
 * - Buyer contact points are stored as Contacts on the buyer organisation
 *   (founder decision D12, 15 Nov 2026). They are personal data: they never
 *   leave the admin.
 * - A run is claimed per source, so two runs of one source never overlap, and
 *   every run is recorded as an IngestionRun with counts and any error.
 */

export const OFFICIAL_SOURCES = ["fts", "pcs", "s2w"] as const;
export type OfficialSource = (typeof OFFICIAL_SOURCES)[number];

export type RunResult = {
  source: OfficialSource;
  status: "succeeded" | "failed" | "retry" | "skipped";
  fetched: number;
  relevant: number;
  created: number;
  updated: number;
  merged: number;
  contacts: number;
  detail?: string;
};

type Counts = Omit<RunResult, "source" | "status" | "detail">;

const STALE_RUN_MS = 15 * 60_000;
const FTS_MAX_PAGES = 20;
const EARLY_STATUSES = ["Discovered", "Validated", "TargetIdentified", "Researching"];

/** The `updatedTo` a Find a Tender page link carries (UTC), if any. */
function updatedToOf(url: string): Date | null {
  try {
    const v = new URL(url).searchParams.get("updatedTo");
    if (!v || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) return null;
    return new Date(`${v}Z`);
  } catch {
    return null;
  }
}

const sha256 = (value: unknown) => crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");

async function findOrCreateBuyer(tx: Prisma.TransactionClient, name: string): Promise<string> {
  const existing = await tx.organisation.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true, categories: true } });
  if (existing) {
    if (!existing.categories.includes("buyer")) {
      await tx.organisation.update({ where: { id: existing.id }, data: { categories: { push: "buyer" } } });
    }
    return existing.id;
  }
  const id = crypto.randomUUID();
  await tx.organisation.create({ data: { id, name, categories: ["buyer"], priority: 3, notes: "Created from an official tender notice" } });
  return id;
}

/** Stores one relevant release. Returns what changed. */
async function ingestOne(sourceKey: OfficialSource, runId: string, release: OcdsRelease, notice: NormalisedNotice, why: string) {
  return prisma.$transaction(async (tx) => {
    const seen = await tx.procurementNotice.findUnique({
      where: { sourceKey_ocid_releaseId: { sourceKey, ocid: notice.ocid, releaseId: notice.releaseId } },
      select: { id: true },
    });
    if (seen) return { created: 0, updated: 0, merged: 0, contacts: 0, stored: false };

    const raw = withoutContactPoints(release);
    await tx.procurementNotice.create({
      data: {
        id: crypto.randomUUID(),
        sourceKey,
        ocid: notice.ocid,
        releaseId: notice.releaseId,
        noticeId: sourceKey === "fts" ? notice.releaseId : null,
        stage: "tender",
        sha256: sha256(raw),
        raw: raw as Prisma.InputJsonValue,
        runId,
      },
    });

    const buyerId = notice.buyerName ? await findOrCreateBuyer(tx, notice.buyerName) : null;
    const evidence = {
      id: crypto.randomUUID(),
      kind: "notice",
      url: notice.noticeUrl,
      quote: notice.noticeUrl ? null : `${sourceKey} notice ${notice.releaseId}`,
      retrievedAt: new Date(),
    };
    let created = 0;
    let updated = 0;
    let merged = 0;

    // The opportunity this notice belongs to: by OCID, or (for a copy already
    // matched to another portal's record) by the copy's stable notice link.
    let existing = await tx.opportunity.findFirst({ where: { ocid: notice.ocid }, select: { id: true, status: true } });
    if (!existing && notice.noticeUrl && notice.noticeUrl.includes(notice.ocid)) {
      const linked = await tx.opportunityEvidence.findFirst({ where: { url: notice.noticeUrl }, select: { Opportunity: { select: { id: true, status: true } } } });
      existing = linked?.Opportunity ?? null;
    }
    if (existing) {
      // A newer release of a tender already recorded: keep its facts current
      // while nobody is working on it yet, never blanking a value the new
      // release leaves out; always keep the new notice as evidence.
      if (EARLY_STATUSES.includes(existing.status)) {
        await tx.opportunity.update({
          where: { id: existing.id },
          data: {
            title: notice.title,
            ...(notice.summary !== null ? { summary: notice.summary } : {}),
            ...(notice.deadlineAt !== null ? { deadlineAt: notice.deadlineAt } : {}),
            ...(notice.clarificationDeadlineAt !== null ? { clarificationDeadlineAt: notice.clarificationDeadlineAt } : {}),
            ...(notice.valueMin !== null ? { valueMin: notice.valueMin } : {}),
            ...(notice.valueMax !== null ? { valueMax: notice.valueMax } : {}),
            ...(notice.cpv.length ? { cpv: notice.cpv } : {}),
          },
        });
      } else {
        await tx.opportunity.update({ where: { id: existing.id }, data: { updatedAt: new Date() } });
      }
      await tx.opportunityEvidence.create({ data: { ...evidence, opportunityId: existing.id } });
      await audit(tx, null, "opportunity.notice_updated", "Opportunity", existing.id, { source: sourceKey, releaseId: notice.releaseId });
      updated = 1;
    } else {
      // The same tender published on another portal: same buyer, title and
      // deadline day, a different source, and no conflicting value. Two notices
      // from the same portal are never merged, whatever their titles.
      const key = crossSourceKey(notice);
      let twin: string | null = null;
      if (key && buyerId && notice.deadlineAt) {
        const day = notice.deadlineAt.toISOString().slice(0, 10);
        const candidates = await tx.opportunity.findMany({
          where: {
            buyerOrganisationId: buyerId,
            origin: { not: sourceKey },
            deadlineAt: { gte: new Date(`${day}T00:00:00Z`), lt: new Date(new Date(`${day}T00:00:00Z`).getTime() + 86_400_000) },
          },
          select: { id: true, title: true, deadlineAt: true, valueMin: true, valueMax: true },
        });
        twin =
          candidates.find((c) => {
            if (crossSourceKey({ buyerName: notice.buyerName, title: c.title, deadlineAt: c.deadlineAt }) !== key) return false;
            const num = (v: { toString(): string } | null) => (v === null ? null : Number(v.toString()));
            return rangesAgree({ valueMin: num(c.valueMin), valueMax: num(c.valueMax) }, notice);
          })?.id ?? null;
      }
      if (twin) {
        await tx.opportunityEvidence.create({ data: { ...evidence, opportunityId: twin } });
        // Agents page on updatedAt, so the new link must move the record.
        await tx.opportunity.update({ where: { id: twin }, data: { updatedAt: new Date() } });
        await audit(tx, null, "opportunity.duplicate_merged", "Opportunity", twin, { source: sourceKey, ocid: notice.ocid });
        merged = 1;
      } else {
        const id = crypto.randomUUID();
        await tx.opportunity.create({
          data: {
            id,
            kind: "tender",
            status: initialStatus("tender"),
            title: notice.title,
            summary: notice.summary,
            buyerOrganisationId: buyerId,
            origin: sourceKey,
            ocid: notice.ocid,
            deadlineAt: notice.deadlineAt,
            clarificationDeadlineAt: notice.clarificationDeadlineAt,
            valueMin: notice.valueMin,
            valueMax: notice.valueMax,
            currency: notice.currency,
            region: notice.regions.join(", ").slice(0, 100) || null,
            cpv: notice.cpv,
            confirmedBuying: true,
            Evidence: { create: evidence },
          },
        });
        await audit(tx, null, "opportunity.created", "Opportunity", id, { source: sourceKey, ocid: notice.ocid, why });
        created = 1;
      }
    }

    // Buyer contact points (D12). Kept on the organisation, deduplicated by email.
    let contacts = 0;
    if (buyerId) {
      for (const c of notice.contacts) {
        if (!c.email) continue;
        const exists = await tx.contact.findFirst({ where: { organisationId: buyerId, email: c.email }, select: { id: true } });
        if (exists) continue;
        await tx.contact.create({
          data: {
            id: crypto.randomUUID(),
            organisationId: buyerId,
            name: (c.name ?? "Procurement contact").slice(0, 200),
            email: c.email.slice(0, 254),
            phone: c.telephone?.slice(0, 50) ?? null,
            role: "Buyer contact from a published notice",
          },
        });
        contacts += 1;
      }
    }
    return { created, updated, merged, contacts, stored: true };
  });
}

async function ingestPage(sourceKey: OfficialSource, runId: string, releases: OcdsRelease[], counts: Counts, errors: string[]) {
  counts.fetched += releases.length;
  for (const release of releases) {
    if (!release.tag?.includes("tender")) continue;
    const { relevant, why } = isRelevant(release);
    if (!relevant) continue;
    const notice = normalise(sourceKey, release);
    counts.relevant += 1;
    if (!notice) {
      // IT-relevant but missing an OCID, a release id or a title: recorded, not dropped silently.
      errors.push(`${release.ocid ?? "no ocid"}: unreadable notice`);
      continue;
    }
    try {
      const r = await ingestOne(sourceKey, runId, release, notice, why ?? "");
      counts.created += r.created;
      counts.updated += r.updated;
      counts.merged += r.merged;
      counts.contacts += r.contacts;
    } catch (error) {
      // One bad notice must not stop the rest; it is recorded on the run.
      const message = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error ? error.name : "error";
      errors.push(`${notice.ocid}: ${message}`);
    }
  }
}

/** Runs one source now. Safe to call from the cron or the founder's "Run now". */
export async function runSource(
  sourceKey: OfficialSource,
  options: { trigger: "cron" | "manual"; userId?: string | null; fetchJson?: FetchJson; now?: Date; budgetMs?: number } = { trigger: "cron" }
): Promise<RunResult> {
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  const now = options.now ?? new Date();
  const deadline = Date.now() + (options.budgetMs ?? 45_000);
  const counts: Counts = { fetched: 0, relevant: 0, created: 0, updated: 0, merged: 0, contacts: 0 };
  const source = await prisma.opportunitySource.findUnique({ where: { key: sourceKey } });
  if (!source) return { source: sourceKey, status: "skipped", ...counts, detail: "Unknown source." };
  // A switched-off feed is never read, by the cron or by hand: reading it stores buyer contacts.
  if (!source.enabled) return { source: sourceKey, status: "skipped", ...counts, detail: "This feed is switched off. Switch it on first." };

  // Claim the source: refuse if a run started recently and has not finished.
  const runId = crypto.randomUUID();
  const claimed = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "public"."OpportunitySource" WHERE "key" = ${sourceKey} FOR UPDATE`;
    const running = await tx.ingestionRun.findFirst({
      where: { sourceKey, status: "running", startedAt: { gt: new Date(now.getTime() - STALE_RUN_MS) } },
      select: { id: true },
    });
    if (running) return false;
    await tx.ingestionRun.create({ data: { id: runId, sourceKey, status: "running", startedById: options.userId ?? null } });
    await tx.opportunitySource.update({ where: { key: sourceKey }, data: { lastRunAt: now } });
    return true;
  });
  if (!claimed) return { source: sourceKey, status: "skipped", ...counts, detail: "A run of this source is already in progress." };

  const errors: string[] = [];
  let status: RunResult["status"] = "succeeded";
  let detail: string | undefined;
  let nextCursor: string | null = null;
  let errorClass: string | null = null;
  // The end of the time window the current Find a Tender page chain covers.
  let chainUpto: Date | null = null;

  try {
    if (sourceKey === "fts") {
      // Resume an unfinished page chain, or start from the last success (or two days back).
      const since = source.lastSuccessAt ?? new Date(now.getTime() - 2 * 86_400_000);
      // The API's timestamps carry no zone (UK time in summer is UTC+1), so each
      // window overlaps the last by two hours. Re-reading is harmless: a stored
      // notice is skipped. Missing one would not be.
      const from = new Date(since.getTime() - 2 * 3_600_000);
      let url: string | null = source.cursor?.startsWith("https://www.find-tender.service.gov.uk/") ? source.cursor : ftsFirstUrl(from);
      let pages = 0;
      while (url && pages < FTS_MAX_PAGES && Date.now() < deadline) {
        chainUpto = updatedToOf(url) ?? chainUpto;
        const page = await fetchFtsPage(url, fetchJson);
        await ingestPage(sourceKey, runId, page.releases, counts, errors);
        url = page.next;
        if (url) chainUpto = updatedToOf(url) ?? chainUpto;
        pages += 1;
      }
      nextCursor = url; // non-null: more pages remain for the next run
    } else {
      const months = [new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))];
      // Early in a month, also read the previous one so nothing at the boundary is missed.
      if (now.getUTCDate() <= 3) months.unshift(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
      for (const month of months) {
        for (const type of PROACTIS_NOTICE_TYPES) {
          if (Date.now() >= deadline) break;
          const page = await fetchProactisMonth(sourceKey, month, type, fetchJson);
          await ingestPage(sourceKey, runId, page.releases, counts, errors);
        }
      }
    }
  } catch (error) {
    if (error instanceof FeedError) {
      status = error.failure.kind === "rate_limited" || error.failure.kind === "unavailable" ? "retry" : "failed";
      errorClass = error.failure.kind;
      detail = error.failure.detail;
    } else {
      status = "failed";
      errorClass = "internal";
      detail = error instanceof Error ? error.name : "error";
    }
  }
  if (status === "succeeded" && errors.length) detail = `${errors.length} notice(s) could not be stored: ${errors.slice(0, 5).join("; ")}`;

  const finished = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.ingestionRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: finished,
        fetched: counts.fetched,
        created: counts.created,
        updated: counts.updated + counts.merged,
        errorClass,
        errorDetail: detail?.slice(0, 2000) ?? null,
      },
    });
    await tx.opportunitySource.update({
      where: { key: sourceKey },
      data:
        status === "succeeded"
          ? errors.length
            ? // Some notices were not stored: keep the old checkpoint, so the next
              // run reads the same window again. Stored notices are skipped then;
              // the failed ones are retried.
              { cursor: null, health: "degraded" }
            : {
                // Next window starts where this chain's window ended (or when this run began).
                lastSuccessAt: nextCursor ? source.lastSuccessAt : (chainUpto ?? now),
                cursor: nextCursor,
                health: "ok",
              }
          : status === "retry"
            ? { health: "degraded" }
            : // A hard failure clears any saved page link, so a bad link cannot keep the source stuck.
              { health: "failing", cursor: null },
    });
    await audit(tx, options.userId ?? null, "procurement.sync", "IngestionRun", runId, { source: sourceKey, trigger: options.trigger, status, ...counts });
  });

  return { source: sourceKey, status, ...counts, detail };
}
