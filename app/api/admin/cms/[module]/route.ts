/**
 * Generic Admin CRUD API
 * Route: /api/admin/cms/[module]
 * Supports: GET (list) · POST (create) · PATCH (?id=) · DELETE (?id=)
 */

import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/same-origin";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import crypto from "node:crypto";
import { z } from "zod";

/*
 * The body is a flat map of field names to values. This route serves 22
 * models, so it cannot know each model's columns; Prisma rejects unknown
 * fields. What the schema does guarantee: the body is an object (not an
 * array, string or null), keys look like field names, and the fields this
 * route owns — id and the timestamps — cannot be supplied by the caller.
 * Before this, a POST body's `id` silently replaced the generated one.
 */
const PROTECTED_FIELDS = ["id", "createdAt", "updatedAt"] as const;

const cmsBodySchema = z
  .record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/, "Field names must be identifiers."), z.unknown())
  .refine((body) => Object.keys(body).length > 0, "The body has no fields.")
  .refine((body) => Object.keys(body).length <= 100, "The body has too many fields.")
  .refine(
    (body) => PROTECTED_FIELDS.every((field) => !(field in body)),
    `These fields are set by the server: ${PROTECTED_FIELDS.join(", ")}.`
  );

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

async function readCmsBody(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "The body must be JSON." }, { status: 400 }) };
  }
  const parsed = cmsBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: "Invalid CMS record.", issues: parsed.error.issues.map((issue) => issue.message) },
        { status: 400 }
      ),
    };
  }
  return { body: sanitize(parsed.data) as Record<string, unknown> };
}


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

    const query = listQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!query.success) {
      return NextResponse.json({ error: "limit must be 1–500 and offset 0 or more." }, { status: 400 });
    }
    const { limit: take, offset: skip } = query.data;

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
  // Refused before anything else runs. See lib/same-origin.ts.
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;

  const administrator = await requireCmsApiAdministrator();
  if (!administrator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  const input = await readCmsBody(req);
  if (input.error) return input.error;

  try {
    const id = crypto.randomUUID();
    const record = await model.create({
      data: { ...input.body, id, updatedAt: new Date() },
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
  // Refused before anything else runs. See lib/same-origin.ts.
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;

  const administrator = await requireCmsApiAdministrator();
  if (!administrator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { module } = await params;
  const model = getModel(module);
  if (!model) return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 404 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ?id=" }, { status: 400 });

  const input = await readCmsBody(req);
  if (input.error) return input.error;

  try {
    const record = await model.update({
      where: { id },
      data: { ...input.body, updatedAt: new Date() },
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
  // Refused before anything else runs. See lib/same-origin.ts.
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;

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
