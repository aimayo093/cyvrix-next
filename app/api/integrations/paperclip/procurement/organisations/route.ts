import { connection } from "next/server";
import { listOrganisationsForAgents } from "@/lib/procurement/agent-api";
import { guard, json } from "@/lib/paperclip-route";

/**
 * GET /api/integrations/paperclip/procurement/organisations?category=&after=   (procurement token)
 * Research targets and buyers: names, categories and priority only, 500 per
 * page (pass `next` back as `after`). No contacts, notes, or organisations that
 * are CYVRIX clients (D4).
 */
export async function GET(req: Request) {
  await connection();
  const refused = await guard(req, "procurement");
  if (refused) return refused;
  const q = new URL(req.url).searchParams;
  const category = q.get("category") || null;
  const after = q.get("after") || null;
  // A filter that cannot be read is refused, never silently dropped: an agent
  // must not take the whole list for a filtered one.
  if (category && !/^[a-z_]{3,40}$/.test(category)) return json({ error: "category must be 3-40 lower-case letters or underscores" }, 400);
  if (after && !/^[0-9a-f-]{36}$/i.test(after)) return json({ error: "after must be the id from a previous page's next" }, 400);
  try {
    return json(await listOrganisationsForAgents(category, after));
  } catch (error) {
    console.error("[paperclip] procurement organisations failed", error instanceof Error ? error.name : "error");
    return json({ error: "Organisations unavailable" }, 503);
  }
}
