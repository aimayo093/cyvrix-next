import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { RateLimitError, enforceRateLimit, getClientAddress } from "@/lib/rate-limit";

/**
 * POST /api/auth/logout
 *
 * POST only, deliberately. A GET that clears the session can be triggered by
 * any page on the internet with `<img src="https://cyvrix.co.uk/api/auth/logout">`
 * — the browser sends the cookie, the session dies, and the administrator is
 * signed out by a page they were only reading. Not an account takeover, but a
 * denial of service anybody can aim at a signed-in user for free.
 *
 * Every caller already posts a form, so this removes a route nothing used.
 */
export async function POST(request: Request) {
  // A form post from another origin still carries the cookie. Sec-Fetch-Site is
  // set by the browser and cannot be forged from script, so it is the check
  // that actually holds; the Origin comparison is the fallback for clients that
  // do not send it.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return new Response("Cross-origin sign-out is not permitted.", { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    if (!host || new URL(origin).host !== host) {
      return new Response("Cross-origin sign-out is not permitted.", { status: 403 });
    }
  }

  // Generous, because a person who cannot sign out is a worse outcome than an
  // endpoint being hammered — and the origin check above already means this
  // cannot be aimed at somebody else's session from another page.
  try {
    enforceRateLimit(`logout:${getClientAddress(request.headers)}`, { limit: 30, windowMs: 60_000 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response("Too many requests.", { status: 429 });
    }
    throw error;
  }

  await clearSession();
  redirect("/login");
}
