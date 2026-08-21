import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEmailIdentity } from "@/lib/email-config";
import { enforcePublicSubmissionRateLimit, RateLimitError } from "@/lib/rate-limit";


// ─── In-memory rate limiter (per IP / email) ──────────────────────────────────
function sanitize(v: string) {
  return v.replace(/[<>]/g, "").slice(0, 5000);
}

const schema = z.object({
  name: z.string().trim().min(1).max(500).transform(sanitize),
  email: z.string().trim().email().max(254).transform((v) => sanitize(v.toLowerCase())),
  message: z.string().trim().min(1).max(5000).transform(sanitize),
  company: z.string().trim().max(500).transform(sanitize).optional().or(z.literal("")),
  service: z.string().trim().max(500).transform(sanitize).optional().or(z.literal("")),
  role: z.string().trim().max(500).transform(sanitize).optional().or(z.literal("")),
  consent: z.literal("on"),
  // Honeypot – must be empty
  _hp: z.string().max(0).optional(),
});

async function notify(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const identity = await getEmailIdentity("CYVRIX Support");
  const { from, adminNotificationEmail: adminTo } = identity;

  if (!apiKey) return; // silent in dev

  // Confirmation to visitor
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: body }),
  }).catch(() => {}); // never crash on email failure

  // Copy to admin
  if (adminTo) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: adminTo, subject: `[New enquiry] ${subject}`, text: body }),
    }).catch(() => {});
  }
}

export async function POST(req: Request) {
  try {
    // Support both JSON (fetch) and form-encoded/multipart (HTML <form method="POST">)
    const contentType = req.headers.get("content-type") ?? "";
    let raw: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      raw = await req.json();
    } else {
      const fd = await req.formData();
      raw = Object.fromEntries(
        [...fd.entries()].filter(([, v]) => typeof v === "string")
      ) as Record<string, string>;

      const attachment = [...fd.values()].find(
        (value): value is File => value instanceof File && value.size > 0
      );
      if (attachment) {
        return NextResponse.redirect(
          new URL(
            "/thank-you?type=contact&status=error&message=" +
              encodeURIComponent("Document uploads are not available through this form. Please remove the attachment and submit an enquiry instead."),
            req.url
          ),
          303
        );
      }
    }

    // Honeypot check
    if (raw._hp) {
      return NextResponse.redirect(new URL("/thank-you?type=contact", req.url));
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      const isJson = contentType.includes("application/json");
      return isJson
        ? NextResponse.json({ error: message }, { status: 422 })
        : NextResponse.redirect(new URL(`/thank-you?type=contact&status=error&message=${encodeURIComponent(message)}`, req.url));
    }

    const data = parsed.data;
    enforcePublicSubmissionRateLimit("contact", data.email, req.headers, { ipLimit: 8, emailLimit: 3 });

    await prisma.lead.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        name: data.name,
        email: data.email,
        company: data.company || undefined,
        source: "contact_form_cms",
        status: "NEW",
        payload: {
          message: data.message,
          serviceInterest: data.service,
          appliedRole: data.role || undefined,
          consentLoggedAt: new Date().toISOString(),
        },
      },
    });

    await notify(
      data.email,
      "CYVRIX has received your enquiry",
      `Hi ${data.name},\n\nThank you for reaching out to CYVRIX Technologies. We have received your enquiry and will review the details you shared before following up by email.\n\nBest regards,\nCYVRIX Operations Team`
    );

    // HTML form → redirect; JSON fetch → 201
    if (contentType.includes("application/json")) {
      return NextResponse.json({ success: true }, { status: 201 });
    }
    return NextResponse.redirect(new URL("/thank-you?type=contact", req.url), 303);
  } catch (err: unknown) {
    const isJson = req.headers.get("content-type")?.includes("application/json");
    if (err instanceof RateLimitError) {
      const headers = { "Retry-After": String(err.retryAfterSeconds), "Cache-Control": "no-store" };
      return isJson
        ? NextResponse.json({ error: err.message }, { status: 429, headers })
        : NextResponse.redirect(
          new URL(`/thank-you?type=contact&status=error&message=${encodeURIComponent(err.message)}`, req.url),
          { status: 303, headers },
        );
    }

    const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
    if (isJson) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.redirect(
      new URL(`/thank-you?type=contact&status=error&message=${encodeURIComponent(msg)}`, req.url),
      303
    );
  }
}
