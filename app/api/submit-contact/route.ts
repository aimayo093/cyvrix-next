import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { join } from "path";

export const dynamic = "force-dynamic";

// ─── In-memory rate limiter (per IP / email) ──────────────────────────────────
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit = 8) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  if (bucket.count >= limit) throw new Error("Too many requests. Please wait a moment and try again.");
  bucket.count += 1;
}

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
  // Honeypot – must be empty
  _hp: z.string().max(0).optional(),
});

async function notify(to: string, subject: string, body: string) {
  const siteSettings = await prisma.siteSetting.findUnique({ where: { key: "emailConfig" } });
  const emailConfig = (siteSettings?.value as Record<string, string>) || {};
  
  const apiKey = process.env.RESEND_API_KEY;
  const from = emailConfig.defaultFromEmail 
    ? `${emailConfig.defaultFromName || "CYVRIX Support"} <${emailConfig.defaultFromEmail}>`
    : process.env.MAIL_FROM ?? "CYVRIX Technologies <noreply@cyvrix.co.uk>";
  const adminTo = emailConfig.adminNotificationEmail || process.env.ADMIN_NOTIFICATION_EMAIL;

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
    let cvUrl: string | null = null;

    if (contentType.includes("application/json")) {
      raw = await req.json();
    } else {
      const fd = await req.formData();
      raw = Object.fromEntries(
        [...fd.entries()].filter(([, v]) => typeof v === "string")
      ) as Record<string, string>;

      const cvFile = fd.get("cv") as File | null;
      if (cvFile && cvFile instanceof File && cvFile.size > 0) {
        // Validate type/extension
        const allowedTypes = [
          "application/pdf", 
          "application/msword", 
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];
        const ext = cvFile.name.split(".").pop()?.toLowerCase();
        const isDoc = allowedTypes.includes(cvFile.type) || ["pdf", "doc", "docx"].includes(ext || "");

        if (!isDoc) {
          throw new Error("Invalid file type. Please upload a PDF, DOC, or DOCX document.");
        }
        if (cvFile.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error("File size must be under 10MB.");
        }

        // Save file
        const bytes = await cvFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const originalName = cvFile.name.replace(/[^a-zA-Z0-9.\-_]/g, ""); // sanitize filename
        const filename = `${uniqueSuffix}-${originalName}`;

        const uploadDir = join(process.cwd(), "public", "uploads");
        const { mkdir, writeFile } = await import("fs/promises");
        const { existsSync } = await import("fs");

        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);
        cvUrl = `/uploads/${filename}`;
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
    rateLimit(`contact:${data.email}`);

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
          cvUrl: cvUrl || undefined,
        },
      },
    });

    await notify(
      data.email,
      "CYVRIX has received your enquiry",
      `Hi ${data.name},\n\nThank you for reaching out to CYVRIX Technologies. We have received your enquiry and will respond within 1 business day.\n\nBest regards,\nCYVRIX Operations Team`
    );

    // HTML form → redirect; JSON fetch → 201
    if (contentType.includes("application/json")) {
      return NextResponse.json({ success: true }, { status: 201 });
    }
    return NextResponse.redirect(new URL("/thank-you?type=contact", req.url), 303);
  } catch (err: any) {
    const msg = err?.message ?? "Submission failed. Please try again.";
    if (req.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.redirect(
      new URL(`/thank-you?type=contact&status=error&message=${encodeURIComponent(msg)}`, req.url),
      303
    );
  }
}
