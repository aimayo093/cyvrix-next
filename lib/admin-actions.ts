"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function sanitize(v: string) {
  return v.replace(/[<>]/g, "").trim().slice(0, 20000);
}

function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
}

export async function toggleIndustryPublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.industry.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.industry.update({ where: { id }, data: { published: !existing.published, updatedAt: new Date() } });

  revalidatePath("/admin/industries-cms");
  revalidatePath("/industries");
}

export async function deleteIndustry(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.industry.delete({ where: { id } });
  revalidatePath("/admin/industries-cms");
  revalidatePath("/industries");
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  await prisma.lead.update({ where: { id }, data: { status: status as any, updatedAt: new Date() } });

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

  await prisma.ticket.update({ where: { id }, data: { status: status as any, updatedAt: new Date() } });

  // Trigger automatic survey if configured
  try {
    const t = await prisma.ticket.findUnique({ where: { id } });
    if (t) {
      let settings = await prisma.surveySetting.findFirst();
      if (!settings) {
        // Create default settings if they don't exist yet
        const { triggerSurvey } = await import("./survey-actions");
        // triggerSurvey handles settings creation automatically
      }
      settings = await prisma.surveySetting.findFirst();
      const shouldTrigger =
        (status === "CLOSED" && (settings?.triggerOnClosed !== false)) ||
        (status === "RESOLVED" && (settings?.triggerOnResolved !== false));
      
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

export async function addTicketNote(formData: FormData) {
  await requireAdmin();
  const ticketId = formData.get("ticketId") as string;
  const body = sanitize(formData.get("body") as string || "");
  const visibility = (formData.get("visibility") as string) || "internal";

  await prisma.ticketMessage.create({
    data: { id: crypto.randomUUID(), ticketId, body, visibility },
  });

  revalidatePath("/admin/ticket-management");
}

export async function closeTicket(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.ticket.update({ where: { id }, data: { status: "CLOSED", updatedAt: new Date() } });

  // Trigger automatic survey if configured
  try {
    const t = await prisma.ticket.findUnique({ where: { id } });
    if (t) {
      let settings = await prisma.surveySetting.findFirst();
      if (!settings) {
        const { triggerSurvey } = await import("./survey-actions");
      }
      settings = await prisma.surveySetting.findFirst();
      const shouldTrigger = settings?.triggerOnClosed !== false;
      
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
  await requireAdmin();
  const key = formData.get("key") as string;

  // Support dot-notation fields like value.name, value.email → build nested object
  const hasDotFields = Array.from(formData.keys()).some((k) => k.startsWith("value."));

  let value: unknown;
  if (hasDotFields) {
    // Fetch existing value and MERGE so we don't overwrite unrelated fields
    const existing = await prisma.siteSetting.findUnique({ where: { key } });
    const existingObj: Record<string, string> = (existing?.value as Record<string, string>) ?? {};
    const incoming: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      if (k.startsWith("value.") && typeof v === "string") {
        incoming[k.slice(6)] = sanitize(v);
      }
    }
    value = { ...existingObj, ...incoming };
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
    data: { id: crypto.randomUUID(), action: "site_setting_updated", entityType: "SiteSetting", metadata: { key } },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────

export async function approveTestimonial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.testimonial.update({
    where: { id },
    data: { approved: !existing.approved },
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function toggleFeaturedTestimonial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.testimonial.update({ where: { id }, data: { featured: !existing.featured } });
  revalidatePath("/admin/testimonials");
}

export async function deleteTestimonial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/admin/testimonials");
}

export async function createTestimonial(formData: FormData) {
  await requireAdmin();
  const clientName = sanitize(formData.get("clientName") as string || "");
  const company = sanitize(formData.get("company") as string || "");
  const quote = sanitize(formData.get("quote") as string || "");
  const rating = parseInt(formData.get("rating") as string || "5", 10);

  await prisma.testimonial.create({
    data: { id: crypto.randomUUID(), clientName, company, quote, rating, approved: false, featured: false },
  });

  revalidatePath("/admin/testimonials");
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
}

export async function toggleFAQPublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const existing = await prisma.fAQ.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.fAQ.update({ where: { id }, data: { published: !existing.published } });
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
}

export async function deleteFAQ(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.fAQ.delete({ where: { id } });
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
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
}

export async function deleteMenu(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.menu.delete({ where: { id } });
  revalidatePath("/", "layout");
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
}

export async function deleteMenuItem(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath("/", "layout");
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
}

export async function deleteFooterSection(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.footerSection.delete({ where: { id } });
  revalidatePath("/", "layout");
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
}

export async function deleteFooterLink(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.footerLink.delete({ where: { id } });
  revalidatePath("/", "layout");
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
  const isVisible = formData.get("isVisible") !== "false";

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
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
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
  const isVisible = formData.get("isVisible") !== "false";

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
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
}

export async function deletePartnerLogo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.partnerLogo.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidatePath("/");
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
}

// ─── TRUSTED LOGOS ────────────────────────────────────────────────────────────

export async function createTrustedLogo(formData: FormData) {
  await requireAdmin();
  const companyName = sanitize(formData.get("companyName") as string || "");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const altText = sanitize(formData.get("altText") as string || "");
  const websiteUrl = sanitize(formData.get("websiteUrl") as string || "");
  const isFeatured = formData.get("isFeatured") === "true";
  const isVisible = formData.get("isVisible") !== "false";

  await prisma.trustedBusinessLogo.create({
    data: {
      id: crypto.randomUUID(),
      companyName,
      logoUrl,
      altText,
      websiteUrl,
      isFeatured,
      isVisible,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
}

export async function updateTrustedLogo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const companyName = sanitize(formData.get("companyName") as string || "");
  const logoUrl = sanitize(formData.get("logoUrl") as string || "");
  const altText = sanitize(formData.get("altText") as string || "");
  const websiteUrl = sanitize(formData.get("websiteUrl") as string || "");
  const isFeatured = formData.get("isFeatured") === "true";
  const isVisible = formData.get("isVisible") !== "false";

  await prisma.trustedBusinessLogo.update({
    where: { id },
    data: {
      companyName,
      logoUrl,
      altText,
      websiteUrl,
      isFeatured,
      isVisible,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
}

export async function deleteTrustedLogo(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.trustedBusinessLogo.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidatePath("/");
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
  const isVisible = formData.get("isVisible") !== "false";

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
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
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
  const isVisible = formData.get("isVisible") !== "false";

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
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
}

export async function deleteComplianceCard(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.complianceCard.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidatePath("/");
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
  } else {
    locations.push("footer");
  }

  await prisma.complianceCard.update({
    where: { id },
    data: { displayLocation: locations.join(",") },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
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
}

export async function deleteSocialLink(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.socialLink.delete({ where: { id } });
  revalidatePath("/", "layout");
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
  }
  revalidatePath("/admin/pages-cms");
}

export async function updatePageSection(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const title = sanitize(formData.get("title") as string || "");
  const subtitle = sanitize(formData.get("subtitle") as string || "");
  const body = sanitize(formData.get("body") as string || "");
  const mediaId = formData.get("mediaId") as string || null;
  const buttonLabel = sanitize(formData.get("buttonLabel") as string || "");
  const buttonUrl = sanitize(formData.get("buttonUrl") as string || "");
  const backgroundStyle = sanitize(formData.get("backgroundStyle") as string || "");
  const layoutStyle = sanitize(formData.get("layoutStyle") as string || "");
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

  const existing = await prisma.pageSection.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.pageSection.update({
    where: { id },
    data: {
      title,
      subtitle,
      body,
      mediaId,
      buttonLabel,
      buttonUrl,
      backgroundStyle,
      layoutStyle,
      settingsJson,
      isVisible,
    },
  });

  const page = await prisma.cmsPage.findUnique({ where: { id: existing.pageId } });
  if (page) {
    revalidatePath(`/${page.slug === "home" ? "" : page.slug}`);
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
  }
  revalidatePath("/admin/pages-cms");
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
}

export async function deleteCareerJob(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  await prisma.careerJob.delete({ where: { id } });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
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

export async function changeAdminPassword(formData: FormData) {
  const admin = await requireAdmin();
  const currentPassword = formData.get("currentPassword") as string || "";
  const newPassword = formData.get("newPassword") as string || "";
  const confirmPassword = formData.get("confirmPassword") as string || "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/admin/settings?status=error&message=All password fields are required.");
  }

  if (newPassword !== confirmPassword) {
    redirect("/admin/settings?status=error&message=New passwords do not match.");
  }

  if (newPassword.length < 8) {
    redirect("/admin/settings?status=error&message=New password must be at least 8 characters long.");
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: admin.id },
  });

  if (!userRecord || !userRecord.passwordHash) {
    redirect("/admin/settings?status=error&message=User record not found.");
  }

  const { verifyPassword, hashPassword } = await import("./password");

  const isOldPasswordCorrect = verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isOldPasswordCorrect) {
    redirect("/admin/settings?status=error&message=The current password you entered is incorrect.");
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

  redirect("/admin/settings?status=success&message=Password changed successfully.");
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
      let settings = await prisma.surveySetting.findFirst();
      if (!settings) {
        const { triggerSurvey } = await import("./survey-actions");
      }
      settings = await prisma.surveySetting.findFirst();
      if (settings?.triggerOnJobCompleted !== false) {
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



