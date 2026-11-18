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
 * time (DECISIONS section 7). Each is isolated: one failing never stops the next.
 * The response is 500 when any source failed, so the cron monitor shows it.
 */
export const maxDuration = 60;

// One feed request may take up to 20 s (lib/procurement/feeds.ts), and the
// budget is only checked between requests, so a source can start a request
// just inside its 15 s budget and run 20 s past it: 35 s at worst. The loop
// starts a source only with that much left before the function's 60 s limit.
const TOTAL_BUDGET_MS = 58_000;
const PER_SOURCE_BUDGET_MS = 15_000;
const FEED_REQUEST_TIMEOUT_MS = 20_000;
const RESERVE_MS = PER_SOURCE_BUDGET_MS + FEED_REQUEST_TIMEOUT_MS;

function isAuthorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

const empty = { fetched: 0, relevant: 0, created: 0, updated: 0, merged: 0, contacts: 0 };

export async function GET(req: Request) {
  if (!isAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  if (!isScheduledRun(now)) return NextResponse.json({ ok: true, skipped: true, reason: "Outside the morning run window (London time)." });

  const results: RunResult[] = [];
  const started = Date.now();
  for (const source of OFFICIAL_SOURCES) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < RESERVE_MS) {
      results.push({ source, status: "skipped", ...empty, detail: "Not reached in today's time budget; it runs tomorrow or with Run now." });
      continue;
    }
    try {
      results.push(await runSource(source, { trigger: "cron", now, budgetMs: PER_SOURCE_BUDGET_MS }));
    } catch (error) {
      console.error("[procurement-sync] source failed", source, error instanceof Error ? error.name : "error");
      results.push({ source, status: "failed", ...empty, detail: error instanceof Error ? error.name : "error" });
    }
  }
  const ok = results.every((r) => r.status !== "failed");
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
