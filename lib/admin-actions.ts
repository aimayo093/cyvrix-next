"use server";

import crypto from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { LeadStatus, TicketStatus } from "@/generated/prisma";
import { canUpdateSiteSetting, requireAdmin } from "@/lib/auth";
import { contactValueProblem, publicContactSettingKeys } from "@/lib/contact-settings";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { getReviewedPage } from "@/lib/reviewed-page-content";
import { buildSiteImagesValue, siteImageFieldNames } from "@/lib/site-image-slots";
import { getDefaultLegalDocument } from "@/lib/legal-content";
import { sendVerificationEmail } from "@/lib/email-verification";
import { SITE_URL } from "@/lib/structured-data";
import {
  beginEnrolment,
  clearRecoveryCodeFlash,
  confirmEnrolment,
  disableTwoFactor as clearTwoFactor,
  flashRecoveryCodes,
  regenerateRecoveryCodes,
} from "@/lib/two-factor";
import { findPublicLegalPageDefinition } from "@/lib/legal-page-definitions";
import { toPublicLegalDocument } from "@/lib/public-legal";
import { getEmailIdentity, getServerSmtpConfig } from "@/lib/email-config";
import xss from "xss";
import { z } from "zod";

// Robust XSS protection using the 'xss' library
function sanitize(v: string) {
  return xss(v.trim()).slice(0, 20000);
}

function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const trustVerificationStatuses = new Set(["PENDING", "VERIFIED", "EXPIRED", "REJECTED"]);
const emailIdentityFields = new Set([
  "defaultFromName",
  "defaultFromEmail",
  "adminNotificationEmail",
]);

const adminEmailSchema = z.object({
  to: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200).refine((value) => !/[\r\n]/.test(value), "Invalid subject."),
  body: z.string().trim().min(1).max(20_000),
});

type TrustPublicationRecord = {
  verificationStatus: string;
  verificationReference: string | null;
  evidenceUrl: string | null;
  evidenceReviewedAt: Date | null;
  evidenceReviewedBy: string | null;
  expiresAt: Date | null;
  permissionConfirmed: boolean;
  permissionEvidenceUrl: string | null;
  permissionConfirmedAt: Date | null;
};

