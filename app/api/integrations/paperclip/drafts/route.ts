import { connection } from "next/server";
import { draftInputSchema, MAX_DRAFT_BYTES, normaliseDraft } from "@/lib/agent-drafts-core";
import { createDraft, listDraftsForAgent } from "@/lib/agent-drafts";
import { guard, json } from "@/lib/paperclip-route";

/**
 * POST /api/integrations/paperclip/drafts   (draft token)
 *   Submit a blog post, email, social post or proposal. It waits in
 *   /admin/ai-drafts until an administrator approves or rejects it; nothing
 *   is published by this call. The response includes any public-claims rule
 *   it breaks, so the agent can revise and resubmit with a new key.
 *
 * GET /api/integrations/paperclip/drafts?since=ISO-date   (draft token)
 *   Drafts changed since that time, oldest first, with status and review note.
 *
 * See docs/paperclip-skill.md for examples and DECISIONS section 15.
 */
export async function POST(req: Request) {
  await connection();
  const refused = await guard(req, "draft");
  if (refused) return refused;

  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Send JSON with Content-Type: application/json" }, 415);
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_DRAFT_BYTES) return json({ error: `Body larger than ${MAX_DRAFT_BYTES} bytes` }, 413);
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_DRAFT_BYTES) return json({ error: `Body larger than ${MAX_DRAFT_BYTES} bytes` }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Body is not valid JSON" }, 400);
  }
  const parsed = draftInputSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Invalid draft", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      422,
    );
  }

  try {
    const result = await createDraft(normaliseDraft(parsed.data));
    return json(result.draft, result.created ? 201 : 200);
  } catch (error) {
    console.error("[paperclip] draft submit failed", error);
    return json({ error: "Could not store the draft" }, 503);
  }
}

export async function GET(req: Request) {
  await connection();
  const refused = await guard(req, "draft");
  if (refused) return refused;
  const sinceRaw = new URL(req.url).searchParams.get("since");
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw) : null;
  try {
    return json({ drafts: await listDraftsForAgent(since) });
  } catch (error) {
    console.error("[paperclip] draft list failed", error);
    return json({ error: "Drafts unavailable" }, 503);
  }
}
