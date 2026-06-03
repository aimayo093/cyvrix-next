/**
 * Generic Admin CRUD API
 * Route: /api/admin/cms/[module]
 * Supports: GET (list) · POST (create) · PATCH (?id=) · DELETE (?id=)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

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

function getModel(module: string): any | null {
  const key = MODULE_MAP[module];
  if (!key) return null;
  return (prisma as any)[key] ?? null;
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

async function auditLog(action: string, entityType: string, entityId: string) {
  try {
    await (prisma as any).auditLog.create({
      data: {
        id: crypto.randomUUID(),
        action,
        entityType,
        entityId,
      },
    });
  } catch {
    /* non-blocking — never crash the main response */
  }
}

/* ── GET ────────────────────────────────────────────────────────────────── */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST ───────────────────────────────────────────────────────────────── */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  try {
    const body = sanitize(await req.json()) as Record<string, unknown>;
    const id = crypto.randomUUID();
    const record = await model.create({
      data: { id, updatedAt: new Date(), ...body },
    });
    auditLog(`${module.toUpperCase()}_CREATED`, module, record.id);
    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}

/* ── PATCH ──────────────────────────────────────────────────────────────── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    auditLog(`${module.toUpperCase()}_UPDATED`, module, id);
    return NextResponse.json(record);
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}

/* ── DELETE ─────────────────────────────────────────────────────────────── */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ?id=" }, { status: 400 });

  try {
    await model.delete({ where: { id } });
    auditLog(`${module.toUpperCase()}_DELETED`, module, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
