import { connection } from "next/server";
import { buildSnapshot } from "@/lib/paperclip-snapshot";
import { guard, json } from "@/lib/paperclip-route";

/**
 * GET /api/integrations/paperclip/snapshot   (read token)
 * The company at a glance for the CEO agent: open work, the last 30 days,
 * security score, website traffic and the drafts queue. Unreadable parts are
 * null, never 0.
 */
export async function GET(req: Request) {
  await connection();
  const refused = await guard(req, "read");
  if (refused) return refused;
  try {
    return json(await buildSnapshot());
  } catch (error) {
    console.error("[paperclip] snapshot failed", error);
    return json({ error: "Snapshot unavailable" }, 503);
  }
}
