import { connection } from "next/server";
import { listOpportunitiesForAgents, parseCursor } from "@/lib/procurement/agent-api";
import { guard, json } from "@/lib/paperclip-route";

/**
 * GET /api/integrations/paperclip/procurement/opportunities?cursor=&since=&kind=&status=&limit=   (procurement token)
 * Opportunities changed after the cursor, oldest first, through the agent view:
 * organisations and roles only, no personal data (DECISIONS section 20, D4).
 * Pass the returned `next` back as `cursor` to page; `more` says whether
 * another page is waiting. `since` (an ISO time) starts from a moment instead.
 */
export async function GET(req: Request) {
  await connection();
  const refused = await guard(req, "procurement");
  if (refused) return refused;
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind");
  const status = q.get("status");
  const limit = Number.parseInt(q.get("limit") ?? "100", 10);
  try {
    return json(
      await listOpportunitiesForAgents({
        after: parseCursor(q.get("cursor"), q.get("since")),
        kind: kind && /^[a-z]{3,20}$/.test(kind) ? kind : null,
        status: status && /^[A-Za-z]{3,40}$/.test(status) ? status : null,
        limit: Number.isFinite(limit) ? limit : 100,
      })
    );
  } catch (error) {
    console.error("[paperclip] procurement list failed", error instanceof Error ? error.name : "error");
    return json({ error: "Opportunities unavailable" }, 503);
  }
}
