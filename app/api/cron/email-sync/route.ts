import { NextResponse } from "next/server";
import { purgeOldEmail, syncInbox } from "@/lib/email-history";

/**
 * Daily: reads new mail into the admin Inbox and deletes email history past
 * its 24-month retention (DECISIONS §17). The Email page also syncs when it
 * is opened, so this mainly covers quiet periods and retention.
 */
function isAuthorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sync = await syncInbox({ force: true });
  let purged: number | null = null;
  let purgeFailed = false;
  try {
    purged = await purgeOldEmail();
  } catch (error) {
    purgeFailed = true;
    console.error("[cron/email-sync] retention purge failed", error instanceof Error ? error.name : "error");
  }
  // A failed sync or purge returns 500, so the hosting platform's cron monitoring shows it:
  // a silently skipped retention purge would break the privacy policy's promise.
  const ok = sync.state !== "error" && !purgeFailed;
  // Counts and states only: no addresses or subjects in the cron log.
  return NextResponse.json(
    { ok, sync: sync.state, stored: sync.state === "ok" ? sync.stored : 0, purged },
    { status: ok ? 200 : 500 },
  );
}
