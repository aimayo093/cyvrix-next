import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evidenceVerdict } from "@/lib/procurement/approval-core";
import { complianceMatrixCsv } from "@/lib/procurement/compliance-matrix";
import { procurementEnabled } from "@/lib/procurement/switch";
import { isAdminRole } from "@/lib/roles";

/** The requirements checklist as a CSV compliance matrix, after the admin check. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!procurementEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const opp = await prisma.opportunity.findUnique({ where: { id }, select: { id: true } });
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await prisma.tenderRequirement.findMany({
    where: { opportunityId: id },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    include: { SourceDocument: { select: { title: true } }, Evidence: { include: { Document: { select: { title: true } } } } },
  });
  const now = new Date();
  const csv = complianceMatrixCsv(
    rows.map((r) => ({
      ref: r.ref,
      kind: r.kind,
      text: r.text,
      status: r.status,
      source: r.SourceDocument?.title ?? null,
      location: r.location,
      evidence: r.Evidence ? `${r.Evidence.Document.title} v${r.Evidence.version} (${r.Evidence.filename})` : null,
      evidenceCurrent: r.Evidence ? evidenceVerdict(r.Evidence, now).ok : null,
      notes: r.notes,
    }))
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="compliance-matrix-${id.slice(0, 8)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
