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
  const category = q.get("category");
  const after = q.get("after");
  try {
    return json(
      await listOrganisationsForAgents(
        category && /^[a-z_]{3,40}$/.test(category) ? category : null,
        after && /^[0-9a-f-]{36}$/i.test(after) ? after : null
      )
    );
  } catch (error) {
    console.error("[paperclip] procurement organisations failed", error instanceof Error ? error.name : "error");
    return json({ error: "Organisations unavailable" }, 503);
  }
}
