import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { procurementEnabled } from "@/lib/procurement/switch";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signedDocumentUrl } from "@/lib/procurement/storage";
import { isAdminRole } from "@/lib/roles";

/** Opens a stored document through a five-minute signed link, after the admin check. Each open is audited. */
export async function GET(req: Request, ctx: { params: Promise<{ versionId: string }> }) {
  if (!procurementEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { versionId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const version = await prisma.companyDocumentVersion.findUnique({ where: { id: versionId } });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await signedDocumentUrl(version.storagePath, version.filename);
  if (!url) return NextResponse.json({ error: "The document could not be opened. Storage may not be configured." }, { status: 503 });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      action: "document.opened",
      entityType: "CompanyDocumentVersion",
      entityId: version.id,
      metadata: { documentId: version.documentId, version: version.version },
    },
  });
  void req;
  return NextResponse.redirect(url, 302);
}
