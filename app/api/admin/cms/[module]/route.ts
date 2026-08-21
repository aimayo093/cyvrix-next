/**
 * Generic Admin CRUD API
 * Route: /api/admin/cms/[module]
 * Supports: GET (list) · POST (create) · PATCH (?id=) · DELETE (?id=)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import crypto from "node:crypto";


/* ── Module → Prisma model map (exact PascalCase from schema) ──────────── */
const MODULE_MAP: Record<string, string> = {
  "compliance-cards":    "complianceCard",
  "partner-logos":       "partnerLogo",
  "trusted-logos":       "trustedBusinessLogo",
  "social-links":        "socialLink",
  "faqs":                "fAQ",
  "testimonials":        "testimonial",
  "services":            "service",
  "industries":          "industry",
  "pages":               "cmsPage",
  "blog":                "blogPost",
  "leads":               "lead",
  "tickets":             "ticket",
  "clients":             "clientCompany",
  "footer-sections":     "footerSection",
  "nav-menus":           "menu",
  "nav-items":           "navigationItem",
  "career-jobs":         "careerJob",
  "quote-requests":      "quoteRequest",
  "media-assets":        "mediaAsset",
  "brand-assets":        "brandAsset",
  "site-settings":       "siteSetting",
  "web-sections":        "websiteSection",
};

type CmsRecord = Record<string, unknown> & { id: string };

type CmsModel = {
  findUnique(args: { where: { id: string } }): Promise<CmsRecord | null>;
  findMany(args: { take: number; skip: number; orderBy: { createdAt: "desc" } }): Promise<CmsRecord[]>;
  create(args: { data: Record<string, unknown> }): Promise<CmsRecord>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<CmsRecord>;
  delete(args: { where: { id: string } }): Promise<CmsRecord>;
};

function getModel(module: string): CmsModel | null {
  const key = MODULE_MAP[module];
  if (!key) return null;
  const models = prisma as unknown as Record<string, CmsModel | undefined>;
  return models[key] ?? null;
}

function sanitize(v: unknown): unknown {
  if (typeof v === "string") return v.replace(/[<>]/g, "").slice(0, 10000);
  if (Array.isArray(v)) return v.map(sanitize);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, sanitize(val)])
    );
  }
  return v;
}

async function requireCmsApiAdministrator() {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") return null;
  return session.user;
}

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
}

async function auditLog(userId: string, ipAddress: string | undefined, action: string, entityType: string, entityId: string) {
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
      },
    });
  } catch {
    /* non-blocking — never crash the main response */
  }
}

function isMissingRecordError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

/* ── GET ────────────────────────────────────────────────────────────────── */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  if (!(await requireCmsApiAdministrator())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const record = await model.findUnique({ where: { id } });
      if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(record);
    }

    const take = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
    const skip = parseInt(searchParams.get("offset") ?? "0");

    const records = await model.findMany({ take, skip, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: records, count: records.length });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve CMS records." }, { status: 500 });
  }
}

/* ── POST ───────────────────────────────────────────────────────────────── */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const administrator = await requireCmsApiAdministrator();
  if (!administrator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  try {
    const body = sanitize(await req.json()) as Record<string, unknown>;
    const id = crypto.randomUUID();
    const record = await model.create({
      data: { id, updatedAt: new Date(), ...body },
    });
    await auditLog(administrator.id, clientIp(req), `${module.toUpperCase()}_CREATED`, module, record.id);
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create this CMS record." }, { status: 422 });
  }
}

/* ── PATCH ──────────────────────────────────────────────────────────────── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const administrator = await requireCmsApiAdministrator();
  if (!administrator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ?id=" }, { status: 400 });

  try {
    const body = sanitize(await req.json()) as Record<string, unknown>;
    delete body.id;
    delete body.createdAt;

    const record = await model.update({
      where: { id },
      data: { updatedAt: new Date(), ...body },
    });
    await auditLog(administrator.id, clientIp(req), `${module.toUpperCase()}_UPDATED`, module, id);
    return NextResponse.json(record);
  } catch (error: unknown) {
    if (isMissingRecordError(error)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Unable to update this CMS record." }, { status: 422 });
  }
}

/* ── DELETE ─────────────────────────────────────────────────────────────── */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const administrator = await requireCmsApiAdministrator();
  if (!administrator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ?id=" }, { status: 400 });

  try {
    await model.delete({ where: { id } });
    await auditLog(administrator.id, clientIp(req), `${module.toUpperCase()}_DELETED`, module, id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isMissingRecordError(error)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Unable to delete this CMS record." }, { status: 500 });
  }
}
