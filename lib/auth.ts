import "server-only";

import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { connection } from "next/server";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { User, UserRole } from "@/generated/prisma";
export { hashPassword, verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "cyvrix_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT_AGENT",
  "SALES_CRM_USER",
  "CONTENT_MANAGER",
  "FINANCE_VIEWER",
];

type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
};

function secret() {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: AUTH_SECRET environment variable is missing in production.");
    }
    return "development-only-change-me";
  }
  return s;
}

function base64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(user: Pick<User, "id" | "email" | "role">) {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) return null;
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

const PENDING_2FA_COOKIE = "cyvrix_2fa_pending";
const PENDING_2FA_TTL_SECONDS = 5 * 60;

type PendingPayload = { sub: string; exp: number };

/**
 * A short-lived marker that the password was accepted but the second factor is
 * still owed.
 *
 * Deliberately not a session: it carries no role and `getSession` will not read
 * it, so holding one grants nothing. It is signed with the same HMAC as a real
 * session so it cannot be forged, and expires in five minutes so an abandoned
 * challenge does not leave a usable half-login behind.
 */
export async function setPendingTwoFactor(userId: string) {
  const payload: PendingPayload = { sub: userId, exp: Math.floor(Date.now() / 1000) + PENDING_2FA_TTL_SECONDS };
  const body = base64url(JSON.stringify(payload));
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PENDING_2FA_TTL_SECONDS,
    path: "/",
  });
}

/** The account owing a second factor, or null. */
export async function readPendingTwoFactor(): Promise<string | null> {
  await connection();
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature || sign(body) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as PendingPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function clearPendingTwoFactor() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_2FA_COOKIE);
}

export async function setSession(user: Pick<User, "id" | "email" | "role">) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  await connection();
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, active: true, clientCompanyId: true },
  });
  if (!user?.active) return null;
  return { user };
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!ADMIN_ROLES.includes(user.role)) redirect("/portal");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  // An authenticated internal user who lacks the role gets an explained 403
  // rather than a silent redirect that looks like a broken link.
  if (user.role !== "SUPER_ADMIN") forbidden();
  return user;
}

export function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.includes(role);
}

export function canManageSecurityCenter(role: UserRole) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canUpdateSiteSetting(role: UserRole, key: string) {
  return role === "SUPER_ADMIN" || (role === "ADMIN" && key === "securityCenter");
}
