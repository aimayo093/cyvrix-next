/**
 * Parsers for Vercel Web Analytics API responses.
 *
 * Every parser returns null for anything that is not the documented shape, so
 * an error body, a changed API or a proxy page can never become a figure on
 * the dashboard. Documented at
 * https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views.
 */
import { fillDailySeries, type DayCount } from "./series";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * `visits/aggregate?by=day` → visitors per day, filled to `keys`.
 *
 * `visitors` and `pageviews` here are sums of daily figures. Summed daily
 * uniques overcount anyone who came on two days, so the headline visitor
 * figure comes from `parseCount` instead; these totals are for the series.
 */
export function parseDaily(
  json: unknown,
  keys: string[]
): { daily: DayCount[]; visitors: number; pageviews: number; availableDays: number } | null {
  if (!isRecord(json) || !Array.isArray(json.data)) return null;

  const rows: { day: string; count: number }[] = [];
  let visitors = 0;
  let pageviews = 0;
  for (const row of json.data) {
    if (!isRecord(row) || typeof row.timestamp !== "string" || !isCount(row.visitors) || !isCount(row.pageviews)) {
      return null;
    }
    const day = row.timestamp.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    rows.push({ day, count: row.visitors });
    visitors += row.visitors;
    pageviews += row.pageviews;
  }

  const today = keys.at(-1);
  const earliest = rows.map((row) => row.day).sort()[0];
  const availableDays =
    earliest && today
      ? Math.min(keys.length, Math.round((Date.parse(today) - Date.parse(earliest)) / 86_400_000) + 1)
      : keys.length;

  return { daily: fillDailySeries(rows, keys), visitors, pageviews, availableDays };
}

/** `visits/count` → unique visitors and page views across the whole period. */
export function parseCount(json: unknown): { pageviews: number; visitors: number } | null {
  if (!isRecord(json) || !isRecord(json.data)) return null;
  const { pageviews, visitors } = json.data;
  return isCount(pageviews) && isCount(visitors) ? { pageviews, visitors } : null;
}

/** `visits/aggregate?by=requestPath` → the top pages, without Vercel's "Others" bucket. */
export function parseTopPages(json: unknown): { path: string; pageviews: number }[] | null {
  if (!isRecord(json) || !Array.isArray(json.data)) return null;
  const pages: { path: string; pageviews: number }[] = [];
  for (const row of json.data) {
    if (!isRecord(row) || typeof row.requestPath !== "string" || !isCount(row.pageviews)) return null;
    if (row.requestPath === "Others") continue;
    pages.push({ path: row.requestPath, pageviews: row.pageviews });
  }
  return pages;
}
