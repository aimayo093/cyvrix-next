import "server-only";
import * as React from "react";
import { connection } from "next/server";
import { loadQueue, loadTiles } from "@/lib/dashboard/loaders";
import type { RangeDays } from "@/lib/dashboard/time";
import { getSiteTraffic } from "@/lib/site-traffic";

/**
 * Per-request shared reads for the Today page. Several blocks need the same
 * data (the header's summary and the queue; the tiles and the chart), and
 * `cache` makes them share one query instead of repeating it.
 */
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
