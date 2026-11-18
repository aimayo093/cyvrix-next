import { connection } from "next/server";
import { MAX_AGENT_BODY_BYTES, recordAgentResearch, researchSchema } from "@/lib/procurement/agent-api";
import { guard, json } from "@/lib/paperclip-route";

/**
 * POST /api/integrations/paperclip/procurement/research   (procurement token)
 * Record an opportunity an agent found. It lands as Discovered (or
 * TargetIdentified for a partnership) for a person to review. Refused with
 * 422 if it contains an email address, a phone number or a personal profile
 * link (D4). Retrying with the same idempotencyKey returns the original.
 */
export async function POST(req: Request) {
  await connection();
  const refused = await guard(req, "procurement");
  if (refused) return refused;
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Send JSON with Content-Type: application/json" }, 415);
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_AGENT_BODY_BYTES) return json({ error: `Body larger than ${MAX_AGENT_BODY_BYTES} bytes` }, 413);
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_AGENT_BODY_BYTES) return json({ error: `Body larger than ${MAX_AGENT_BODY_BYTES} bytes` }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Body is not valid JSON" }, 400);
  }
  const parsed = researchSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid research", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 422);
  }
  try {
    const result = await recordAgentResearch(parsed.data);
    return json(result, result.created ? 201 : 200);
  } catch (error) {
    console.error("[paperclip] procurement research failed", error instanceof Error ? error.name : "error");
    return json({ error: "Could not record the research" }, 503);
  }
}
