import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth-edge";

// Basic in-memory rate limiter.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next();

  // ── 1. Rate Limiting for API routes ────────────────────────────────────
  if (pathname.startsWith("/api")) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    const record = rateLimitMap.get(ip);
    if (!record || record.lastReset < windowStart) {
      rateLimitMap.set(ip, { count: 1, lastReset: now });
    } else {
      record.count += 1;
      if (record.count > MAX_REQUESTS) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
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
