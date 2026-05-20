import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { verifySessionToken } from "@/lib/auth-edge";

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Refresh Supabase session cookie on every request ──────────────
  const response = await updateSession(request);

  // ── 2. Route protection ───────────────────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));

  if (isProtected) {
    const token = request.cookies.get("cyvrix_session")?.value;
    const session = await verifySessionToken(token);

    // No valid session → redirect to login, preserving destination
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Copy Supabase cookies from the initial response to the redirect
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          redirectResponse.headers.append(key, value);
        }
      });
      return redirectResponse;
    }

    // Admin routes require an internal role
    const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
    if (isAdminRoute && !ADMIN_ROLES.includes(session.role)) {
      const portalRedirect = NextResponse.redirect(new URL("/portal", request.url));
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          portalRedirect.headers.append(key, value);
        }
      });
      return portalRedirect;
    }
  }

  // ── 3. Redirect already-authenticated users away from /login ─────────
  if (pathname === "/login") {
    const token = request.cookies.get("cyvrix_session")?.value;
    const session = await verifySessionToken(token);
    if (session) {
      const dest = ADMIN_ROLES.includes(session.role) ? "/admin" : "/portal";
      const authenticatedRedirect = NextResponse.redirect(new URL(dest, request.url));
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          authenticatedRedirect.headers.append(key, value);
        }
      });
      return authenticatedRedirect;
    }
  }


  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
