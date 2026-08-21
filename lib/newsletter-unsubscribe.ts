import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function signingSecret() {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Newsletter unsubscribe signing is not configured.");
  }

  return "development-only-newsletter-unsubscribe-secret";
}

function createToken(email: string) {
  return createHmac("sha256", signingSecret())
    .update(`newsletter-unsubscribe:${email.toLowerCase().trim()}`)
    .digest("base64url");
}

function siteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Newsletter unsubscribe URL is not configured.");
    }

    return "http://localhost:3000";
  }

  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Newsletter unsubscribe URL must use HTTP or HTTPS.");
  }

  return url.origin;
}

export function createNewsletterUnsubscribeUrl(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const search = new URLSearchParams({ email: normalizedEmail, token: createToken(normalizedEmail) });
  return `${siteOrigin()}/api/unsubscribe?${search.toString()}`;
}

export function verifyNewsletterUnsubscribeToken(email: string, token?: string | null) {
  if (!token) return false;

  const expected = Buffer.from(createToken(email));
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
