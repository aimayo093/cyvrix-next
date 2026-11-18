import { connection } from "next/server";
import { listOrganisationsForAgents } from "@/lib/procurement/agent-api";
import { guard, json } from "@/lib/paperclip-route";

/**
 * GET /api/integrations/paperclip/procurement/organisations?category=   (procurement token)
 * Research targets and buyers: names, categories and priority only. No
 * contacts, notes or client links (D4).
 */
export async function GET(req: Request) {
  await connection();
  const refused = await guard(req, "procurement");
  if (refused) return refused;
  const category = new URL(req.url).searchParams.get("category");
  try {
    return json(await listOrganisationsForAgents(category && /^[a-z_]{3,40}$/.test(category) ? category : null));
  } catch (error) {
    console.error("[paperclip] procurement organisations failed", error instanceof Error ? error.name : "error");
    return json({ error: "Organisations unavailable" }, 503);
  }
}
