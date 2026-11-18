import "server-only";
import type { OcdsRelease } from "./ocds";

/**
 * Fetchers for the official OCDS feeds (docs/procurement/01-assessment.md §4).
 * Each returns releases page by page; the caller decides what to keep.
 *
 * Polite by design: one request at a time, a 20-second timeout per request,
 * and a stop on 429/503 that reports `Retry-After` instead of retrying in a loop.
 */

export type FeedPage = { releases: OcdsRelease[]; next: string | null };
export type FeedFailure = { kind: "rate_limited" | "unavailable" | "bad_response" | "network"; detail: string; retryAfterSeconds?: number };
export class FeedError extends Error {
  constructor(public failure: FeedFailure) {
    super(failure.detail);
  }
}

export type FetchJson = (url: string) => Promise<{ status: number; retryAfter: string | null; body: unknown }>;

const USER_AGENT = "CYVRIX procurement sync (+https://cyvrix.co.uk)";

export const defaultFetchJson: FetchJson = async (url) => {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new FeedError({ kind: "network", detail: error instanceof Error ? error.name : "request failed" });
  }
  let body: unknown = null;
  if (res.ok) {
    try {
      body = await res.json();
    } catch {
      throw new FeedError({ kind: "bad_response", detail: "The feed did not return JSON." });
    }
  }
  return { status: res.status, retryAfter: res.headers.get("retry-after"), body };
};

function check(status: number, retryAfter: string | null, source: string) {
  if (status === 429 || status === 503) {
    const seconds = Number(retryAfter);
    throw new FeedError({
      kind: status === 429 ? "rate_limited" : "unavailable",
      detail: `${source} answered ${status}${retryAfter ? `; retry after ${retryAfter}s` : ""}.`,
      retryAfterSeconds: Number.isFinite(seconds) ? seconds : undefined,
    });
  }
  if (status < 200 || status >= 300) throw new FeedError({ kind: "unavailable", detail: `${source} answered ${status}.` });
}

function releasesOf(body: unknown, source: string): OcdsRelease[] {
  const releases = (body as { releases?: unknown })?.releases;
  if (!Array.isArray(releases)) throw new FeedError({ kind: "bad_response", detail: `${source} returned no releases list.` });
  return releases as OcdsRelease[];
}

const FTS_BASE = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";

/** Find a Tender: tender-stage releases updated since `since`, following `links.next`. */
export function ftsFirstUrl(since: Date): string {
  const from = since.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS, as the API expects
  return `${FTS_BASE}?stages=tender&limit=100&updatedFrom=${encodeURIComponent(from)}`;
}

export async function fetchFtsPage(url: string, fetchJson: FetchJson): Promise<FeedPage> {
  if (!url.startsWith(`${FTS_BASE}?`)) throw new FeedError({ kind: "bad_response", detail: "Refusing a Find a Tender link to another address." });
  const { status, retryAfter, body } = await fetchJson(url);
  check(status, retryAfter, "Find a Tender");
  const next = (body as { links?: { next?: unknown } })?.links?.next;
  return {
    releases: releasesOf(body, "Find a Tender"),
    // Only ever follow a next link on the same endpoint (no redirection elsewhere).
    next: typeof next === "string" && next.startsWith(`${FTS_BASE}?`) ? next : null,
  };
}

/**
 * Public Contracts Scotland and Sell2Wales share the same OCDS Web API: one
 * month of notices per call, by notice type. Type 2 is the contract notice.
 * Other types (below-threshold and Procurement Act notices) are to be checked
 * against each portal's documentation before they are added.
 */
export const PROACTIS_APIS = {
  pcs: { name: "Public Contracts Scotland", base: "https://api.publiccontractsscotland.gov.uk/v1/Notices" },
  s2w: { name: "Sell2Wales", base: "https://api.sell2wales.gov.wales/v1/Notices" },
} as const;
export const PROACTIS_NOTICE_TYPES = [2] as const;

export function proactisUrl(key: keyof typeof PROACTIS_APIS, month: Date, noticeType: number): string {
  const mm = String(month.getUTCMonth() + 1).padStart(2, "0");
  return `${PROACTIS_APIS[key].base}?dateFrom=${mm}-${month.getUTCFullYear()}&noticeType=${noticeType}&outputType=0`;
}

export async function fetchProactisMonth(key: keyof typeof PROACTIS_APIS, month: Date, noticeType: number, fetchJson: FetchJson): Promise<FeedPage> {
  const { status, retryAfter, body } = await fetchJson(proactisUrl(key, month, noticeType));
  check(status, retryAfter, PROACTIS_APIS[key].name);
  return { releases: releasesOf(body, PROACTIS_APIS[key].name), next: null };
}
