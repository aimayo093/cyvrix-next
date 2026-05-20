"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type SubmissionType = "contact" | "quote" | "ticket" | "newsletter" | "career" | "cms";

const buckets = new Map<string, { count: number; resetAt: number }>();

const requiredText = z.string().trim().min(1).max(5000).transform(sanitize);
const optionalText = z.string().trim().max(5000).transform(sanitize).optional().or(z.literal(""));
const email = z.string().trim().email().max(254).transform((value) => sanitize(value.toLowerCase()));

const contactSchema = z.object({
  name: requiredText,
  email,
  company: optionalText,
  service: requiredText,
  businessType: optionalText,
  urgency: optionalText,
  preferredContact: optionalText,
  message: requiredText,
});

const quoteSchema = z.object({
  businessName: requiredText,
  contactName: requiredText,
  email,
  phone: optionalText,
  companySize: requiredText,
  industry: requiredText,
  service: requiredText,
  challenge: requiredText,
  urgency: requiredText,
  budget: optionalText,
  preferredTime: optionalText,
  consent: z.literal("on"),
});

const ticketSchema = z.object({
  name: requiredText,
  email,
  company: requiredText,
  priority: requiredText,
  category: requiredText,
  subject: requiredText,
  description: requiredText,
  existingClient: z.enum(["yes", "no"]).optional(),
});

const newsletterSchema = z.object({
  email,
  source: optionalText,
  consent: z.literal("on"),
});

const careerSchema = z.object({
  name: requiredText,
  email,
  role: requiredText,
  message: requiredText,
  consent: z.literal("on"),
});

const cmsSchema = z.object({
  module: requiredText,
  title: requiredText,
  status: z.string().trim().max(60).default("draft"),
});

function toObject(formData: FormData) {
  return Object.fromEntries(Array.from(formData.entries()).filter(([, value]) => typeof value === "string"));
}

function sanitize(value: string) {
  return value.replace(/[<>]/g, "").slice(0, 5000);
}

async function rateLimit(key: string, limit = 8) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }

  if (bucket.count >= limit) {
    throw new Error("Too many requests. Please wait a moment and try again.");
  }

  bucket.count += 1;
}

async function notify(template: string, to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "CYVRIX Technologies <noreply@cyvrix.co.uk>";
  const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL;
  const target = template.includes("admin") && adminTo ? adminTo : to;

  if (!apiKey || !target || target === "Set in admin settings") {
    if (process.env.NODE_ENV === "development") {
      console.info("Email notification queued", { template, to: target, subject });
    }
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: target, subject, text: body }),
  });
}

function ticketNumber() {
  const suffix = Math.floor(Date.now() / 1000).toString().slice(-6);
  return `CYV-TKT-${suffix.padStart(6, "0")}`;
}

function done(type: SubmissionType) {
  redirect(`/thank-you?type=${type}`);
}

function fail(type: SubmissionType, error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.includes("NEXT_REDIRECT")
  ) {
    throw error;
  }

  const message = error instanceof Error ? error.message : "The submission could not be processed.";
  redirect(`/thank-you?type=${type}&status=error&message=${encodeURIComponent(message)}`);
}

function parse<T>(schema: z.ZodType<T>, formData: FormData) {
  const result = schema.safeParse(toObject(formData));
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(", "));
  }
  return result.data;
}

export async function submitContact(formData: FormData) {
  try {
    const data = parse(contactSchema, formData);
    await rateLimit(`contact:${data.email}`);
    await prisma.lead.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        name: data.name,
        email: data.email,
        company: data.company || undefined,
        source: "contact_form",
        status: "NEW",
        payload: {
          serviceInterest: data.service,
          businessType: data.businessType,
          urgency: data.urgency,
          preferredContactMethod: data.preferredContact,
          message: data.message,
        },
      },
    });
    await notify("contact_acknowledgement", data.email, "CYVRIX has received your enquiry", "Thank you for contacting CYVRIX Technologies. We will review your enquiry and respond using your preferred contact method.");
    await notify("new_lead_admin", data.email, "New CYVRIX website enquiry", JSON.stringify(data, null, 2));
    done("contact");
  } catch (error) {
    fail("contact", error);
  }
}

export async function submitQuote(formData: FormData) {
  try {
    const data = parse(quoteSchema, formData);
    await rateLimit(`quote:${data.email}`, 4);
    await prisma.$transaction(async (tx) => {
      await tx.quoteRequest.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          businessName: data.businessName,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone || undefined,
          companySize: data.companySize,
          industry: data.industry,
          serviceRequired: data.service,
          currentChallenge: data.challenge,
          urgency: data.urgency,
          budgetRange: data.budget || undefined,
          preferredConsultationTime: data.preferredTime || undefined,
          gdprConsent: true,
        },
      });
      await tx.lead.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          name: data.contactName,
          email: data.email,
          company: data.businessName,
          source: "quote_request",
          status: "NEW",
          payload: data,
        },
      });
    });
    await notify("quote_acknowledgement", data.email, "CYVRIX has received your quote request", "Thank you for requesting a quote. CYVRIX Technologies will review your requirements and follow up with next steps.");
    await notify("new_quote_admin", data.email, "New CYVRIX quote request", JSON.stringify(data, null, 2));
    done("quote");
  } catch (error) {
    fail("quote", error);
  }
}

export async function submitTicket(formData: FormData) {
  try {
    const data = parse(ticketSchema, formData);
    await rateLimit(`ticket:${data.email}`, 5);
    const number = ticketNumber();
    await prisma.ticket.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        ticketNumber: number,
        name: data.name,
        email: data.email,
        company: data.company,
        priority: data.priority,
        category: data.category,
        subject: data.subject,
        description: data.description,
        existingClient: data.existingClient === "yes",
      },
    });
    await notify("ticket_created", data.email, `CYVRIX support ticket ${number}`, `Your support request has been received. Ticket number: ${number}.`);
    await notify("ticket_admin", data.email, `New support ticket ${number}`, JSON.stringify(data, null, 2));
    redirect(`/thank-you?type=ticket&ticket=${number}`);
  } catch (error) {
    fail("ticket", error);
  }
}

export async function subscribeNewsletter(formData: FormData) {
  try {
    const data = parse(newsletterSchema, formData);
    await rateLimit(`newsletter:${data.email}`, 3);
    await prisma.newsletterSubscriber.upsert({
      where: { email: data.email },
      update: { status: "subscribed", source: data.source || "website", gdprConsentAt: new Date() },
      create: { id: crypto.randomUUID(), email: data.email, source: data.source || "website", gdprConsentAt: new Date() },
    });
    await notify("newsletter_confirmation", data.email, "You are subscribed to CYVRIX insights", "Thanks for subscribing. We will send practical IT, cloud, and security guidance.");
    done("newsletter");
  } catch (error) {
    fail("newsletter", error);
  }
}

export async function submitJobApplication(formData: FormData) {
  try {
    const data = parse(careerSchema, formData);
    await rateLimit(`career:${data.email}`, 3);
    await prisma.jobApplication.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        role: data.role,
        message: data.message,
      },
    });
    await notify("career_acknowledgement", data.email, "CYVRIX has received your application", "Thank you for your interest in CYVRIX Technologies. We will review your application details.");
    done("career");
  } catch (error) {
    fail("career", error);
  }
}

export async function saveCmsDraft(formData: FormData) {
  try {
    const data = parse(cmsSchema, formData);
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: "cms_draft_saved",
        entityType: data.module,
        metadata: {
          title: data.title,
          status: data.status,
        },
      },
    });
    done("cms");
  } catch (error) {
    fail("cms", error);
  }
}
