import crypto from "node:crypto";

/**
 * Token and cursor handling for the Executive OS feed, kept free of Prisma and
 * `server-only` so `npm run test:feed` can exercise it directly.
 * See lib/executive-os-feed.ts for what the feed returns.
 */

export function feedToken(env: Record<string, string | undefined> = process.env): string | null {
  const t = env.EXECUTIVE_OS_FEED_TOKEN?.trim();
  return t && t.length >= 32 ? t : null;
}

/** Constant-time comparison of the bearer token, via digests of equal length. */
export function feedAuthorised(header: string | null, token: string): boolean {
  const sent = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!sent) return false;
  const a = crypto.createHash("sha256").update(sent).digest();
  const b = crypto.createHash("sha256").update(token).digest();
  return crypto.timingSafeEqual(a, b);
}

export type Position = { at: string; id: string };
export type FeedCursor = { lead?: Position; ticket?: Position; message?: Position; privacy?: Position };

const position = (v: unknown): Position | undefined => {
  if (!v || typeof v !== "object") return undefined;
  const { at, id } = v as Record<string, unknown>;
  return typeof at === "string" && !Number.isNaN(Date.parse(at)) && typeof id === "string" && id.length <= 100 ? { at, id } : undefined;
};

/** The cursor is opaque to the caller: base64url JSON of the last item per stream. */
export function parseCursor(raw: string | null): FeedCursor {
  if (!raw || raw.length > 2000) return {};
  try {
    const j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return { lead: position(j.lead), ticket: position(j.ticket), message: position(j.message), privacy: position(j.privacy) };
  } catch {
    return {};
  }
}
export const encodeCursor = (c: FeedCursor) => Buffer.from(JSON.stringify(c)).toString("base64url");
