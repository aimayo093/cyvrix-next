import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { packageManifestText } from "@/lib/procurement/package-manifest";
import { procurementEnabled } from "@/lib/procurement/switch";
import { isAdminRole } from "@/lib/roles";

/** The package manifest as a text file, after the admin check. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!procurementEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pkg = await prisma.package.findUnique({
    where: { id },
    include: {
      Opportunity: { select: { title: true } },
      Item: { orderBy: { createdAt: "asc" }, include: { DocumentVersion: { select: { filename: true, sizeBytes: true } } } },
    },
  });
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const text = packageManifestText({
    opportunityTitle: pkg.Opportunity.title,
    destination: pkg.destination,
    version: pkg.version,
    status: pkg.status,
    manifestSha256: pkg.manifestSha256,
    lockedAt: pkg.lockedAt,
    price: (pkg.priceSnapshot as { amount?: number; basis?: string } | null) ?? null,
    declarations: Array.isArray(pkg.declarations) ? (pkg.declarations as unknown[]).map(String) : [],
    items: pkg.Item.map((i) => ({ label: i.label, filename: i.DocumentVersion.filename, sha256: i.sha256, sizeBytes: i.DocumentVersion.sizeBytes })),
  });
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="package-v${pkg.version}-manifest.txt"`,
      "Cache-Control": "private, no-store",
    },
  });
}