function optionalDate(value: FormDataEntryValue | null, endOfDay = false) {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(`${value.trim()}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function isTrustPublicationReady(record: TrustPublicationRecord, requiresPermission: boolean) {
  const hasReview = Boolean(
    record.verificationReference &&
      record.evidenceUrl &&
      record.evidenceReviewedAt &&
      record.evidenceReviewedBy,
  );
  const hasPermission = !requiresPermission || Boolean(
    record.permissionConfirmed && record.permissionEvidenceUrl && record.permissionConfirmedAt,
  );
  const isCurrent = !record.expiresAt || record.expiresAt > new Date();

  return record.verificationStatus === "VERIFIED" && hasReview && hasPermission && isCurrent;
}

function trustPublicationData(formData: FormData, requiresPermission: boolean) {
  const submittedStatus = sanitize((formData.get("verificationStatus") as string) || "PENDING").toUpperCase();
  const verificationStatus = trustVerificationStatuses.has(submittedStatus) ? submittedStatus : "PENDING";
  const verificationReference = sanitize((formData.get("verificationReference") as string) || "") || null;
  const evidenceUrl = sanitize((formData.get("evidenceUrl") as string) || "") || null;
  const evidenceReviewedBy = sanitize((formData.get("evidenceReviewedBy") as string) || "") || null;
  const evidenceReviewedAt = optionalDate(formData.get("evidenceReviewedAt"));
  const expiresAt = optionalDate(formData.get("expiresAt"), true);
  const permissionConfirmed = requiresPermission && formData.get("permissionConfirmed") === "true";
  const permissionEvidenceUrl = requiresPermission
    ? sanitize((formData.get("permissionEvidenceUrl") as string) || "") || null
    : null;
  const permissionConfirmedAt = requiresPermission
    ? optionalDate(formData.get("permissionConfirmedAt"))
    : null;
  const record = {
    verificationStatus,
    verificationReference,
    evidenceUrl,
    evidenceReviewedAt,
    evidenceReviewedBy,
    expiresAt,
    permissionConfirmed,
    permissionEvidenceUrl,
    permissionConfirmedAt,
  };

  return {
    ...record,
    publicVisibility: formData.get("publicVisibility") === "true" && isTrustPublicationReady(record, requiresPermission),
  };
}

type PublicCacheTag = (typeof PUBLIC_CACHE_TAGS)[keyof typeof PUBLIC_CACHE_TAGS];

function updatePublicCacheTags(...tags: PublicCacheTag[]) {
  for (const tag of new Set(tags)) {
    updateTag(tag);
  }
}

function updatePublicShellCache() {
  updatePublicCacheTags(
    PUBLIC_CACHE_TAGS.shell,
    PUBLIC_CACHE_TAGS.brandAssets,
    PUBLIC_CACHE_TAGS.navigation,
    PUBLIC_CACHE_TAGS.footer,
    PUBLIC_CACHE_TAGS.complianceCards,
  );
}

function updateHomeCache(...extraTags: PublicCacheTag[]) {
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.seo, ...extraTags);
}

function updateCmsPageCache() {
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.cmsPages, PUBLIC_CACHE_TAGS.seo);
}

export async function updateContactSettings(formData: FormData) {
  await requireAdmin();

  const contactSettings = Object.fromEntries(
    publicContactSettingKeys.map((key) => [key, sanitize((formData.get(`value.${key}`) as string) || "")]),
  ) as Record<string, string>;

  // Redirect with the reason rather than throwing.
  //
  // A thrown server action reaches Next's error boundary, so a rejected contact
  // detail looked like the application had broken. Getting one of these wrong is
  // an ordinary mistake and deserves a sentence, not a crash — and the crash was
  // worse than useless because it never said which field it objected to.
  for (const key of publicContactSettingKeys) {
    const problem = contactValueProblem(key, contactSettings[key] ?? "");
    if (problem) {
      redirect(`/admin/contact-cms?status=error&message=${encodeURIComponent(problem)}`);
    }
  }

  await prisma.siteSetting.upsert({
    where: { key: "contact_settings" },
    update: { value: contactSettings, updatedAt: new Date() },
    create: { key: "contact_settings", value: contactSettings, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "contact_settings_updated", entityType: "SiteSetting", metadata: { key: "contact_settings" } },
  });

  revalidatePath("/admin/contact-cms");
  revalidatePath("/contact");
  revalidatePath("/", "layout");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.contactSettings);
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.contactSettings, PUBLIC_CACHE_TAGS.cmsPages);

  // These values are public the moment they are saved, so the confirmation says
  // so rather than a bare "saved".
  redirect("/admin/contact-cms?status=success&message=" +
    encodeURIComponent("Contact details saved. They are now live on the public Contact page."));
}

export async function saveLegalPage(formData: FormData) {
  await requireAdmin();

  const legalSlug = sanitize((formData.get("slug") as string) || "");
  const definition = findPublicLegalPageDefinition(legalSlug);
  if (!definition) {
    throw new Error("This legal document is not available for public publication.");
  }

  const title = sanitize((formData.get("title") as string) || "");
  const body = sanitize((formData.get("body") as string) || "");
  const reviewNotice = sanitize((formData.get("reviewNotice") as string) || "");
  const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const document = toPublicLegalDocument({ title, body, reviewNotice });

  if (status === "PUBLISHED") {
    if (formData.get("legalReviewConfirmed") !== "true") {
      throw new Error("Confirm the legal review before publishing this document.");
    }
    if (!document) {
      throw new Error("Published legal documents need a title and substantive reviewed content.");
    }
  }

  const saved = await prisma.legalPage.upsert({
    where: { slug: definition.slug },
    create: {
      id: crypto.randomUUID(),
      slug: definition.slug,
      title: title || definition.title,
      body: body || null,
      reviewNotice: reviewNotice || "Final legal documents should be reviewed by a qualified legal professional.",
      status,
      updatedAt: new Date(),
    },
    update: {
      title: title || definition.title,
      body: body || null,
      reviewNotice: reviewNotice || "Final legal documents should be reviewed by a qualified legal professional.",
      status,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      action: "legal_page_saved",
      entityType: "LegalPage",
      entityId: saved.id,
      metadata: { slug: definition.slug, title: saved.title, status: saved.status },
    },
  });

  revalidatePath("/admin/legal-pages");
  revalidatePath(definition.route);
  revalidatePath("/sitemap.xml");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.legalPages, PUBLIC_CACHE_TAGS.seo);
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

export async function createService(formData: FormData) {
  await requireAdmin();
  const title = sanitize(formData.get("title") as string || "");
  const summary = sanitize(formData.get("summary") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const seoTitle = sanitize(formData.get("seoTitle") as string || "");
  const seoDesc = sanitize(formData.get("seoDescription") as string || "");
  const serviceSlug = slug(formData.get("slug") as string || title);
  const image = sanitize(formData.get("image") as string || "");

  await prisma.service.create({
    data: {
      id: crypto.randomUUID(),
      slug: serviceSlug,
      title,
      summary,
      published: false,
      sortOrder: 99,
      content: { body, image, includes: [], features: [], process: [], faqs: [] },
      seo: { title: seoTitle, description: seoDesc },
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "service_created", entityType: "Service", metadata: { title, slug: serviceSlug } },
  });

  revalidatePath("/admin/services-cms");
  revalidatePath("/services");
  updateHomeCache(PUBLIC_CACHE_TAGS.services);
}

export async function updateService(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const summary = sanitize(formData.get("summary") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const seoTitle = sanitize(formData.get("seoTitle") as string || "");
  const seoDesc = sanitize(formData.get("seoDescription") as string || "");
  const image = sanitize(formData.get("image") as string || "");

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.service.update({
    where: { id },
    data: {
      title,
      summary,
      content: { ...(existing.content as object), body, image },
      seo: { title: seoTitle, description: seoDesc },
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "service_updated", entityType: "Service", entityId: id, metadata: { title } },
  });

  revalidatePath("/admin/services-cms");
  revalidatePath("/services");
  revalidatePath(`/services/${existing.slug}`);
  updateHomeCache(PUBLIC_CACHE_TAGS.services);
}

export async function toggleServicePublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) return;

  const next = !existing.published;
  await prisma.service.update({ where: { id }, data: { published: next, updatedAt: new Date() } });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: next ? "service_published" : "service_unpublished", entityType: "Service", entityId: id, metadata: { title: existing.title } },
  });

  revalidatePath("/admin/services-cms");
  revalidatePath("/services");
  updateHomeCache(PUBLIC_CACHE_TAGS.services);
}

export async function deleteService(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.service.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "service_deleted", entityType: "Service", entityId: id, metadata: { title: existing.title } },
  });

  revalidatePath("/admin/services-cms");
  revalidatePath("/services");
  updateHomeCache(PUBLIC_CACHE_TAGS.services);
}

// â”€â”€â”€ SERVICE PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const serviceProductPriceModes = new Set(["EXACT", "FROM", "REQUEST_PRICING", "HIDDEN"]);
const serviceProductCtaRoutes = new Set([
  "/book-consultation?service=Managed%20Services",
  "/book-consultation?service=Cloud%20%26%20Cybersecurity",
  "/book-consultation?service=Cloud%20Services",
  "/book-consultation?service=Cybersecurity",
  "/book-consultation?service=Infrastructure",
  "/book-consultation?service=Field%20Engineering",
  "/book-consultation?service=Professional%20Services",
  "/assessments/it-health-check",
]);

function optionalNonNegativeAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 10_000_000 ? amount : null;
}

function serviceProductFeatures(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((feature) => sanitize(feature))
    .filter(Boolean)
    .slice(0, 20);
}

async function serviceProductFormData(formData: FormData) {
  const serviceIdCandidate = sanitize((formData.get("serviceId") as string) || "");
  const linkedService = serviceIdCandidate
    ? await prisma.service.findUnique({ where: { id: serviceIdCandidate }, select: { id: true } })
    : null;
  const submittedMode = sanitize((formData.get("priceDisplayMode") as string) || "REQUEST_PRICING").toUpperCase();
  const priceDisplayMode = serviceProductPriceModes.has(submittedMode) ? submittedMode : "REQUEST_PRICING";
  const submittedCtaUrl = sanitize((formData.get("ctaUrl") as string) || "");
  const ctaUrl = serviceProductCtaRoutes.has(submittedCtaUrl)
    ? submittedCtaUrl
    : "/book-consultation?service=Managed%20Services";
  const name = sanitize((formData.get("name") as string) || "");
  const description = sanitize((formData.get("description") as string) || "");

  if (!name || !description) {
    throw new Error("A service product needs a name and a concise public description.");
  }

  const sortOrderCandidate = Number(formData.get("sortOrder"));

  return {
    serviceId: linkedService?.id ?? null,
    name,
    description,
    recommendedCustomerSize: sanitize((formData.get("recommendedCustomerSize") as string) || ""),
    cadence: sanitize((formData.get("cadence") as string) || "") || null,
    features: serviceProductFeatures(formData.get("features")),
    pricingVisible: formData.get("pricingVisible") === "true",
    priceDisplayMode,
    monthlyPrice: optionalNonNegativeAmount(formData.get("monthlyPrice")),
    annualPrice: optionalNonNegativeAmount(formData.get("annualPrice")),
    ctaLabel: sanitize((formData.get("ctaLabel") as string) || "") || "Request pricing",
    ctaUrl,
    featured: formData.get("featured") === "true",
    sortOrder: Number.isInteger(sortOrderCandidate) && sortOrderCandidate >= 0 && sortOrderCandidate <= 10_000 ? sortOrderCandidate : 0,
  };
}

function updateServiceProductCache() {
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.serviceProducts);
  revalidatePath("/pricing");
  revalidatePath("/admin/service-products");
}

export async function createServiceProduct(formData: FormData) {
  await requireAdmin();
  const product = await serviceProductFormData(formData);

  const created = await prisma.servicePackage.create({
    data: {
      id: crypto.randomUUID(),
      ...product,
      published: false,
    },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "service_product_created", entityType: "ServicePackage", entityId: created.id, metadata: { name: created.name } },
  });

  updateServiceProductCache();
}

export async function updateServiceProduct(formData: FormData) {
  await requireAdmin();
  const id = sanitize((formData.get("id") as string) || "");
  const existing = await prisma.servicePackage.findUnique({ where: { id } });
  if (!existing) return;

  const product = await serviceProductFormData(formData);
  await prisma.servicePackage.update({
    where: { id },
    data: { ...product, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "service_product_updated", entityType: "ServicePackage", entityId: id, metadata: { name: product.name } },
  });

  updateServiceProductCache();
}

export async function toggleServiceProductPublish(formData: FormData) {
  await requireAdmin();
  const id = sanitize((formData.get("id") as string) || "");
  const existing = await prisma.servicePackage.findUnique({ where: { id } });
  if (!existing) return;

  const published = !existing.published;
  await prisma.servicePackage.update({ where: { id }, data: { published, updatedAt: new Date() } });
  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: published ? "service_product_published" : "service_product_unpublished", entityType: "ServicePackage", entityId: id, metadata: { name: existing.name } },
  });

  updateServiceProductCache();
}

export async function deleteServiceProduct(formData: FormData) {
  await requireAdmin();
  const id = sanitize((formData.get("id") as string) || "");
  const existing = await prisma.servicePackage.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.servicePackage.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "service_product_deleted", entityType: "ServicePackage", entityId: id, metadata: { name: existing.name } },
  });

  updateServiceProductCache();
}

// ─── BLOG POSTS ──────────────────────────────────────────────────────────────

export async function createBlogPost(formData: FormData) {
  await requireAdmin();
  const title = sanitize(formData.get("title") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const author = sanitize(formData.get("author") as string || "CYVRIX Editorial");
  const category = sanitize(formData.get("category") as string || "General");
  const tags = (formData.get("tags") as string || "").split(",").map((t) => t.trim()).filter(Boolean);
  const postSlug = slug(formData.get("slug") as string || title);
  const seoTitle = sanitize(formData.get("seoTitle") as string || "");
  const seoDesc = sanitize(formData.get("seoDescription") as string || "");
  const image = sanitize(formData.get("image") as string || "");

  await prisma.blogPost.create({
    data: {
      id: crypto.randomUUID(),
      slug: postSlug,
      title,
      body,
      author,
      category,
      tags,
      featuredImage: image || null,
      status: "DRAFT",
      seo: { title: seoTitle, description: seoDesc },
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "blog_post_created", entityType: "BlogPost", metadata: { title, slug: postSlug } },
  });

  revalidatePath("/admin/blog-and-insights");
  revalidatePath("/blog");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.insights, PUBLIC_CACHE_TAGS.seo);
}

export async function updateBlogPost(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const author = sanitize(formData.get("author") as string || "");
  const category = sanitize(formData.get("category") as string || "");
  const tags = (formData.get("tags") as string || "").split(",").map((t) => t.trim()).filter(Boolean);
  const seoTitle = sanitize(formData.get("seoTitle") as string || "");
  const seoDesc = sanitize(formData.get("seoDescription") as string || "");
  const image = sanitize(formData.get("image") as string || "");

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      body,
      author,
      category,
      tags,
      featuredImage: image || null,
      seo: { title: seoTitle, description: seoDesc },
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "blog_post_updated", entityType: "BlogPost", entityId: id, metadata: { title } },
  });

  revalidatePath("/admin/blog-and-insights");
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.insights, PUBLIC_CACHE_TAGS.seo);
}

export async function publishBlogPost(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return;

  const next = existing.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  await prisma.blogPost.update({
    where: { id },
    data: { status: next, publishAt: next === "PUBLISHED" ? new Date() : null, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: next === "PUBLISHED" ? "blog_published" : "blog_unpublished", entityType: "BlogPost", entityId: id, metadata: { title: existing.title } },
  });

  revalidatePath("/admin/blog-and-insights");
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.insights, PUBLIC_CACHE_TAGS.seo);
}

export async function deleteBlogPost(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.blogPost.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "blog_post_deleted", entityType: "BlogPost", entityId: id, metadata: { title: existing.title } },
  });

  revalidatePath("/admin/blog-and-insights");
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.insights, PUBLIC_CACHE_TAGS.seo);
}

// ─── INDUSTRIES ───────────────────────────────────────────────────────────────

export async function createIndustry(formData: FormData) {
  await requireAdmin();
  const title = sanitize(formData.get("title") as string || "");
  const summary = sanitize(formData.get("summary") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const indSlug = slug(formData.get("slug") as string || title);
  const image = sanitize(formData.get("image") as string || "");

  await prisma.industry.create({
    data: {
      id: crypto.randomUUID(),
      slug: indSlug,
      title,
      published: false,
      sortOrder: 99,
      content: { summary, body, image },
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/industries-cms");
  revalidatePath("/industries");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.industries, PUBLIC_CACHE_TAGS.cmsPages);
}

export async function updateIndustry(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const summary = sanitize(formData.get("summary") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const image = sanitize(formData.get("image") as string || "");

  const existing = await prisma.industry.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.industry.update({
    where: { id },
    data: { title, content: { ...(existing.content as object), summary, body, image }, updatedAt: new Date() },
  });

  revalidatePath("/admin/industries-cms");
  revalidatePath("/industries");
  revalidatePath(`/industries/${existing.slug}`);
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.industries, PUBLIC_CACHE_TAGS.cmsPages);
}

export async function toggleIndustryPublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.industry.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.industry.update({ where: { id }, data: { published: !existing.published, updatedAt: new Date() } });

  revalidatePath("/admin/industries-cms");
  revalidatePath("/industries");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.industries, PUBLIC_CACHE_TAGS.cmsPages);
}

export async function deleteIndustry(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.industry.delete({ where: { id } });
  revalidatePath("/admin/industries-cms");
  revalidatePath("/industries");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.industries, PUBLIC_CACHE_TAGS.cmsPages);
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  // Validated against the enum rather than cast through `any`. The CRM offered
  // a status called "PROPOSAL"; the enum is PROPOSAL_SENT, and the cast let the
  // mismatch reach the database, where the update threw.
  if (!Object.values(LeadStatus).includes(status as LeadStatus)) return;

  await prisma.lead.update({ where: { id }, data: { status: status as LeadStatus, updatedAt: new Date() } });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "lead_status_updated", entityType: "Lead", entityId: id, metadata: { status } },
  });

  revalidatePath("/admin/leads-crm");
}

export async function addLeadNote(formData: FormData) {
  await requireAdmin();
  const leadId = formData.get("leadId") as string;
  const body = sanitize(formData.get("body") as string || "");

  await prisma.leadNote.create({
    data: { id: crypto.randomUUID(), leadId, body },
  });

  revalidatePath("/admin/leads-crm");
}

export async function deleteLead(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin/leads-crm");
}

// ─── TICKETS ─────────────────────────────────────────────────────────────────

export async function updateTicketStatus(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  // Checked against the enum rather than cast through `any`. The queue used to
  // offer a status the database has never had, and writing it threw from inside
  // a server action - which surfaces as a page that simply stops responding.
  if (!Object.values(TicketStatus).includes(status as TicketStatus)) return;

  await prisma.ticket.update({ where: { id }, data: { status: status as TicketStatus, updatedAt: new Date() } });

  // Trigger automatic survey if configured
  try {
    const t = await prisma.ticket.findUnique({ where: { id } });
    if (t) {
      const settings = await prisma.surveySetting.findFirst();
      const shouldTrigger =
        (status === "CLOSED" && settings?.triggerOnClosed === true) ||
        (status === "RESOLVED" && settings?.triggerOnResolved === true);
      
      if (shouldTrigger && t.email) {
        const { triggerSurvey } = await import("./survey-actions");
        await triggerSurvey("support_ticket", id, t.email, t.name, t.clientCompanyId);
      }
    }
  } catch (err) {
    console.error("Survey trigger check failed:", err);
  }

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "ticket_status_updated", entityType: "Ticket", entityId: id, metadata: { status } },
  });

  revalidatePath("/admin/ticket-management");
}

export async function assignTicket(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const assignedTo = formData.get("assignedTo") as string;

  await prisma.ticket.update({ where: { id }, data: { assignedTo, updatedAt: new Date() } });
  revalidatePath("/admin/ticket-management");
}

/**
 * Add an internal note, or a reply the client will see.
 *
 * Returns a result so the thread can fetch what was written the moment it
 * lands, rather than the analyst wondering whether the form did anything.
 *
 * `visibility` decides who sees it and the default is deliberately `internal`:
 * an unlabelled note is a private one. The portal now filters on this. It did
 * not, which meant every note written here was visible to the client.
 */
export async function addTicketNote(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const ticketId = formData.get("ticketId") as string;
  const body = sanitize((formData.get("body") as string) || "");
  const visibility = (formData.get("visibility") as string) === "client" ? "client" : "internal";

  if (!ticketId || !body) {
    return { success: false, message: "A ticket and a message are both required." };
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) {
    return { success: false, message: "That ticket no longer exists." };
  }

  await prisma.ticketMessage.create({
    data: { id: crypto.randomUUID(), ticketId, body, visibility },
  });

  // So the queue's "age" column reflects the last activity rather than the last
  // status change.
  await prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });

  revalidatePath("/admin/ticket-management");
  revalidatePath("/portal/support-tickets");
  return { success: true, message: visibility === "client" ? "Reply sent." : "Internal note added." };
}

export async function closeTicket(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.ticket.update({ where: { id }, data: { status: "CLOSED", updatedAt: new Date() } });

  // Trigger automatic survey if configured
  try {
    const t = await prisma.ticket.findUnique({ where: { id } });
    if (t) {
      const settings = await prisma.surveySetting.findFirst();
      const shouldTrigger = settings?.triggerOnClosed === true;
      
      if (shouldTrigger && t.email) {
        const { triggerSurvey } = await import("./survey-actions");
        await triggerSurvey("support_ticket", id, t.email, t.name, t.clientCompanyId);
      }
    }
  } catch (err) {
    console.error("Survey trigger check failed on close ticket:", err);
  }

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "ticket_closed", entityType: "Ticket", entityId: id },
  });

  revalidatePath("/admin/ticket-management");
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export async function createClientCompany(formData: FormData) {
  await requireAdmin();
  const name = sanitize(formData.get("name") as string || "");
  const industry = sanitize(formData.get("industry") as string || "");
  const billingContact = sanitize(formData.get("billingContact") as string || "");
  const securityContact = sanitize(formData.get("securityContact") as string || "");
  const notes = sanitize(formData.get("notes") as string || "");

  await prisma.clientCompany.create({
    data: {
      id: crypto.randomUUID(),
      name,
      industry: industry || undefined,
      billingContact: billingContact || undefined,
      securityContact: securityContact || undefined,
      notes: notes || undefined,
      status: "active",
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "client_company_created", entityType: "ClientCompany", metadata: { name } },
  });

  revalidatePath("/admin/client-management");
}

export async function updateClientCompany(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const name = sanitize(formData.get("name") as string || "");
  const industry = sanitize(formData.get("industry") as string || "");
  const billingContact = sanitize(formData.get("billingContact") as string || "");
  const securityContact = sanitize(formData.get("securityContact") as string || "");
  const notes = sanitize(formData.get("notes") as string || "");

  await prisma.clientCompany.update({
    where: { id },
    data: { name, industry: industry || null, billingContact: billingContact || null, securityContact: securityContact || null, notes: notes || null, updatedAt: new Date() },
  });

  revalidatePath("/admin/client-management");
}

export async function deactivateClient(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const current = await prisma.clientCompany.findUnique({ where: { id } });
  if (!current) return;

  const next = current.status === "active" ? "inactive" : "active";
  await prisma.clientCompany.update({ where: { id }, data: { status: next, updatedAt: new Date() } });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: next === "inactive" ? "client_deactivated" : "client_reactivated", entityType: "ClientCompany", entityId: id, metadata: { name: current.name } },
  });

  revalidatePath("/admin/client-management");
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export async function updateSiteSetting(formData: FormData) {
  const administrator = await requireAdmin();
  const keyValue = formData.get("key");
  const key = typeof keyValue === "string" ? keyValue.trim() : "";
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(key)) {
    throw new Error("Invalid setting key.");
  }
  if (!canUpdateSiteSetting(administrator.role, key)) {
    throw new Error("You do not have permission to update this setting.");
  }

  // Support dot-notation fields like value.name, value.email → build nested object
  const hasDotFields = Array.from(formData.keys()).some((k) => k.startsWith("value."));
  if (key === "emailConfig" && !hasDotFields) {
    throw new Error("Email delivery identity must be updated through the approved settings form.");
  }

  let value: unknown;
  if (hasDotFields) {
    // Fetch existing value and MERGE so we don't overwrite unrelated fields
    const existing = await prisma.siteSetting.findUnique({ where: { key } });
    const existingObj: Record<string, string> = (existing?.value as Record<string, string>) ?? {};
    const incoming: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      if (k.startsWith("value.") && typeof v === "string") {
        const sanitizedVal = sanitize(v);
        if (sanitizedVal === "********") continue;
        incoming[k.slice(6)] = sanitizedVal;
      }
    }
    if (key === "emailConfig") {
      const defaultFromEmail = incoming.defaultFromEmail ?? existingObj.defaultFromEmail ?? "";
      const adminNotificationEmail = incoming.adminNotificationEmail ?? existingObj.adminNotificationEmail ?? "";
      if (defaultFromEmail && !z.string().trim().email().max(254).safeParse(defaultFromEmail).success) {
        throw new Error("Enter a valid default sender email address.");
      }
      if (adminNotificationEmail && !z.string().trim().email().max(254).safeParse(adminNotificationEmail).success) {
        throw new Error("Enter a valid admin notification email address.");
      }
      value = Object.fromEntries(
        [...emailIdentityFields].map((field) => [field, incoming[field] ?? existingObj[field] ?? ""]),
      );
    } else {
      value = { ...existingObj, ...incoming };
    }
  } else {
    const raw = formData.get("value") as string;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
  }

  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: value as any, updatedAt: new Date() },
    create: { key, value: value as any, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), userId: administrator.id, action: "site_setting_updated", entityType: "SiteSetting", metadata: { key } },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/security-center");
  revalidatePath("/", "layout");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.contactSettings);
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.contactSettings, PUBLIC_CACHE_TAGS.cmsPages);
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────

export async function approveTestimonial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) return;

  const approved = existing.approved ? false : isTrustPublicationReady(existing, true);
  await prisma.testimonial.update({
    where: { id },
    data: { approved, featured: approved ? existing.featured : false },
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.testimonials);
}

export async function toggleFeaturedTestimonial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) return;

  const featured = existing.featured
    ? false
    : existing.approved && existing.publicVisibility && isTrustPublicationReady(existing, true);
  await prisma.testimonial.update({ where: { id }, data: { featured } });
  revalidatePath("/admin/testimonials");
  updateHomeCache(PUBLIC_CACHE_TAGS.testimonials);
}

export async function deleteTestimonial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/admin/testimonials");
  updateHomeCache(PUBLIC_CACHE_TAGS.testimonials);
}

export async function createTestimonial(formData: FormData) {
  await requireAdmin();
  const clientName = sanitize(formData.get("clientName") as string || "");
  const company = sanitize(formData.get("company") as string || "");
  const quote = sanitize(formData.get("quote") as string || "");
  const rating = parseInt(formData.get("rating") as string || "5", 10);
  const trustPublication = trustPublicationData(formData, true);

  await prisma.testimonial.create({
    data: { id: crypto.randomUUID(), clientName, company, quote, rating, approved: false, featured: false, ...trustPublication },
  });

  revalidatePath("/admin/testimonials");
  updateHomeCache(PUBLIC_CACHE_TAGS.testimonials);
}

export async function updateTestimonialTrust(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) return;

  const trustPublication = trustPublicationData(formData, true);
  const remainsEligible = isTrustPublicationReady(trustPublication, true);
  await prisma.testimonial.update({
    where: { id },
    data: {
      ...trustPublication,
      approved: remainsEligible ? existing.approved : false,
      featured: remainsEligible ? existing.featured : false,
    },
  });

  revalidatePath("/admin/testimonials");
  updateHomeCache(PUBLIC_CACHE_TAGS.testimonials);
}

// ─── FAQS ─────────────────────────────────────────────────────────────────────

export async function createFAQ(formData: FormData) {
  await requireAdmin();
  const category = sanitize(formData.get("category") as string || "General");
  const question = sanitize(formData.get("question") as string || "");
  const answer = sanitize(formData.get("answer") as string || "");

  await prisma.fAQ.create({
    data: { id: crypto.randomUUID(), category, question, answer, published: false },
  });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  updateHomeCache(PUBLIC_CACHE_TAGS.faqs);
}

export async function updateFAQ(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const category = sanitize(formData.get("category") as string || "");
  const question = sanitize(formData.get("question") as string || "");
  const answer = sanitize(formData.get("answer") as string || "");

  await prisma.fAQ.update({ where: { id }, data: { category, question, answer } });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  updateHomeCache(PUBLIC_CACHE_TAGS.faqs);
}

export async function toggleFAQPublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.fAQ.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.fAQ.update({ where: { id }, data: { published: !existing.published } });
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  updateHomeCache(PUBLIC_CACHE_TAGS.faqs);
}

export async function deleteFAQ(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.fAQ.delete({ where: { id } });
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  updateHomeCache(PUBLIC_CACHE_TAGS.faqs);
}

// ─── CMS PAGES ───────────────────────────────────────────────────────────────

export async function createCmsPage(formData: FormData) {
  await requireAdmin();
  const title = sanitize(formData.get("title") as string || "");
  const pageSlug = slug(formData.get("slug") as string || title);
  const heroTitle = sanitize(formData.get("heroTitle") as string || "");
  const heroSubtitle = sanitize(formData.get("heroSubtitle") as string || "");
  const featuredImage = sanitize(formData.get("featuredImage") as string || "");
  const seoTitle = sanitize(formData.get("seoTitle") as string || "");
  const seoDescription = sanitize(formData.get("seoDescription") as string || "");

  const pageId = crypto.randomUUID();

  await prisma.cmsPage.create({
    data: {
      id: pageId,
      slug: pageSlug,
      title,
      heroTitle,
      heroSubtitle,
      featuredImage,
      seoTitle,
      seoDescription,
      status: "PUBLISHED",
      updatedAt: new Date(),
    },
  });

  // Create a default JSON content block
  await prisma.contentBlock.create({
    data: {
      id: crypto.randomUUID(),
      pageId,
      type: "RICH_TEXT",
      title: "Page Data",
      content: {},
      updatedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "page_created", entityType: "CmsPage", metadata: { title, slug: pageSlug } },
  });

  revalidatePath("/admin/pages-cms");
}

export async function updateCmsPage(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const heroTitle = sanitize(formData.get("heroTitle") as string || "");
  const heroSubtitle = sanitize(formData.get("heroSubtitle") as string || "");
  const featuredImage = sanitize(formData.get("featuredImage") as string || "");
  const seoTitle = sanitize(formData.get("seoTitle") as string || "");
  const seoDescription = sanitize(formData.get("seoDescription") as string || "");
  const rawContentData = formData.get("contentData") as string || "{}";

  let contentData = {};
  try {
    contentData = JSON.parse(rawContentData);
  } catch (e) {
    // ignore
  }

  const existing = await prisma.cmsPage.findUnique({ where: { id }, include: { ContentBlock: true } });
  if (!existing) return;

  await prisma.cmsPage.update({
    where: { id },
    data: {
      title,
      heroTitle,
      heroSubtitle,
      featuredImage,
      seoTitle,
      seoDescription,
      updatedAt: new Date(),
    },
  });

  if (existing.ContentBlock.length > 0) {
    await prisma.contentBlock.update({
      where: { id: existing.ContentBlock[0].id },
      data: { content: contentData as any, updatedAt: new Date() }
    });
  } else {
    await prisma.contentBlock.create({
      data: {
        id: crypto.randomUUID(),
        pageId: id,
        type: "RICH_TEXT",
        title: "Page Data",
        content: contentData as any,
        updatedAt: new Date()
      }
    });
  }

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "page_updated", entityType: "CmsPage", entityId: id, metadata: { title } },
  });

  revalidatePath("/admin/pages-cms");
  revalidatePath(`/${existing.slug === "home" ? "" : existing.slug}`);
  if (existing.slug === "home") {
    updateHomeCache();
  } else {
    updateCmsPageCache();
  }
}

export async function deleteCmsPage(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.cmsPage.findUnique({ where: { id } });
  if (!existing) return;

  // Prevent deleting critical pages
  if (["home", "about", "contact"].includes(existing.slug)) {
    return; // Silently fail or throw error
  }

  await prisma.cmsPage.delete({ where: { id } });
  revalidatePath("/admin/pages-cms");
  updateCmsPageCache();
}

// ─── BRAND ASSETS ─────────────────────────────────────────────────────────────

export async function updateBrandAsset(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const name = sanitize(formData.get("name") as string || "");
  const mediaUrl = sanitize(formData.get("mediaUrl") as string || "");
  const altText = sanitize(formData.get("altText") as string || "");
  const usageContext = sanitize(formData.get("usageContext") as string || "");
  const isActive = formData.get("isActive") === "true";

  await prisma.brandAsset.update({
    where: { id },
    data: {
      name,
      mediaUrl,
      altText,
      usageContext,
      isActive,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "brand_asset_updated", entityType: "BrandAsset", entityId: id, metadata: { name } },
  });

  revalidatePath("/admin/brand-assets");
  revalidatePath("/", "layout");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.brandAssets);
  redirect("/admin/brand-assets");
}

// ─── NAV MENUS & ITEMS ────────────────────────────────────────────────────────

export async function createMenu(formData: FormData) {
  await requireAdmin();
  const name = sanitize(formData.get("name") as string || "");
  const location = sanitize(formData.get("location") as string || "");
  const isActive = formData.get("isActive") !== "false";

  await prisma.menu.create({
    data: {
      id: crypto.randomUUID(),
      name,
      location,
      isActive,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.navigation);
}

export async function updateMenu(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const name = sanitize(formData.get("name") as string || "");
  const location = sanitize(formData.get("location") as string || "");
  const isActive = formData.get("isActive") !== "false";

  await prisma.menu.update({
    where: { id },
    data: { name, location, isActive },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.navigation);
}

export async function deleteMenu(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.menu.delete({ where: { id } });
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.navigation);
}

export async function createMenuItem(formData: FormData) {
  await requireAdmin();
  const menuId = formData.get("menuId") as string;
  const parentId = formData.get("parentId") as string || null;
  const label = sanitize(formData.get("label") as string || "");
  const url = sanitize(formData.get("url") as string || "");
  const pageId = formData.get("pageId") as string || null;
  const iconKey = sanitize(formData.get("iconKey") as string || "");
  const sortOrder = parseInt(formData.get("sortOrder") as string || "0", 10);
  const isVisible = formData.get("isVisible") !== "false";
  const openInNewTab = formData.get("openInNewTab") === "true";

  await prisma.menuItem.create({
    data: {
      id: crypto.randomUUID(),
      menuId,
      parentId,
      label,
      url,
      pageId,
      iconKey,
      sortOrder,
      isVisible,
      openInNewTab,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.navigation);
}

export async function updateMenuItem(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const label = sanitize(formData.get("label") as string || "");
  const url = sanitize(formData.get("url") as string || "");
  const pageId = formData.get("pageId") as string || null;
  const iconKey = sanitize(formData.get("iconKey") as string || "");
  const isVisible = formData.get("isVisible") !== "false";
  const openInNewTab = formData.get("openInNewTab") === "true";
  const parentId = formData.get("parentId") as string || null;

  await prisma.menuItem.update({
    where: { id },
    data: {
      label,
      url,
      pageId,
      iconKey,
      isVisible,
      openInNewTab,
      parentId,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.navigation);
}

export async function deleteMenuItem(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.navigation);
}

export async function reorderMenuItems(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  for (let i = 0; i < ids.length; i++) {
    await prisma.menuItem.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.navigation);
}

// ─── FOOTER BUILDER ──────────────────────────────────────────────────────────

export async function createFooterSection(formData: FormData) {
  await requireAdmin();
  const title = sanitize(formData.get("title") as string || "");
  const description = sanitize(formData.get("description") as string || "");
  const sortOrder = parseInt(formData.get("sortOrder") as string || "0", 10);
  const isVisible = formData.get("isVisible") !== "false";

  await prisma.footerSection.create({
    data: {
      id: crypto.randomUUID(),
      title,
      description,
      sortOrder,
      isVisible,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function updateFooterSection(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const description = sanitize(formData.get("description") as string || "");
  const isVisible = formData.get("isVisible") !== "false";

  await prisma.footerSection.update({
    where: { id },
    data: { title, description, isVisible },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function deleteFooterSection(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.footerSection.delete({ where: { id } });
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function reorderFooterSections(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  for (let i = 0; i < ids.length; i++) {
    await prisma.footerSection.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function createFooterLink(formData: FormData) {
  await requireAdmin();
  const footerSectionId = formData.get("footerSectionId") as string;
  const label = sanitize(formData.get("label") as string || "");
  const url = sanitize(formData.get("url") as string || "");
  const pageId = formData.get("pageId") as string || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string || "0", 10);
  const isVisible = formData.get("isVisible") !== "false";
  const openInNewTab = formData.get("openInNewTab") === "true";

  await prisma.footerLink.create({
    data: {
      id: crypto.randomUUID(),
      footerSectionId,
      label,
      url,
      pageId,
      sortOrder,
      isVisible,
      openInNewTab,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function updateFooterLink(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const label = sanitize(formData.get("label") as string || "");
  const url = sanitize(formData.get("url") as string || "");
  const pageId = formData.get("pageId") as string || null;
  const isVisible = formData.get("isVisible") !== "false";
  const openInNewTab = formData.get("openInNewTab") === "true";

  await prisma.footerLink.update({
    where: { id },
    data: {
      label,
      url,
      pageId,
      isVisible,
      openInNewTab,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function deleteFooterLink(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.footerLink.delete({ where: { id } });
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function reorderFooterLinks(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  for (let i = 0; i < ids.length; i++) {
    await prisma.footerLink.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

// ─── PARTNER LOGOS ────────────────────────────────────────────────────────────

export async function createPartnerLogo(formData: FormData) {
  await requireAdmin();
  const name = sanitize(formData.get("name") as string || "");
  const category = sanitize(formData.get("category") as string || "");
  const description = sanitize(formData.get("description") as string || "");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const altText = sanitize(formData.get("altText") as string || "");
  const websiteUrl = sanitize(formData.get("websiteUrl") as string || "");
  const isFeatured = formData.get("isFeatured") === "true";
  const isVisible = formData.get("isVisible") === "true";
  const trustPublication = trustPublicationData(formData, false);

  await prisma.partnerLogo.create({
    data: {
      id: crypto.randomUUID(),
      name,
      category,
      description,
      logoUrl,
      altText,
      websiteUrl,
      isFeatured,
      isVisible,
      ...trustPublication,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.partners);
}

export async function updatePartnerLogo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const name = sanitize(formData.get("name") as string || "");
  const category = sanitize(formData.get("category") as string || "");
  const description = sanitize(formData.get("description") as string || "");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const altText = sanitize(formData.get("altText") as string || "");
  const websiteUrl = sanitize(formData.get("websiteUrl") as string || "");
  const isFeatured = formData.get("isFeatured") === "true";
  const isVisible = formData.get("isVisible") === "true";
  const trustPublication = trustPublicationData(formData, false);

  await prisma.partnerLogo.update({
    where: { id },
    data: {
      name,
      category,
      description,
      logoUrl,
      altText,
      websiteUrl,
      isFeatured,
      isVisible,
      ...trustPublication,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.partners);
}

export async function deletePartnerLogo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.partnerLogo.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.partners);
}

export async function reorderPartnerLogos(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  for (let i = 0; i < ids.length; i++) {
    await prisma.partnerLogo.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }
  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.partners);
}

// ─── TRUSTED LOGOS ────────────────────────────────────────────────────────────

export async function createTrustedLogo(formData: FormData) {
  await requireAdmin();
  const companyName = sanitize(formData.get("companyName") as string || "");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const altText = sanitize(formData.get("altText") as string || "");
  const websiteUrl = sanitize(formData.get("websiteUrl") as string || "");
  const isFeatured = formData.get("isFeatured") === "true";
  const isVisible = formData.get("isVisible") === "true";
  const trustPublication = trustPublicationData(formData, true);

  await prisma.trustedBusinessLogo.create({
    data: {
      id: crypto.randomUUID(),
      companyName,
      logoUrl,
      altText,
      websiteUrl,
      isFeatured,
      isVisible,
      ...trustPublication,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.trustedLogos);
}

export async function updateTrustedLogo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const companyName = sanitize(formData.get("companyName") as string || "");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const altText = sanitize(formData.get("altText") as string || "");
  const websiteUrl = sanitize(formData.get("websiteUrl") as string || "");
  const isFeatured = formData.get("isFeatured") === "true";
  const isVisible = formData.get("isVisible") === "true";
  const trustPublication = trustPublicationData(formData, true);

  await prisma.trustedBusinessLogo.update({
    where: { id },
    data: {
      companyName,
      logoUrl,
      altText,
      websiteUrl,
      isFeatured,
      isVisible,
      ...trustPublication,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.trustedLogos);
}

export async function deleteTrustedLogo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.trustedBusinessLogo.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.trustedLogos);
}

export async function reorderTrustedLogos(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  for (let i = 0; i < ids.length; i++) {
    await prisma.trustedBusinessLogo.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }
  revalidatePath("/", "layout");
  revalidatePath("/");
  updateHomeCache(PUBLIC_CACHE_TAGS.trustedLogos);
}

// ─── COMPLIANCE CARDS ─────────────────────────────────────────────────────────

export async function createComplianceCard(formData: FormData) {
  await requireAdmin();
  const title = sanitize(formData.get("title") as string || "");
  const description = sanitize(formData.get("description") as string || "");
  const category = sanitize(formData.get("category") as string || "");
  const iconKey = sanitize(formData.get("iconKey") as string || "Shield");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const status = sanitize(formData.get("status") as string || "Framework followed");
  const externalUrl = sanitize(formData.get("externalUrl") as string || "");
  const rawLocation = sanitize(formData.get("displayLocation") as string || "homepage");
  const showInFooter = formData.get("showInFooter") === "on";
  const isVisible = formData.get("isVisible") === "true";
  const trustPublication = trustPublicationData(formData, false);

  let locations = rawLocation
    .split(",")
    .map(l => l.trim().toLowerCase())
    .filter(l => l !== "footer" && l !== "");
  if (showInFooter) {
    locations.push("footer");
  }
  const displayLocation = locations.join(",");

  await prisma.complianceCard.create({
    data: {
      id: crypto.randomUUID(),
      title,
      description,
      category,
      iconKey,
      logoUrl: logoUrl || null,
      status,
      externalUrl: externalUrl || null,
      displayLocation,
      isVisible,
      ...trustPublication,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.complianceCards);
}

export async function updateComplianceCard(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const description = sanitize(formData.get("description") as string || "");
  const category = sanitize(formData.get("category") as string || "");
  const iconKey = sanitize(formData.get("iconKey") as string || "Shield");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const status = sanitize(formData.get("status") as string || "");
  const externalUrl = sanitize(formData.get("externalUrl") as string || "");
  const rawLocation = sanitize(formData.get("displayLocation") as string || "");
  const showInFooter = formData.get("showInFooter") === "on";
  const isVisible = formData.get("isVisible") === "true";
  const trustPublication = trustPublicationData(formData, false);

  let locations = rawLocation
    .split(",")
    .map(l => l.trim().toLowerCase())
    .filter(l => l !== "footer" && l !== "");
  if (showInFooter) {
    locations.push("footer");
  }
  const displayLocation = locations.join(",");

  await prisma.complianceCard.update({
    where: { id },
    data: {
      title,
      description,
      category,
      iconKey,
      logoUrl: logoUrl || null,
      status,
      externalUrl: externalUrl || null,
      displayLocation,
      isVisible,
      ...trustPublication,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.complianceCards);
}

export async function deleteComplianceCard(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.complianceCard.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidatePath("/");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.complianceCards);
}

export async function toggleComplianceCardFooter(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const card = await prisma.complianceCard.findUnique({ where: { id } });
  if (!card) return;

  let locations = card.displayLocation
    ? card.displayLocation.split(",").map(l => l.trim().toLowerCase()).filter(Boolean)
    : [];

  const hasFooter = locations.includes("footer");

  if (hasFooter) {
    locations = locations.filter(l => l !== "footer");
  } else if (!isTrustPublicationReady(card, false) || !card.publicVisibility || !card.isVisible) {
    return;
  } else {
    locations.push("footer");
  }

  await prisma.complianceCard.update({
    where: { id },
    data: { displayLocation: locations.join(",") },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.complianceCards);
}

export async function reorderComplianceCards(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  for (let i = 0; i < ids.length; i++) {
    await prisma.complianceCard.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }
  revalidatePath("/", "layout");
  revalidatePath("/");
  updatePublicShellCache();
  updateHomeCache(PUBLIC_CACHE_TAGS.complianceCards);
}

// ─── SOCIAL LINKS ────────────────────────────────────────────────────────────

export async function createSocialLink(formData: FormData) {
  await requireAdmin();
  const platform = sanitize(formData.get("platform") as string || "");
  const url = sanitize(formData.get("url") as string || "");
  const label = sanitize(formData.get("label") as string || "");
  const iconKey = sanitize(formData.get("iconKey") as string || "Globe");
  const isVisible = formData.get("isVisible") !== "false";
  const openInNewTab = formData.get("openInNewTab") !== "false";

  await prisma.socialLink.create({
    data: {
      id: crypto.randomUUID(),
      platform,
      url,
      label,
      iconKey,
      isVisible,
      openInNewTab,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function updateSocialLink(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const platform = sanitize(formData.get("platform") as string || "");
  const url = sanitize(formData.get("url") as string || "");
  const label = sanitize(formData.get("label") as string || "");
  const iconKey = sanitize(formData.get("iconKey") as string || "");
  const isVisible = formData.get("isVisible") !== "false";
  const openInNewTab = formData.get("openInNewTab") !== "false";

  await prisma.socialLink.update({
    where: { id },
    data: {
      platform,
      url,
      label,
      iconKey,
      isVisible,
      openInNewTab,
    },
  });

  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function deleteSocialLink(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.socialLink.delete({ where: { id } });
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

export async function reorderSocialLinks(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  for (let i = 0; i < ids.length; i++) {
    await prisma.socialLink.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }
  revalidatePath("/", "layout");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.shell, PUBLIC_CACHE_TAGS.footer);
}

// ─── PAGE SECTIONS ───────────────────────────────────────────────────────────

export async function createPageSection(formData: FormData) {
  await requireAdmin();
  const pageId = formData.get("pageId") as string;
  const sectionType = sanitize(formData.get("sectionType") as string || "hero");
  const title = sanitize(formData.get("title") as string || "");
  const subtitle = sanitize(formData.get("subtitle") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const mediaId = formData.get("mediaId") as string || null;
  const buttonLabel = sanitize(formData.get("buttonLabel") as string || "");
  const buttonUrl = sanitize(formData.get("buttonUrl") as string || "");
  const backgroundStyle = sanitize(formData.get("backgroundStyle") as string || "dark");
  const layoutStyle = sanitize(formData.get("layoutStyle") as string || "split");
  const settingsJsonRaw = formData.get("settingsJson") as string || "{}";
  const isVisible = formData.get("isVisible") !== "false";

  let settingsJson: Record<string, any> = {};
  try {
    settingsJson = JSON.parse(settingsJsonRaw);
  } catch (e) {}

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("settingsJson_") && typeof value === "string") {
      const propName = key.slice("settingsJson_".length);
      if (propName === "overlayOpacity") {
        settingsJson[propName] = parseFloat(value) || 0.65;
      } else {
        settingsJson[propName] = sanitize(value);
      }
    }
  }

  // Find max sort order for this page
  const maxSection = await prisma.pageSection.findFirst({
    where: { pageId },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (maxSection?.sortOrder ?? -1) + 1;

  await prisma.pageSection.create({
    data: {
      id: crypto.randomUUID(),
      pageId,
      sectionType,
      title,
      subtitle,
      body,
      mediaId,
      buttonLabel,
      buttonUrl,
      backgroundStyle,
      layoutStyle,
      settingsJson,
      sortOrder,
      isVisible,
    },
  });

  const page = await prisma.cmsPage.findUnique({ where: { id: pageId } });
  if (page) {
    revalidatePath(`/${page.slug === "home" ? "" : page.slug}`);
    if (page.slug === "home") {
      updateHomeCache();
    } else {
      updateCmsPageCache();
    }
  }
  revalidatePath("/admin/pages-cms");
}

/**
 * Update a section, changing only the fields the submitted form actually
 * carried.
 *
 * This used to read every column unconditionally and write the result, which
 * quietly destroyed content. The section form is not one form: heroes get a
 * dedicated set of inputs with no `subtitle` field and no raw settings
 * textarea, so saving a hero wrote `subtitle: ""` over the eyebrow text and
 * replaced `settingsJson` with only the keys that happened to have a matching
 * input. Editing the home hero deleted its `backgroundImage` and nothing said
 * so.
 *
 * The rule now is that an absent field means "leave it alone" and an empty
 * field means "clear it" — which is what an editor expects, and the only
 * reading under which two different forms can safely write the same row.
 */
export async function updatePageSection(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;

  const existing = await prisma.pageSection.findUnique({ where: { id } });
  if (!existing) return;

  const data: Record<string, unknown> = {};

  const textField = (field: string) => {
    if (!formData.has(field)) return;
    data[field] = sanitize((formData.get(field) as string) || "");
  };
  for (const field of ["title", "subtitle", "body", "buttonLabel", "buttonUrl", "backgroundStyle", "layoutStyle"]) {
    textField(field);
  }
  if (formData.has("mediaId")) data.mediaId = (formData.get("mediaId") as string) || null;
  if (formData.has("isVisible")) data.isVisible = formData.get("isVisible") !== "false";

  // Settings start from what is already stored rather than from an empty
  // object, so a form that shows six of a section's ten keys cannot delete the
  // other four. The raw JSON textarea, where present, is authoritative for the
  // keys it names; the individual `settingsJson_*` inputs then layer on top.
  const settingsJson: Record<string, any> = { ...((existing.settingsJson as Record<string, any>) || {}) };

  if (formData.has("settingsJson")) {
    try {
      const parsed = JSON.parse((formData.get("settingsJson") as string) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(settingsJson, parsed);
      }
    } catch {
      // Malformed JSON leaves the stored settings untouched. Silently replacing
      // them with `{}` is how a typo used to wipe a section's feature cards.
    }
  }

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("settingsJson_") || typeof value !== "string") continue;
    const propName = key.slice("settingsJson_".length);
    settingsJson[propName] = propName === "overlayOpacity" ? parseFloat(value) || 0.65 : sanitize(value);
  }
  data.settingsJson = settingsJson;

  await prisma.pageSection.update({ where: { id }, data });

  const page = await prisma.cmsPage.findUnique({ where: { id: existing.pageId } });
  if (page) {
    revalidatePath(`/${page.slug === "home" ? "" : page.slug}`);
    if (page.slug === "home") {
      updateHomeCache();
    } else {
      updateCmsPageCache();
    }
  }
  revalidatePath("/admin/pages-cms");
}

export async function deletePageSection(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.pageSection.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.pageSection.delete({ where: { id } });

  const page = await prisma.cmsPage.findUnique({ where: { id: existing.pageId } });
  if (page) {
    revalidatePath(`/${page.slug === "home" ? "" : page.slug}`);
    if (page.slug === "home") {
      updateHomeCache();
    } else {
      updateCmsPageCache();
    }
  }
  revalidatePath("/admin/pages-cms");
}

/**
 * Replaces a page's CMS sections with the reviewed content for that slug.
 *
 * Why this exists: a public page falls back to reviewed static content only
 * while it has no CMS sections at all. One thin section is enough to shadow the
 * whole fallback, which is how several pages ended up publishing far less than
 * the reviewed copy said. This puts the reviewed copy into the CMS as ordinary
 * sections an administrator can then edit, rather than forcing a choice between
 * good content and editable content.
 *
 * The previous sections are captured into the audit log before deletion, so the
 * change can be reconstructed. Delete and insert run in one transaction: a page
 * left with no sections would silently fall back to static content and hide the
 * failure.
 */
/**
 * Saves the replaceable site imagery.
 *
 * Every hero across services, industries, pages and the four engines already
 * read from this setting, but nothing wrote to it: the images were editable in
 * principle and unreachable in practice.
 *
 * Only fields the slot registry declares are accepted, so a crafted post cannot
 * write arbitrary keys into the setting. Empty values are dropped rather than
 * stored, which is what makes clearing a field restore the reviewed default
 * instead of leaving a page with no image.
 */
/**
 * Writes the reviewed legal wording into the CMS record for a policy.
 *
 * The legal pages had the opposite problem to the page sections. Their CMS
 * records held nine to twenty-two word stubs, and toPublicLegalDocument
 * deliberately rejects anything under 240 characters so a placeholder can never
 * be published as an approved policy. The site therefore showed the reviewed
 * wording while Legal Pages in the admin showed a stub, and editing it appeared
 * to do nothing because the fallback kept winning.
 *
 * This makes the CMS hold what the site actually serves, so the two agree and
 * an edit has a visible effect.
 */
export async function restoreReviewedLegalPage(formData: FormData) {
  const admin = await requireAdmin();
  const slug = (formData.get("slug") as string | null)?.trim() ?? "";

  const reviewed = getDefaultLegalDocument(slug);
  if (!reviewed) {
    redirect(`/admin/legal-pages?status=error&message=${encodeURIComponent(`No reviewed wording exists for "${slug}".`)}`);
  }

  const existing = await prisma.legalPage.findUnique({ where: { slug } });
  if (!existing) {
    redirect(`/admin/legal-pages?status=error&message=${encodeURIComponent(`No legal page exists with the slug "${slug}".`)}`);
  }

  // Sections carry the headings; paragraphs are the plain fallback. Blank lines
  // separate paragraphs, which is what readParagraphs splits on.
  const PARAGRAPH_BREAK = "\n\n";
  const body = reviewed.sections?.length
    ? reviewed.sections
        .map((section) => [section.heading, ...section.paragraphs].join(PARAGRAPH_BREAK))
        .join(PARAGRAPH_BREAK)
    : reviewed.paragraphs.join(PARAGRAPH_BREAK);

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "legal_page_restored_from_reviewed",
        entityType: "LegalPage",
        entityId: existing.id,
        // The previous wording, so this is reversible without a backup file.
        metadata: { slug, previousTitle: existing.title, previousBody: existing.body ?? "" },
      },
    }),
    prisma.legalPage.update({
      where: { slug },
      data: { title: reviewed.title, body, updatedAt: new Date() },
    }),
  ]);

  updatePublicCacheTags(PUBLIC_CACHE_TAGS.legalPages, PUBLIC_CACHE_TAGS.seo);
  revalidatePath("/admin/legal-pages");
  revalidatePath("/privacy-policy");
  revalidatePath("/terms");
  revalidatePath("/cookie-policy");

  redirect(
    `/admin/legal-pages?status=success&message=${encodeURIComponent(
      `Restored the reviewed wording for ${reviewed.title}. The previous version is in the audit log.`
    )}`
  );
}

export async function updateSiteImages(formData: FormData) {
  const admin = await requireAdmin();

  const submitted: Array<[string, string]> = [];
  for (const [field, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (!siteImageFieldNames.has(field)) continue;
    submitted.push([field, value]);
  }

  const value = buildSiteImagesValue(submitted);
  const overrideCount = Object.values(value).reduce<number>(
    (total, entry) => total + (typeof entry === "string" ? 1 : Object.keys(entry as object).length),
    0
  );

  await prisma.siteSetting.upsert({
    where: { key: "site_images" },
    create: { key: "site_images", value: value as Prisma.InputJsonValue, updatedAt: new Date() },
    update: { value: value as Prisma.InputJsonValue, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "site_images_updated",
      entityType: "SiteSetting",
      entityId: "site_images",
      metadata: { overrideCount },
    },
  });

  // Imagery appears on the home page, service pages, industry pages and the
  // shared page heroes, so every public surface that reads it has to be dropped.
  updatePublicCacheTags(
    PUBLIC_CACHE_TAGS.siteImages,
    PUBLIC_CACHE_TAGS.home,
    PUBLIC_CACHE_TAGS.services,
    PUBLIC_CACHE_TAGS.industries,
    PUBLIC_CACHE_TAGS.cmsPages,
  );
  revalidatePath("/", "layout");
  revalidatePath("/admin/site-images");

  redirect(
    `/admin/site-images?status=success&message=${encodeURIComponent(
      `Saved. ${overrideCount} image${overrideCount === 1 ? "" : "s"} replaced; the rest use the reviewed default.`
    )}`
  );
}

export async function restoreReviewedPageContent(formData: FormData) {
  const admin = await requireAdmin();
  const slug = (formData.get("slug") as string | null)?.trim() ?? "";

  const reviewed = getReviewedPage(slug);
  if (!reviewed) {
    redirect(`/admin/pages-cms?status=error&message=No reviewed content is defined for "${slug}".`);
  }

  const page = await prisma.cmsPage.findUnique({
    where: { slug },
    select: { id: true, sections: true },
  });

  if (!page) {
    redirect(`/admin/pages-cms?status=error&message=No CMS page exists with the slug "${slug}".`);
  }

  const replacedCount = page.sections.length;

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "cms_page_restored_from_reviewed",
        entityType: "CmsPage",
        entityId: page.id,
        // The full previous sections, so this is reversible without a backup file.
        metadata: { slug, replacedCount, previousSections: page.sections as unknown as Prisma.InputJsonValue },
      },
    }),
    prisma.pageSection.deleteMany({ where: { pageId: page.id } }),
    prisma.pageSection.createMany({
      data: reviewed.sections.map((section, index) => ({
        pageId: page.id,
        sectionType: section.sectionType,
        title: section.title ?? null,
        subtitle: section.subtitle ?? null,
        body: section.body ?? null,
        mediaId: section.mediaId ?? null,
        buttonLabel: section.buttonLabel ?? null,
        buttonUrl: section.buttonUrl ?? null,
        backgroundStyle: section.backgroundStyle ?? "dark",
        layoutStyle: section.layoutStyle ?? null,
        settingsJson: (section.settings ?? {}) as Prisma.InputJsonValue,
        sortOrder: index + 1,
        isVisible: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      })),
    }),
  ]);

  revalidatePath(`/${slug === "home" ? "" : slug}`);
  if (slug === "home") {
    updateHomeCache();
  } else {
    updateCmsPageCache();
  }
  revalidatePath("/admin/pages-cms");

  redirect(
    `/admin/pages-cms?status=success&message=${encodeURIComponent(
      `Restored ${reviewed.sections.length} reviewed section(s) to /${slug}, replacing ${replacedCount}. The previous version is in the audit log.`
    )}`
  );
}

export async function reorderPageSections(formData: FormData) {
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids") as string || "[]") as string[];
  const pageId = formData.get("pageId") as string;

  for (let i = 0; i < ids.length; i++) {
    await prisma.pageSection.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    });
  }

  const page = await prisma.cmsPage.findUnique({ where: { id: pageId } });
  if (page) {
    revalidatePath(`/${page.slug === "home" ? "" : page.slug}`);
    if (page.slug === "home") {
      updateHomeCache();
    } else {
      updateCmsPageCache();
    }
  }
  revalidatePath("/admin/pages-cms");
}



// ─── CAREER JOBS ─────────────────────────────────────────────────────────────

export async function createCareerJob(formData: FormData) {
  await requireAdmin();
  const title = sanitize(formData.get("title") as string || "");
  const location = sanitize(formData.get("location") as string || "Remote");
  const type = sanitize(formData.get("type") as string || "Full-time");
  const description = sanitize(formData.get("description") as string || "");

  await prisma.careerJob.create({
    data: {
      id: crypto.randomUUID(),
      title,
      location,
      type,
      description,
      visible: false,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.careers, PUBLIC_CACHE_TAGS.cmsPages);
}

export async function updateCareerJob(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const location = sanitize(formData.get("location") as string || "");
  const type = sanitize(formData.get("type") as string || "");
  const description = sanitize(formData.get("description") as string || "");

  await prisma.careerJob.update({
    where: { id },
    data: {
      title,
      location,
      type,
      description,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.careers, PUBLIC_CACHE_TAGS.cmsPages);
}

export async function toggleCareerJobPublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.careerJob.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.careerJob.update({
    where: { id },
    data: {
      visible: !existing.visible,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.careers, PUBLIC_CACHE_TAGS.cmsPages);
}

export async function deleteCareerJob(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.careerJob.delete({ where: { id } });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  updatePublicCacheTags(PUBLIC_CACHE_TAGS.careers, PUBLIC_CACHE_TAGS.cmsPages);
}

export async function createPortalUser(formData: FormData) {
  await requireAdmin();
  const name = sanitize(formData.get("name") as string || "");
  const email = sanitize(formData.get("email") as string || "").toLowerCase();
  const password = formData.get("password") as string || "";
  const clientCompanyId = formData.get("clientCompanyId") as string || "";

  if (!email || !password || !clientCompanyId) {
    throw new Error("Missing required fields.");
  }

  const { hashPassword } = await import("./password");
  const passwordHash = hashPassword(password);

  await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: name || undefined,
      email,
      passwordHash,
      role: "CLIENT",
      clientCompanyId,
      active: true,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: { 
      id: crypto.randomUUID(), 
      action: "portal_user_created", 
      entityType: "User", 
      metadata: { email, clientCompanyId } 
    },
  });

  revalidatePath("/admin/client-management");
}

/**
 * Where changeAdminPassword may send the browser afterwards.
 *
 * An allowlist rather than a validated path: the value arrives in a form field,
 * and anything reaching `redirect()` from user input is an open redirect
 * waiting to happen.
 */
const PASSWORD_RETURN_PATHS = new Set(["/admin/settings", "/admin/profile"]);

export async function changeAdminPassword(formData: FormData) {
  const admin = await requireAdmin();
  const currentPassword = formData.get("currentPassword") as string || "";
  const newPassword = formData.get("newPassword") as string || "";
  const confirmPassword = formData.get("confirmPassword") as string || "";

  const requestedReturn = formData.get("returnTo");
  const returnTo =
    typeof requestedReturn === "string" && PASSWORD_RETURN_PATHS.has(requestedReturn)
      ? requestedReturn
      : "/admin/settings";

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect(`${returnTo}?status=error&message=All password fields are required.`);
  }

  if (newPassword !== confirmPassword) {
    redirect(`${returnTo}?status=error&message=New passwords do not match.`);
  }

  if (newPassword.length < 8) {
    redirect(`${returnTo}?status=error&message=New password must be at least 8 characters long.`);
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: admin.id },
  });

  if (!userRecord || !userRecord.passwordHash) {
    redirect(`${returnTo}?status=error&message=User record not found.`);
  }

  const { verifyPassword, hashPassword } = await import("./password");

  const isOldPasswordCorrect = verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isOldPasswordCorrect) {
    redirect(`${returnTo}?status=error&message=The current password you entered is incorrect.`);
  }

  const newPasswordHash = hashPassword(newPassword);

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "admin_password_changed",
      entityType: "User",
      metadata: { email: admin.email },
    },
  });

  redirect(`${returnTo}?status=success&message=Password changed successfully.`);
}

/**
 * Updates the signed-in administrator's own display name.
 *
 * Scoped to `admin.id` rather than an id from the form, so this cannot be used
 * to edit another account. Email is deliberately not editable here: it is the
 * sign-in identifier, and changing it needs a verification step this does not
 * have.
 */
/**
 * Starts two-factor enrolment for the signed-in administrator.
 *
 * Scoped to the session's own account. There is no path here to enrol anyone
 * else, because a second factor somebody else set up is not a second factor.
 */
/** Sends the signed-in administrator a link to confirm their own address. */
export async function requestEmailVerification() {
  const admin = await requireAdmin();
  const result = await sendVerificationEmail(admin.id, SITE_URL);

  if (result.ok) {
    redirect(
      `/admin/profile?status=success&message=${encodeURIComponent(
        `Check ${admin.email}. The link expires in 24 hours.`
      )}`
    );
  }

  const message =
    result.reason === "already_verified"
      ? "That address is already verified."
      : result.reason === "no_transport"
        ? "No email transport is configured, so nothing could be sent. This is set in the " +
          "deployment's environment variables (SMTP_HOST, SMTP_USER and SMTP_PASSWORD, or " +
          "RESEND_API_KEY) rather than in Settings, which only holds the from address."
        : "The message could not be sent. Check the email settings and try again.";

  redirect(`/admin/profile?status=error&message=${encodeURIComponent(message)}`);
}

export async function startTwoFactorEnrolment() {
  const admin = await requireAdmin();
  await beginEnrolment(admin.id, admin.email);
  redirect("/admin/profile?enrol=2fa");
}

/** Confirms enrolment with a live code, and returns the recovery codes once. */
export async function confirmTwoFactorEnrolment(formData: FormData) {
  const admin = await requireAdmin();
  const code = (formData.get("code") as string | null)?.trim() ?? "";

  const result = await confirmEnrolment(admin.id, code);

  if (!result.ok) {
    const message =
      result.reason === "bad_code"
        ? "That code was not accepted. Check the time on your phone and try the current code."
        : result.reason === "rate_limited"
          ? "Too many attempts. Wait a few minutes and try again."
          : "Start the setup again.";
    redirect(`/admin/profile?enrol=2fa&status=error&message=${encodeURIComponent(message)}`);
  }

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "admin_two_factor_enabled",
      entityType: "User",
      entityId: admin.id,
      metadata: { email: admin.email },
    },
  });

  // Handed over in a one-time httpOnly cookie rather than the URL: a query
  // string would put ten working credentials into browser history and logs.
  await flashRecoveryCodes(result.recoveryCodes);
  redirect("/admin/profile");
}

/**
 * Clears the one-time recovery-code display.
 *
 * A Server Action rather than part of the page render, because Next.js permits
 * cookies to be modified only here. Doing it during the render is what turned
 * the render after a successful enrolment into a 500.
 */
export async function dismissRecoveryCodes() {
  await requireAdmin();
  await clearRecoveryCodeFlash();
  redirect("/admin/profile");
}

/** Turns two-factor off for the signed-in administrator. */
export async function turnOffTwoFactor() {
  const admin = await requireAdmin();
  await clearTwoFactor(admin.id);

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "admin_two_factor_disabled",
      entityType: "User",
      entityId: admin.id,
      metadata: { email: admin.email },
    },
  });

  redirect("/admin/profile?status=success&message=Two-factor authentication is off.");
}

/** Issues a fresh set of recovery codes, invalidating the previous ones. */
export async function issueNewRecoveryCodes() {
  const admin = await requireAdmin();
  const codes = await regenerateRecoveryCodes(admin.id);

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "admin_recovery_codes_regenerated",
      entityType: "User",
      entityId: admin.id,
      metadata: { email: admin.email },
    },
  });

  await flashRecoveryCodes(codes);
  redirect("/admin/profile");
}

export async function updateAdminProfile(formData: FormData) {
  const admin = await requireAdmin();
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (name.length > 120) {
    redirect("/admin/profile?status=error&message=Name must be 120 characters or fewer.");
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { name: name || null, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: admin.id,
      action: "admin_profile_updated",
      entityType: "User",
      metadata: { email: admin.email },
    },
  });

  revalidatePath("/admin");
  redirect("/admin/profile?status=success&message=Profile updated.");
}

export async function resetPortalUserPassword(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const clientId = formData.get("clientId") as string;
  const newPassword = formData.get("newPassword") as string || "";

  if (!userId || !newPassword) {
    throw new Error("User ID and new password are required.");
  }

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const { hashPassword } = await import("./password");
  const passwordHash = hashPassword(newPassword);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      action: "portal_user_password_reset_by_admin",
      entityType: "User",
      metadata: { email: user.email, userId },
    },
  });

  revalidatePath(`/admin/client-management?edit=${clientId}`);
}

// ─── WORK ORDERS ─────────────────────────────────────────────────────────────

export async function createWorkOrder(formData: FormData) {
  await requireAdmin();
  const clientCompanyId = formData.get("clientCompanyId") as string || null;
  const title = sanitize(formData.get("title") as string || "");
  const description = sanitize(formData.get("description") as string || "");
  const serviceType = sanitize(formData.get("serviceType") as string || "On-site Support");
  const assignedTo = sanitize(formData.get("assignedTo") as string || "");
  const contactName = sanitize(formData.get("contactName") as string || "");
  const contactEmail = sanitize(formData.get("contactEmail") as string || "");
  const scheduledAtRaw = formData.get("scheduledAt") as string;
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

  await prisma.workOrder.create({
    data: {
      id: crypto.randomUUID(),
      clientCompanyId: clientCompanyId || undefined,
      title,
      description,
      serviceType,
      assignedTo: assignedTo || undefined,
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined,
      scheduledAt,
      status: "New",
    },
  });

  revalidatePath("/admin/work-orders");
}

export async function updateWorkOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const completionNotes = sanitize(formData.get("completionNotes") as string || "");

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "Completed") {
    updateData.completedAt = new Date();
    if (completionNotes) {
      updateData.completionNotes = completionNotes;
    }
  }

  const wo = await prisma.workOrder.update({
    where: { id },
    data: updateData,
  });

  // Trigger survey if completed and triggerOnJobCompleted is true
  if (status === "Completed" && wo.contactEmail) {
    try {
      const settings = await prisma.surveySetting.findFirst();
      if (settings?.triggerOnJobCompleted === true) {
        const { triggerSurvey } = await import("./survey-actions");
        await triggerSurvey("work_order", id, wo.contactEmail, wo.contactName, wo.clientCompanyId);
      }
    } catch (err) {
      console.error("Survey work order trigger check failed:", err);
    }
  }

  revalidatePath("/admin/work-orders");
}

export async function deleteWorkOrder(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.workOrder.delete({
    where: { id },
  });
  revalidatePath("/admin/work-orders");
}


// ─── ADMIN EMAIL DISPATCH ─────────────────────────────────────────────────────

export async function sendAdminEmail(formData: FormData) {
  const administrator = await requireAdmin();
  const parsed = adminEmailSchema.safeParse({
    to: formData.get("to"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    throw new Error("Enter a valid recipient, subject and message.");
  }
  const { to, subject, body: messageBody } = parsed.data;

  const smtp = getServerSmtpConfig();
  if (!smtp) {
    throw new Error("Server-managed SMTP is not configured. Ask a Super Admin to configure the approved environment secrets.");
  }

  const nodemailer = (await import("nodemailer")).default;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
  });

  const identity = await getEmailIdentity("CYVRIX Admin");
  const fromAddress = identity.from || smtp.user;

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text: messageBody,
  });

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), userId: administrator.id, action: "admin_email_sent", entityType: "Email", metadata: { to, subject } },
  });
}

// ─── HOME PAGE CMS ────────────────────────────────────────────────────────────

export async function updateHomePageCMS(formData: FormData) {
  await requireAdmin();

  const homePage = await prisma.cmsPage.findUnique({
    where: { slug: "home" },
  });
  if (!homePage) {
    throw new Error("Homepage page record not found in database.");
  }

  // 1. Hero
  const heroSection = await prisma.pageSection.findFirst({
    where: { pageId: homePage.id, sectionType: "Hero" },
  });
  if (heroSection) {
    const heroTitle = sanitize(formData.get("hero.title") as string || "");
    const heroSubtitle = sanitize(formData.get("hero.subtitle") as string || "");
    const heroSubtitleDesc = sanitize(formData.get("hero.subtitle-desc") as string || "");
    const heroBtnLabel = sanitize(formData.get("hero.buttonLabel") as string || "");
    const heroBtnUrl = sanitize(formData.get("hero.buttonUrl") as string || "");
    const heroMediaId = sanitize(formData.get("hero.mediaId") as string || "");
    const heroSecondaryCtaLabel = sanitize(formData.get("hero.secondaryCtaLabel") as string || "");
    const heroSecondaryCtaUrl = sanitize(formData.get("hero.secondaryCtaUrl") as string || "");

    const existingSettings = (heroSection.settingsJson as Record<string, any>) || {};

    await prisma.pageSection.update({
      where: { id: heroSection.id },
      data: {
        title: heroTitle,
        subtitle: heroSubtitle,
        body: heroSubtitleDesc,
        buttonLabel: heroBtnLabel,
        buttonUrl: heroBtnUrl,
        mediaId: heroMediaId || null,
        settingsJson: {
          ...existingSettings,
          secondaryCtaLabel: heroSecondaryCtaLabel,
          secondaryCtaUrl: heroSecondaryCtaUrl,
        },
        updatedAt: new Date(),
      },
    });
  }

  // 2. Service cards
  const servicesSection = await prisma.pageSection.findFirst({
    where: { pageId: homePage.id, sectionType: "Service cards" },
  });
  if (servicesSection) {
    const servicesTitle = sanitize(formData.get("services.title") as string || "");
    const servicesSubtitle = sanitize(formData.get("services.subtitle") as string || "");
    const servicesBtnLabel = sanitize(formData.get("services.buttonLabel") as string || "");
    const servicesBtnUrl = sanitize(formData.get("services.buttonUrl") as string || "");

    await prisma.pageSection.update({
      where: { id: servicesSection.id },
      data: {
        title: servicesTitle,
        subtitle: servicesSubtitle,
        buttonLabel: servicesBtnLabel,
        buttonUrl: servicesBtnUrl,
        updatedAt: new Date(),
      },
    });
  }

  // 3. Image and text (Why Choose Us)
  const whySection = await prisma.pageSection.findFirst({
    where: { pageId: homePage.id, sectionType: "Image and text" },
  });
  if (whySection) {
    const whyTitle = sanitize(formData.get("why.title") as string || "");
    const whySubtitle = sanitize(formData.get("why.subtitle") as string || "");
    const whyBody = sanitize(formData.get("why.body") as string || "");
    const whyBtnLabel = sanitize(formData.get("why.buttonLabel") as string || "");
    const whyBtnUrl = sanitize(formData.get("why.buttonUrl") as string || "");
    const whyMediaId = sanitize(formData.get("why.mediaId") as string || "");
    const whyPointsRaw = sanitize(formData.get("why.points") as string || "");
    const whyPoints = whyPointsRaw.split("\n").map(p => p.trim()).filter(Boolean);

    await prisma.pageSection.update({
      where: { id: whySection.id },
      data: {
        title: whyTitle,
        subtitle: whySubtitle,
        body: whyBody,
        buttonLabel: whyBtnLabel,
        buttonUrl: whyBtnUrl,
        mediaId: whyMediaId || null,
        settingsJson: {
          points: whyPoints,
        },
        updatedAt: new Date(),
      },
    });
  }

  // 4. Testimonials
  const testimonialsSection = await prisma.pageSection.findFirst({
    where: { pageId: homePage.id, sectionType: "Testimonials" },
  });
  if (testimonialsSection) {
    const testTitle = sanitize(formData.get("testimonials.title") as string || "");
    const testSubtitle = sanitize(formData.get("testimonials.subtitle") as string || "");

    await prisma.pageSection.update({
      where: { id: testimonialsSection.id },
      data: {
        title: testTitle,
        subtitle: testSubtitle,
        updatedAt: new Date(),
      },
    });
  }

  // 5. CTA section
  const ctaSection = await prisma.pageSection.findFirst({
    where: { pageId: homePage.id, sectionType: "CTA section" },
  });
  if (ctaSection) {
    const ctaTitle = sanitize(formData.get("cta.title") as string || "");
    const ctaBody = sanitize(formData.get("cta.body") as string || "");
    const ctaBtnLabel = sanitize(formData.get("cta.buttonLabel") as string || "");
    const ctaBtnUrl = sanitize(formData.get("cta.buttonUrl") as string || "");

    await prisma.pageSection.update({
      where: { id: ctaSection.id },
      data: {
        title: ctaTitle,
        body: ctaBody,
        buttonLabel: ctaBtnLabel,
        buttonUrl: ctaBtnUrl,
        updatedAt: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), action: "home_page_cms_updated", entityType: "CmsPage", entityId: homePage.id },
  });

  revalidatePath("/");
  updateHomeCache();
  redirect("/admin/home-cms?status=success&message=Home+page+content+updated+successfully!");
}
