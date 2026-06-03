import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit = 3) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) { buckets.set(key, { count: 1, resetAt: now + 60_000 }); return; }
  if (b.count >= limit) throw new Error("Too many requests. Please wait before subscribing again.");
  b.count += 1;
}

const schema = z.object({
  email:   z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  source:  z.string().trim().max(100).optional().or(z.literal("")),
  consent: z.literal("on"),
  _hp:     z.string().max(0).optional(),
});

async function notify(to: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.MAIL_FROM ?? "CYVRIX Technologies <noreply@cyvrix.co.uk>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to,
      subject: "You are subscribed to CYVRIX Insights",
      text: "Thank you for subscribing. We will send you practical IT, cloud, and cybersecurity guidance.\n\nTo unsubscribe at any time, click the unsubscribe link in any email or visit: https://cyvrix.co.uk/unsubscribe\n\nCYVRIX Technologies",
    }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  const isJson = req.headers.get("content-type")?.includes("application/json");
  try {
    const raw: Record<string, string> = isJson
      ? await req.json()
      : Object.fromEntries([...(await req.formData()).entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

    if (raw._hp) {
      return isJson ? NextResponse.json({ success: true }) : NextResponse.redirect(new URL("/thank-you?type=newsletter", req.url), 303);
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return isJson
        ? NextResponse.json({ error: msg }, { status: 422 })
        : NextResponse.redirect(new URL(`/thank-you?type=newsletter&status=error&message=${encodeURIComponent(msg)}`, req.url), 303);
    }

    const data = parsed.data;
    rateLimit(`newsletter:${data.email}`);

    await prisma.newsletterSubscriber.upsert({
      where: { email: data.email },
      update: { status: "subscribed", source: data.source || "website", gdprConsentAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        email: data.email,
        source: data.source || "website",
        gdprConsentAt: new Date(),
      },
    });

    await notify(data.email);

    if (isJson) return NextResponse.json({ success: true }, { status: 201 });
    return NextResponse.redirect(new URL("/thank-you?type=newsletter", req.url), 303);
  } catch (err: any) {
    const msg = err?.message ?? "Subscription failed.";
    return isJson
      ? NextResponse.json({ error: msg }, { status: 500 })
      : NextResponse.redirect(new URL(`/thank-you?type=newsletter&status=error&message=${encodeURIComponent(msg)}`, req.url), 303);
  }
}
