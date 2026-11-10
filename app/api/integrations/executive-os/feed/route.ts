import { NextResponse, connection } from "next/server";
import { buildFeed, feedAuthorised, feedToken, parseCursor } from "@/lib/executive-os-feed";

/**
 * GET /api/integrations/executive-os/feed?cursor=…
 * Read-only feed for the Executive OS. See lib/executive-os-feed.ts for what it
 * returns and why. Server-to-server only: a bearer token, never a cookie.
 */
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(req: Request) {
  await connection();
  const token = feedToken();
  // Off: indistinguishable from a route that does not exist.
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  if (!feedAuthorised(req.headers.get("authorization"), token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } });
  }
  try {
    const cursor = parseCursor(new URL(req.url).searchParams.get("cursor"));
    return NextResponse.json(await buildFeed(cursor), { headers });
  } catch (error) {
    console.error("[executive-os-feed] failed", error);
    return NextResponse.json({ error: "Feed unavailable" }, { status: 503, headers });
  }
}
