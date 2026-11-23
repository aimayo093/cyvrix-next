import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { procurementEnabled } from "@/lib/procurement/switch";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signedDocumentUrl } from "@/lib/procurement/storage";
import { isAdminRole } from "@/lib/roles";

/** Opens a stored tender document through a five-minute signed link, after the admin check. Each open is audited. */
export async function GET(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  if (!procurementEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { documentId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const doc = await prisma.tenderDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.status !== "stored" || !doc.storagePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await signedDocumentUrl(doc.storagePath, doc.filename ?? "tender-document");
  if (!url) return NextResponse.json({ error: "The document could not be opened. Storage may not be configured." }, { status: 503 });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: "tender_document.opened",
      entityType: "TenderDocument",
      entityId: doc.id,
      metadata: { opportunityId: doc.opportunityId },
    },
  });
  void req;
  return NextResponse.redirect(url, 302);
}
