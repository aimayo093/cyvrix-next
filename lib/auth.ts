import "server-only";

import * as React from "react";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { connection } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, canManageSecurityCenter, isAdminRole } from "@/lib/roles";
import { needsSecondFactor, sessionVersionMatches } from "@/lib/session-rules";
import type { User, UserRole } from "@/generated/prisma";
export { hashPassword, verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "cyvrix_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;


type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  /** The account's sessionVersion when issued. Absent on older tokens: read as 0. */
  sv?: number;
};

type SessionUser = Pick<User, "id" | "email" | "role"> & { sessionVersion?: number };

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

/** Constant-time, so the comparison does not leak how much of a forged signature matched. */
function signatureMatches(payload: string, signature: string) {
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function createSessionToken(user: SessionUser) {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    sv: user.sessionVersion ?? 0,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !signatureMatches(encodedPayload, signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
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
  if (!body || !signature || !signatureMatches(body, signature)) return null;

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

export async function setSession(user: SessionUser) {
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

/** Where a staff account without two-factor is sent until it enrols. */
export const SECURITY_SETUP_PATH = "/security-setup";

/**
 * The signed-in account, before the two-factor rule is applied.
 *
 * A session stops working when the account is deactivated, or when its
 * sessionVersion has moved past the one the token was issued with.
 */
const readSession = React.cache(async () => {
  await connection();
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      clientCompanyId: true,
      sessionVersion: true,
      twoFactorEnrolledAt: true,
    },
  });
  if (!user?.active) return null;
  if (!sessionVersionMatches(payload.sv, user.sessionVersion)) return null;
  const { sessionVersion, twoFactorEnrolledAt, ...visible } = user;
  return {
    user: visible,
    sessionVersion,
    // Staff accounts must have a second factor (DECISIONS §6).
    needsSecondFactor: needsSecondFactor(user.role, twoFactorEnrolledAt),
  };
});

/**
 * The signed-in account, or null.
 *
 * A staff account that has not enrolled in two-factor reads as signed out
 * here, so every page, action and API route that checks a session refuses it
 * by default. Only the set-up page, through requireStaffForSecondFactorSetup,
 * accepts it.
 */
export async function getSession() {
  const session = await readSession();
  if (!session || session.needsSecondFactor) return null;
  return { user: session.user };
}

export async function requireUser() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.needsSecondFactor) redirect(SECURITY_SETUP_PATH);
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!ADMIN_ROLES.includes(user.role)) redirect("/portal");
  return user;
}

/**
 * A staff account, enrolled in two-factor or not. Only for the two-factor
 * set-up page and the actions it posts to.
 */
export async function requireStaffForSecondFactorSetup() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (!ADMIN_ROLES.includes(session.user.role)) redirect("/portal");
  return { ...session.user, needsSecondFactor: session.needsSecondFactor };
}

/**
 * Ends every session the account holds, everywhere, by moving its
 * sessionVersion on. Pass `keepCurrent` when the person acting should stay
 * signed in on this device: their cookie is reissued at the new version.
 */
export async function endAllSessions(userId: string, { keepCurrent = false } = {}) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { id: true, email: true, role: true, sessionVersion: true },
  });
  if (keepCurrent) await setSession(user);
  return user.sessionVersion;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  // An authenticated internal user who lacks the role gets an explained 403
  // rather than a silent redirect that looks like a broken link.
  if (user.role !== "SUPER_ADMIN") forbidden();
  return user;
}

// Re-exported so existing imports from "@/lib/auth" keep working.
export { isAdminRole, canManageSecurityCenter };

export function canUpdateSiteSetting(role: UserRole, key: string) {
  return role === "SUPER_ADMIN" || (role === "ADMIN" && key === "securityCenter");
}
