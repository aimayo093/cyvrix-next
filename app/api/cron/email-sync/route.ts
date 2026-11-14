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
  const purged = await purgeOldEmail().catch(() => null);
  // Counts and states only: no addresses or subjects in the cron log.
  return NextResponse.json({
    ok: sync.state !== "error",
    sync: sync.state,
    stored: sync.state === "ok" ? sync.stored : 0,
    purged,
  });
}
