import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth-edge";

// Basic in-memory rate limiter. A durable edge limiter should be configured before
// horizontally scaling the deployment; this protects individual runtime instances.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute
const MAX_TRACKED_CLIENTS = 10_000;

// Routes that require authentication (any role)
const PROTECTED_ROUTES = ["/portal", "/admin"];

// Routes that require an internal/admin role
const ADMIN_ROUTES = ["/admin"];

// Must mirror ADMIN_ROLES in lib/auth.ts
const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT_AGENT",
  "SALES_CRM_USER",
  "CONTENT_MANAGER",
  "FINANCE_VIEWER",
];

function getClientAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const direct = request.headers.get("x-real-ip")?.trim() || request.headers.get("cf-connecting-ip")?.trim();
  return (forwarded || direct || "unknown").slice(0, 512);
}

function pruneRateLimitMap(now: number) {
  if (rateLimitMap.size < MAX_TRACKED_CLIENTS) return;

  for (const [key, record] of rateLimitMap) {
    if (record.resetAt <= now) rateLimitMap.delete(key);
  }

  if (rateLimitMap.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey) rateLimitMap.delete(oldestKey);
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ── 1. Rate Limiting for API routes ────────────────────────────────────
  if (pathname.startsWith("/api")) {
    const ip = getClientAddress(request);
    const now = Date.now();

    const record = rateLimitMap.get(ip);
    if (!record || record.resetAt <= now) {
      pruneRateLimitMap(now);
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    } else {
      if (record.count >= MAX_REQUESTS) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.max(1, Math.ceil((record.resetAt - now) / 1_000))),
              "Cache-Control": "no-store",
            },
          }
        );
      }
      record.count += 1;
    }
  }

  // ── 2. Route protection ───────────────────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));

  if (isProtected) {
    const token = request.cookies.get("cyvrix_session")?.value;
    const session = await verifySessionToken(token);

    // No valid session → redirect to login, preserving destination
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin routes require an internal role
    const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
    if (isAdminRoute && !ADMIN_ROLES.includes(session.role)) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  // ── 3. Redirect already-authenticated users away from /login ─────────
  if (pathname === "/login") {
    const token = request.cookies.get("cyvrix_session")?.value;
    const session = await verifySessionToken(token);
    if (session) {
      const dest = ADMIN_ROLES.includes(session.role) ? "/admin" : "/portal";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
