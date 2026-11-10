import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  countHit,
  getClientAddress,
  MemoryStore,
  normaliseKey,
  RateLimitError,
  type RateLimitOptions,
  type RateLimitStore,
  type Window,
} from "@/lib/rate-limit-core";

export { getClientAddress, RateLimitError };

/**
 * Rate limits shared by every server instance.
 *
 * The site runs as many short-lived instances, and each used to count on its
 * own, so attempts spread across them were barely limited. Windows now live in
 * the RateLimitBucket table and are counted with one atomic upsert. If the
 * database cannot be reached, counting falls back to this instance's memory
 * rather than letting everything through.
 *
 * Keys are stored as an HMAC, never the raw address or email: the table is a
 * list of who tried to sign in, and should say nothing to whoever reads it.
 */

const DEFAULT_WINDOW_MS = 60_000;
const memory = new MemoryStore();

function storageKey(key: string) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "development-only-change-me";
  return createHmac("sha256", secret).update(`rate-limit:${normaliseKey(key)}`).digest("base64url");
}

let lastStoreErrorAt = 0;
function reportStoreError(error: unknown) {
  // Once a minute at most, so an outage does not flood the logs.
  if (Date.now() - lastStoreErrorAt < 60_000) return;
  lastStoreErrorAt = Date.now();
  console.error("[rate-limit] Shared store unavailable; counting per instance.", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
}

const database: RateLimitStore = {
  async hit(key: string, windowMs: number, now: number): Promise<Window> {
    const nowAt = new Date(now);
    const resetAt = new Date(now + windowMs);
    // A window that has ended starts again at 1; otherwise the count rises.
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "public"."RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= ${nowAt} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${nowAt} THEN ${resetAt} ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count", "resetAt"`;
    const row = rows[0];
    if (!row) throw new Error("Rate-limit upsert returned no row.");

    // Sweep finished windows now and then, so the table stays small.
    if (Math.random() < 0.02) {
      void prisma.$executeRaw`DELETE FROM "public"."RateLimitBucket" WHERE "resetAt" < ${new Date(now - 3_600_000)}`.catch(
        () => {},
      );
    }
    return { count: Number(row.count), resetAt: new Date(row.resetAt).getTime() };
  },
  async reset(key: string) {
    await prisma.$executeRaw`DELETE FROM "public"."RateLimitBucket" WHERE "key" = ${key}`;
  },
};

/** Counts one attempt against `key`; throws RateLimitError past the limit. Always await it. */
export async function enforceRateLimit(key: string, options: RateLimitOptions) {
  return countHit(database, memory, storageKey(key), options, Date.now(), reportStoreError);
}

export async function resetRateLimit(key: string) {
  const hashed = storageKey(key);
  await memory.reset(hashed);
  await database.reset(hashed).catch(reportStoreError);
}

type PublicSubmissionLimitOptions = { emailLimit: number; ipLimit: number; windowMs?: number };

export async function enforcePublicSubmissionRateLimit(
  channel: string,
  email: string,
  headers: Headers,
  { emailLimit, ipLimit, windowMs = DEFAULT_WINDOW_MS }: PublicSubmissionLimitOptions,
) {
  const ip = getClientAddress(headers);
  await enforceRateLimit(`${channel}:ip:${ip}`, { limit: ipLimit, windowMs });
  await enforceRateLimit(`${channel}:email:${email.toLowerCase().trim()}`, { limit: emailLimit, windowMs });
}
