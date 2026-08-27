import { NextResponse } from "next/server";
import { reserveTicketNumber } from "@/lib/ticket-number";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEmailIdentity } from "@/lib/email-config";
import { enforcePublicSubmissionRateLimit, RateLimitError } from "@/lib/rate-limit";


function sanitize(v: string) { return v.replace(/[<>]/g, "").slice(0, 5000); }

const schema = z.object({
  name:        z.string().trim().min(1).max(200).transform(sanitize),
  email:       z.string().trim().email().max(254).transform((v) => sanitize(v.toLowerCase())),
  company:     z.string().trim().min(1).max(200).transform(sanitize),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  category:    z.string().trim().min(1).max(100).transform(sanitize),
  subject:     z.string().trim().min(1).max(300).transform(sanitize),
  description: z.string().trim().min(1).max(5000).transform(sanitize),
  existingClient: z.enum(["yes", "no"]).optional(),
  _hp: z.string().max(0).optional(),
});

/** One generator for all three entry points; see lib/ticket-number.ts. */
async function ticketNumber() {
  return reserveTicketNumber(async (candidate) =>
    (await prisma.ticket.count({ where: { ticketNumber: candidate } })) > 0
  );
}

async function notify(to: string, subject: string, body: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const identity = await getEmailIdentity("CYVRIX Support");
  const { from, adminNotificationEmail: admin } = identity;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: body }),
  }).catch(() => {});
  if (admin) await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: admin, subject: `[New ticket] ${subject}`, text: body }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  const isJson = req.headers.get("content-type")?.includes("application/json");
  try {
    const raw: Record<string, string> = isJson
      ? await req.json()
      : Object.fromEntries([...(await req.formData()).entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

    if (raw._hp) {
      return isJson
        ? NextResponse.json({ success: true })
        : NextResponse.redirect(new URL("/thank-you?type=ticket", req.url), 303);
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return isJson
        ? NextResponse.json({ error: msg }, { status: 422 })
        : NextResponse.redirect(new URL(`/thank-you?type=ticket&status=error&message=${encodeURIComponent(msg)}`, req.url), 303);
    }

    const data = parsed.data;
    enforcePublicSubmissionRateLimit("ticket", data.email, req.headers, { ipLimit: 5, emailLimit: 3 });
    const number = await ticketNumber();

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

    await notify(
      data.email,
      `CYVRIX Support Ticket ${number}`,
      `Hi ${data.name},\n\nYour support request has been logged.\nTicket: ${number}\nSubject: ${data.subject}\nPriority: ${data.priority}\n\nCYVRIX will review the request and follow up using this email address.\n\nCYVRIX Operations Team`
    );

    if (isJson) return NextResponse.json({ success: true, ticketNumber: number }, { status: 201 });
    return NextResponse.redirect(new URL(`/thank-you?type=ticket&ticket=${number}`, req.url), 303);
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      const headers = { "Retry-After": String(err.retryAfterSeconds), "Cache-Control": "no-store" };
      return isJson
        ? NextResponse.json({ error: err.message }, { status: 429, headers })
        : NextResponse.redirect(
          new URL(`/thank-you?type=ticket&status=error&message=${encodeURIComponent(err.message)}`, req.url),
          { status: 303, headers },
        );
    }

    const msg = err instanceof Error ? err.message : "Submission failed.";
    return isJson
      ? NextResponse.json({ error: msg }, { status: 500 })
      : NextResponse.redirect(new URL(`/thank-you?type=ticket&status=error&message=${encodeURIComponent(msg)}`, req.url), 303);
  }
}
