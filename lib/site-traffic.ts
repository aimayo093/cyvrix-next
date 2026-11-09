import "server-only";
import { cacheLife } from "next/cache";
import { londonDayKeys, type RangeDays } from "@/lib/dashboard/time";
import type { DayCount } from "@/lib/dashboard/series";
import { parseCount, parseDaily, parseTopPages } from "@/lib/dashboard/traffic-parse";

/**
 * Website traffic for the admin Today dashboard, from the hosting platform's Web Analytics
 * API. Admin-only: never published, never logged with its token.
 *
 * The destination is fixed here, never taken from a request, and the token
 * only ever leaves in the Authorization header to the API host. Results are
 * cached for an hour per period and day, so the dashboard does not call the
 * analytics API on every load. Setup: DEPLOYMENT.md, #dashboard-analytics.
 */

export type Traffic = {
  visitors: number;
  pageviews: number;
  daily: DayCount[];
  topPages: { path: string; pageviews: number }[];
  availableDays: number;
};

export type TrafficResult = { state: "not_configured" } | { state: "unavailable" } | { state: "ok"; traffic: Traffic };

const API = "https://api.vercel.com/v1/query/web-analytics/visits";
const TIMEOUT_MS = 5_000;

function config() {
  const token = process.env.VERCEL_ANALYTICS_TOKEN?.trim();
  const projectId = (process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID)?.trim();
  if (!token || !projectId) return null;
  return { token, projectId, teamId: process.env.VERCEL_ANALYTICS_TEAM_ID?.trim() || undefined };
}

async function query(path: "count" | "aggregate", params: Record<string, string>): Promise<unknown | null> {
  const settings = config();
  if (!settings) return null;
  const search = new URLSearchParams({ projectId: settings.projectId, ...params });
  if (settings.teamId) search.set("teamId", settings.teamId);

  try {
    const response = await fetch(`${API}/${path}?${search}`, {
      headers: { Authorization: `Bearer ${settings.token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[site-traffic] Analytics request refused.", { endpoint: path, status: response.status });
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("[site-traffic] Analytics request failed.", {
      endpoint: path,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

async function fetchTraffic(range: RangeDays, todayKey: string): Promise<TrafficResult> {
  "use cache";
  cacheLife("hours");

  if (!config()) return { state: "not_configured" };

  const keys = londonDayKeys(range, new Date(`${todayKey}T12:00:00Z`));
  const window = { since: keys[0], until: keys[keys.length - 1] };

  const [dailyJson, countJson, pagesJson] = await Promise.all([
    query("aggregate", { ...window, by: "day", limit: "100" }),
    query("count", window),
    query("aggregate", { ...window, by: "requestPath", limit: "5" }),
  ]);

  const daily = parseDaily(dailyJson, keys);
  const totals = parseCount(countJson);
  if (!daily || !totals) return { state: "unavailable" };

  return {
    state: "ok",
    traffic: {
      visitors: totals.visitors,
      pageviews: totals.pageviews,
      daily: daily.daily,
      topPages: parseTopPages(pagesJson) ?? [],
      availableDays: daily.availableDays,
    },
  };
}

/**
 * Traffic for the period ending today (London). `now` is passed in because a
 * cached function cannot read the clock without freezing it into the cache.
 */
export async function getSiteTraffic(range: RangeDays, now: Date): Promise<TrafficResult> {
  const keys = londonDayKeys(range, now);
  return fetchTraffic(range, keys[keys.length - 1]);
}
