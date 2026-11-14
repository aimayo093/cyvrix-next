import { connection } from "next/server";
import { buildFeed, parseCursor } from "@/lib/executive-os-feed";
import { guard, json } from "@/lib/paperclip-route";

/**
 * GET /api/integrations/paperclip/feed?cursor=…   (read token)
 * New leads, tickets, client-visible ticket messages and privacy requests, plus
 * unsubscribed addresses. See lib/executive-os-feed.ts and DECISIONS section 15.
 */
export async function GET(req: Request) {
  await connection();
  const refused = await guard(req, "read");
  if (refused) return refused;
  try {
    return json(await buildFeed(parseCursor(new URL(req.url).searchParams.get("cursor"))));
  } catch (error) {
    console.error("[paperclip] feed failed", error);
    return json({ error: "Feed unavailable" }, 503);
  }
}
