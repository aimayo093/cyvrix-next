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

/**
 * Why a request never got a response, without the message (which can carry
 * the address): the error's name and, for a failed connection, the system
 * code that says which kind (ECONNRESET, ENOTFOUND, UND_ERR_CONNECT_TIMEOUT…).
 */
export function networkDetail(error: unknown): string {
  if (!(error instanceof Error)) return "request failed";
  const code = (error as { cause?: { code?: unknown } }).cause?.code;
  return typeof code === "string" && /^[A-Z0-9_]{2,40}$/.test(code) ? `${error.name} (${code})` : error.name;
}

export const defaultFetchJson: FetchJson = async (url) => {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new FeedError({ kind: "network", detail: networkDetail(error) });
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
  if (status === 429 || status >= 500) {
    // A missing Retry-After stays undefined (Number(null) would read as 0).
    const seconds = retryAfter === null ? NaN : Number(retryAfter);
    throw new FeedError({
      kind: status === 429 ? "rate_limited" : "unavailable",
      detail: `${source} answered ${status}${retryAfter ? `; retry after ${retryAfter}s` : ""}.`,
      retryAfterSeconds: Number.isFinite(seconds) ? seconds : undefined,
    });
  }
  // Any other non-2xx (400, 401, 404…) will not fix itself by retrying.
  if (status < 200 || status >= 300) throw new FeedError({ kind: "bad_response", detail: `${source} answered ${status}.` });
}

function releasesOf(body: unknown, source: string): OcdsRelease[] {
  const releases = (body as { releases?: unknown })?.releases;
  if (!Array.isArray(releases)) throw new FeedError({ kind: "bad_response", detail: `${source} returned no releases list.` });
  return releases as OcdsRelease[];
}

export const FTS_BASE = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";

/** Find a Tender: tender-stage releases updated since `since`, following `links.next`. */
export function ftsFirstUrl(since: Date): string {
  const from = since.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS, as the API expects
  return `${FTS_BASE}?stages=tender&limit=100&updatedFrom=${encodeURIComponent(from)}`;
}

export async function fetchFtsPage(url: string, fetchJson: FetchJson): Promise<FeedPage> {
  return fetchPackagePage(url, FTS_BASE, "Find a Tender", fetchJson);
}

/**
 * Contracts Finder (England, including contracts below the Find a Tender
 * thresholds): its open OCDS search, tender-stage releases published since
 * `since`, following `links.next`. No key needed.
 */
export const CF_BASE = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search";

export function cfFirstUrl(since: Date): string {
  const from = since.toISOString().slice(0, 19);
  return `${CF_BASE}?stages=tender&limit=100&publishedFrom=${encodeURIComponent(from)}`;
}

export async function fetchCfPage(url: string, fetchJson: FetchJson): Promise<FeedPage> {
  return fetchPackagePage(url, CF_BASE, "Contracts Finder", fetchJson);
}

/** One page of an OCDS release package that pages through `links.next`. */
async function fetchPackagePage(url: string, base: string, source: string, fetchJson: FetchJson): Promise<FeedPage> {
  if (!url.startsWith(`${base}?`)) throw new FeedError({ kind: "bad_response", detail: `Refusing a ${source} link to another address.` });
  const { status, retryAfter, body } = await fetchJson(url);
  check(status, retryAfter, source);
  const next = (body as { links?: { next?: unknown } })?.links?.next;
  // Only ever follow a next link on the same endpoint. A next link elsewhere is
  // an error, not the end of the list: stopping quietly would skip releases.
  if (next !== undefined && next !== null && !(typeof next === "string" && next.startsWith(`${base}?`))) {
    throw new FeedError({ kind: "bad_response", detail: `${source} returned a next-page link to another address.` });
  }
  return { releases: releasesOf(body, source), next: typeof next === "string" ? next : null };
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
