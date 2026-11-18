import { connection } from "next/server";
import { z } from "zod";
import { agentMove, agentName } from "@/lib/procurement/agent-api";
import { guard, json } from "@/lib/paperclip-route";

/**
 * POST /api/integrations/paperclip/procurement/opportunities/{id}/move   (procurement token)
 * Body: { "to": "Validated", "agent": "Tenders" }
 * Only the moves the lifecycle allows agents succeed (validate, qualify,
 * research); everything else is refused with the reason (409).
 */
const bodySchema = z.object({ to: z.string().regex(/^[A-Za-z]{3,40}$/), agent: agentName }).strict();

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const refused = await guard(req, "procurement");
  if (refused) return refused;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Not found" }, 404);
  const raw = await req.text();
  if (raw.length > 2_000) return json({ error: "Body too large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Body is not valid JSON" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Send { to, agent }" }, 422);
  try {
    const result = await agentMove(id, parsed.data.to, parsed.data.agent);
    return result.ok ? json({ ok: true, status: parsed.data.to }) : json({ error: result.reason }, 409);
  } catch (error) {
    console.error("[paperclip] procurement move failed", error instanceof Error ? error.name : "error");
    return json({ error: "Could not move the record" }, 503);
  }
}
