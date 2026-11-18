import { connection } from "next/server";
import { listOpportunitiesForAgents } from "@/lib/procurement/agent-api";
import { guard, json } from "@/lib/paperclip-route";

/**
 * GET /api/integrations/paperclip/procurement/opportunities?since=ISO&kind=&status=&limit=   (procurement token)
 * Opportunities changed since `since`, oldest first, through the agent view:
 * organisations and roles only, no personal data (DECISIONS section 20, D4).
 * Pass back `next` as `since` to page.
 */
export async function GET(req: Request) {
  await connection();
  const refused = await guard(req, "procurement");
  if (refused) return refused;
  const q = new URL(req.url).searchParams;
  const sinceRaw = q.get("since");
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw) : null;
  const kind = q.get("kind");
  const status = q.get("status");
  const limit = Number(q.get("limit") ?? "100");
  try {
    return json(
      await listOpportunitiesForAgents({
        since,
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
