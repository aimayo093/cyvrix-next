import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { scanDocument } from "@/lib/document-scan";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/procurement/service";
import { Prisma } from "@/generated/prisma";
import { removeDocument, storeDocument } from "@/lib/procurement/storage";
import { isAdminRole } from "@/lib/roles";
import { rejectCrossOrigin } from "@/lib/same-origin";

/**
 * Upload a company or tender document to the private bucket (D5).
 *
 * The file is scanned first (lib/document-scan.ts) and stored only if it is
 * accepted. A new version never replaces an old one: the database refuses a
 * change to a stored version's file or hash.
 *
 * Capped at 4 MB, below the hosting platform's request body limit for functions.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const PAGE = "/admin/procurement?tab=documents";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  txt: "text/plain",
};

const form = z.object({
  file: z.instanceof(File).refine((f) => f.size > 0 && f.size <= MAX_BYTES, "Files must be between 1 byte and 4 MB."),
  documentId: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(200).optional(),
  kind: z.string().trim().min(2).max(60).optional(),
  classification: z.enum(["public", "internal", "confidential"]).default("internal"),
  status: z.enum(["verified", "ai_draft", "founder_approved", "certified_evidence"]),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    // Reject dates that do not exist (2026-02-31) instead of letting them roll over.
    .refine((d) => {
      const t = new Date(`${d}T00:00:00Z`);
      return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
    }, "That expiry date does not exist.")
    .optional(),
  source: z.string().trim().max(300).optional(),
  returnTo: z.string().regex(/^\/admin\/procurement[\w\-/?=&%.]*$/).optional(),
});

const back = (req: Request, to: string, status: "success" | "error", message: string) => {
  const sep = to.includes("?") ? "&" : "?";
  return NextResponse.redirect(new URL(`${to}${sep}status=${status}&message=${encodeURIComponent(message)}`, req.url), 303);
};

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
    documentId: blank(data.get("documentId")),
    title: blank(data.get("title")),
    kind: blank(data.get("kind")),
    classification: blank(data.get("classification")),
    status: data.get("status"),
    expiresAt: blank(data.get("expiresAt")),
    source: blank(data.get("source")),
    returnTo: blank(data.get("returnTo")),
  });
  const returnTo = parsed.success && parsed.data.returnTo ? parsed.data.returnTo : PAGE;
  if (!parsed.success) return back(req, returnTo, "error", parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const input = parsed.data;

  // Approved and certified evidence are the founder's call, not any admin's.
  if ((input.status === "founder_approved" || input.status === "certified_evidence") && session.user.role !== "SUPER_ADMIN") {
    return back(req, returnTo, "error", "Only the founder can mark a document approved or certified evidence.");
  }
  if (!input.documentId && (!input.title || !input.kind)) {
    return back(req, returnTo, "error", "A new document needs a title and a type.");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const verdict = await scanDocument({ buffer, filename: input.file.name });
  if (!verdict.accepted || !verdict.kind) {
    return back(req, returnTo, "error", `Not stored: ${verdict.reasons[0] ?? "the file was not recognised as a document."}`);
  }

  const existing = input.documentId
    ? await prisma.companyDocument.findUnique({
        where: { id: input.documentId },
        include: { Version: { orderBy: { version: "desc" }, take: 1 } },
      })
    : null;
  if (input.documentId && !existing) return back(req, returnTo, "error", "That document could not be found.");

  const documentId = existing?.id ?? crypto.randomUUID();
  const version = (existing?.Version[0]?.version ?? 0) + 1;
  const versionId = crypto.randomUUID();
  const storagePath = `${documentId}/${versionId}.${verdict.kind}`;
  const filename = input.file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `document.${verdict.kind}`;

  const stored = await storeDocument(storagePath, buffer, CONTENT_TYPES[verdict.kind]);
  if (!stored.ok) return back(req, returnTo, "error", stored.reason);

  // A new version keeps the previous expiry unless a new one is given, so a
  // compact re-upload cannot silently drop an insurance renewal date.
  const expiresAt = input.expiresAt ? new Date(`${input.expiresAt}T23:59:59Z`) : (existing?.Version[0]?.expiresAt ?? null);

  try {
    await prisma.$transaction(async (tx) => {
      if (!existing) {
        await tx.companyDocument.create({
          data: { id: documentId, title: input.title!, kind: input.kind!, classification: input.classification, owner: session.user.email },
        });
      }
      await tx.companyDocumentVersion.create({
        data: {
          id: versionId,
          documentId,
          version,
          status: input.status,
          expiresAt,
          storagePath,
          filename,
          sha256: verdict.sha256,
          sizeBytes: verdict.sizeBytes,
          scan: { kind: verdict.kind, notes: verdict.notes, externallyScanned: verdict.externallyScanned },
          source: input.source ?? null,
          uploadedById: session.user.id,
        },
      });
      await audit(tx, session.user.id, "document.uploaded", "CompanyDocumentVersion", versionId, {
        documentId,
        version,
        status: input.status,
        sha256: verdict.sha256,
        sizeBytes: verdict.sizeBytes,
      });
    });
  } catch (error) {
    // No record means nothing may keep the file: remove it rather than leave
    // confidential data in the bucket with nothing pointing at it.
    const removed = await removeDocument(storagePath);
    console.error("[procurement] document record failed after upload", {
      storagePath,
      removed,
      error: error instanceof Error ? error.name : "error",
    });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return back(req, returnTo, "error", "Another version of this document was uploaded at the same moment. Nothing was saved; try again.");
    }
    return back(
      req,
      returnTo,
      "error",
      removed ? "The record could not be saved, so the file was removed again. Try again." : "The record could not be saved. The file could not be removed and has been logged for clean-up."
    );
  }

  return back(req, returnTo, "success", `Stored version ${version} (${verdict.sha256.slice(0, 12)}…).`);
}
