import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/same-origin";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNewsletterUnsubscribeUrl } from "@/lib/newsletter-unsubscribe";
import { enforcePublicSubmissionRateLimit, RateLimitError } from "@/lib/rate-limit";


const schema = z.object({
  email:   z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  source:  z.string().trim().max(100).optional().or(z.literal("")),
  consent: z.literal("on"),
  _hp:     z.string().max(0).optional(),
});

class NewsletterDeliveryError extends Error {}

function emailTransportKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new NewsletterDeliveryError("Newsletter confirmation delivery is not configured.");
  }

  return key;
}

async function notify(key: string, to: string, unsubscribeUrl: string) {
  const from = process.env.MAIL_FROM ?? "CYVRIX Technologies <noreply@cyvrix.co.uk>";
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "CYVRIX Newsletter/1.0",
      },
      body: JSON.stringify({
        from, to,
        subject: "You are subscribed to CYVRIX Insights",
        text: `Thank you for subscribing. We will send you practical IT, cloud, and cybersecurity guidance.\n\nTo unsubscribe at any time, use this link: ${unsubscribeUrl}\n\nCYVRIX Technologies`,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
  } catch {
    throw new NewsletterDeliveryError("Newsletter confirmation could not be delivered.");
  }

  if (!response.ok) {
    throw new NewsletterDeliveryError("Newsletter confirmation could not be delivered.");
  }
}

export async function POST(req: Request) {
  // Refused before anything else runs. See lib/same-origin.ts.
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;

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
    let unsubscribeUrl: string;
    try {
      unsubscribeUrl = createNewsletterUnsubscribeUrl(data.email);
    } catch {
      const message = "Newsletter subscription is not configured. Please try again later.";
      return isJson
        ? NextResponse.json({ error: message }, { status: 503 })
        : NextResponse.redirect(new URL(`/thank-you?type=newsletter&status=error&message=${encodeURIComponent(message)}`, req.url), 303);
    }

    const transportKey = emailTransportKey();
    enforcePublicSubmissionRateLimit("newsletter", data.email, req.headers, { ipLimit: 5, emailLimit: 2 });

    await prisma.newsletterSubscriber.upsert({
      where: { email: data.email },
      update: { status: "pending", source: data.source || "website", gdprConsentAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        email: data.email,
        source: data.source || "website",
        status: "pending",
        gdprConsentAt: new Date(),
      },
    });

    await notify(transportKey, data.email, unsubscribeUrl);
    await prisma.newsletterSubscriber.update({
      where: { email: data.email },
      data: { status: "subscribed" },
    });

    if (isJson) return NextResponse.json({ success: true }, { status: 201 });
    return NextResponse.redirect(new URL("/thank-you?type=newsletter", req.url), 303);
  } catch (err: unknown) {
    const status = err instanceof RateLimitError ? 429 : err instanceof NewsletterDeliveryError ? 503 : 500;
    const msg = err instanceof RateLimitError
      ? err.message
      : err instanceof NewsletterDeliveryError
      ? "Newsletter confirmation could not be delivered. Please try again later."
      : "Subscription failed. Please try again later.";
    const headers = err instanceof RateLimitError
      ? { "Retry-After": String(err.retryAfterSeconds), "Cache-Control": "no-store" }
      : undefined;
    return isJson
      ? NextResponse.json({ error: msg }, { status, headers })
      : NextResponse.redirect(
        new URL(`/thank-you?type=newsletter&status=error&message=${encodeURIComponent(msg)}`, req.url),
        { status: 303, headers },
      );
  }
}
