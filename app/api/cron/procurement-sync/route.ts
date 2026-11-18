import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { OFFICIAL_SOURCES, runSource, type RunResult } from "@/lib/procurement/ingest";
import { isScheduledRun } from "@/lib/procurement/schedule";

/**
 * Pulls the enabled official tender feeds (Find a Tender, Public Contracts
 * Scotland, Sell2Wales) into the procurement CRM. Called by the platform cron with
 * CRON_SECRET once a day (06:00 UTC); does nothing outside the early-morning
 * London window (lib/procurement/schedule.ts), and nothing
 * for a source the founder has not switched on (Admin -> Procurement -> Sources).
 *
 * Sources run one after another, so the database pool sees one connection at a
 * time (DECISIONS section 7).
 */
export const maxDuration = 60;

function isAuthorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!isAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  if (!isScheduledRun(now)) return NextResponse.json({ ok: true, skipped: true, reason: "Outside the morning run window (London time)." });

  const results: RunResult[] = [];
  const started = Date.now();
  for (const source of OFFICIAL_SOURCES) {
    const remaining = 55_000 - (Date.now() - started);
    if (remaining < 10_000) break;
    results.push(await runSource(source, { trigger: "cron", now, budgetMs: Math.min(40_000, remaining - 5_000) }));
  }
  return NextResponse.json({ ok: true, results });
}
