import "server-only";
import { NextResponse } from "next/server";
import { authorise, type IntegrationScope } from "@/lib/paperclip-auth";
import { enforceRateLimit, getClientAddress, RateLimitError } from "@/lib/rate-limit";

/**
 * The gate every Paperclip route passes through, in this order:
 *
 *   1. Per-address rate limit, before the token is even compared, so the
 *      token cannot be guessed at speed.
 *   2. Scope check: 404 while the scope is switched off (the route is not
 *      advertised), 401 for a wrong or missing token.
 *   3. Per-scope rate limit on authorised calls, so a runaway agent loop
 *      cannot flood the drafts queue or the database.
 */
export const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } as const;

const LIMITS: Record<IntegrationScope, { limit: number; windowMs: number }> = {
  read: { limit: 120, windowMs: 60 * 60 * 1000 },
  draft: { limit: 60, windowMs: 60 * 60 * 1000 },
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

/** Returns a response to send when the request may not proceed, or null when it may. */
export async function guard(req: Request, scope: IntegrationScope): Promise<NextResponse | null> {
  try {
    await enforceRateLimit(`paperclip:address:${getClientAddress(req.headers)}`, { limit: 300, windowMs: 60 * 60 * 1000 });
    const result = authorise(scope, req.headers.get("authorization"));
    if (result === "off") return json({ error: "Not found" }, 404);
    if (result === "unauthorised") return json({ error: "Unauthorized" }, 401, { "WWW-Authenticate": "Bearer" });
    await enforceRateLimit(`paperclip:${scope}`, LIMITS[scope]);
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return json({ error: "Too many requests" }, 429, { "Retry-After": String(error.retryAfterSeconds) });
    }
    throw error;
  }
}
