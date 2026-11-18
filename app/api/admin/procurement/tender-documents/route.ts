import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { uploadTenderDocument } from "@/lib/procurement/tender-service";
import { isAdminRole } from "@/lib/roles";
import { rejectCrossOrigin } from "@/lib/same-origin";

/**
 * Upload a tender document the founder downloaded from a buyer's portal
 * (Phase 4). Scanned first and stored only if accepted, in the private bucket.
 * These are the buyer's documents and never count as CYVRIX evidence.
 *
 * Capped at 4 MB, below the hosting platform's request body limit for functions.
 */
const MAX_BYTES = 4 * 1024 * 1024;

const form = z.object({
  file: z.instanceof(File).refine((f) => f.size > 0 && f.size <= MAX_BYTES, "Files must be between 1 byte and 4 MB."),
  opportunityId: z.string().uuid(),
  title: z.string().trim().min(2).max(300),
  documentType: z.string().trim().max(80).optional(),
  sourceUrl: z
    .string()
    .trim()
    .url()
    .max(2000)
    .refine((u) => /^https?:\/\//i.test(u), "Links must start with http:// or https://")
    .optional(),
});

const blank = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() === "" ? undefined : v ?? undefined);

export async function POST(req: Request) {
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.formData();
  const parsed = form.safeParse({
    file: data.get("file"),
    opportunityId: data.get("opportunityId"),
    title: data.get("title"),
    documentType: blank(data.get("documentType")),
    sourceUrl: blank(data.get("sourceUrl")),
  });
  const opportunityId = typeof data.get("opportunityId") === "string" && /^[0-9a-f-]{36}$/i.test(String(data.get("opportunityId"))) ? String(data.get("opportunityId")) : null;
  const page = opportunityId ? `/admin/procurement/opportunities/${opportunityId}` : "/admin/procurement";
  const back = (status: "success" | "error", message: string) =>
    NextResponse.redirect(new URL(`${page}?status=${status}&message=${encodeURIComponent(message)}`, req.url), 303);
  if (!parsed.success) return back("error", parsed.error.issues[0]?.message ?? "Check the form and try again.");

  const input = parsed.data;
  const result = await uploadTenderDocument({
    opportunityId: input.opportunityId,
    title: input.title,
    documentType: input.documentType ?? null,
    sourceUrl: input.sourceUrl ?? null,
    buffer: Buffer.from(await input.file.arrayBuffer()),
    filename: input.file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "tender-document",
    userId: session.user.id,
  });
  return result.ok ? back("success", "Scanned and stored.") : back("error", result.reason);
}
