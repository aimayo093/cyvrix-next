import "server-only";
import * as React from "react";
import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageSecurityCenter } from "@/lib/roles";
import { loadQueue, loadTiles } from "@/lib/dashboard/loaders";
import type { RangeDays } from "@/lib/dashboard/time";
import { getSiteTraffic } from "@/lib/site-traffic";

/**
 * Per-request shared reads for the Today page. Several blocks need the same
 * data (the header's summary and the queue; the tiles and the chart), and
 * `cache` makes them share one query instead of repeating it.
 */
/** The signed-in administrator, looked up once for the whole page. */
export const todayViewer = React.cache(async () => {
  const session = await getSession();
  return {
    name: session?.user.name ?? null,
    // Same rule as the Security Centre page: other roles are sent away from
    // it, so the dashboard does not show them its findings either.
    canSeeSecurity: session ? canManageSecurityCenter(session.user.role) : false,
  };
});

export const todayQueue = React.cache(async () => {
  await connection();
  return loadQueue(new Date());
});

export const todayTiles = React.cache(async (range: RangeDays) => {
  await connection();
  return loadTiles(range, new Date());
});

export const todayTraffic = React.cache(async (range: RangeDays) => {
  await connection();
  return getSiteTraffic(range, new Date());
});
