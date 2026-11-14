import { connection } from "next/server";
import { getDraftForAgent } from "@/lib/agent-drafts";
import { guard, json } from "@/lib/paperclip-route";

/** GET /api/integrations/paperclip/drafts/{id}   (draft token): status and review note. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const refused = await guard(req, "draft");
  if (refused) return refused;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Not found" }, 404);
  try {
    const draft = await getDraftForAgent(id);
    return draft ? json(draft) : json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("[paperclip] draft read failed", error);
    return json({ error: "Draft unavailable" }, 503);
  }
}
