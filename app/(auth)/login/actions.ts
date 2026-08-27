"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import {
  clearPendingTwoFactor,
  clearSession,
  isAdminRole,
  readPendingTwoFactor,
  setPendingTwoFactor,
  setSession,
} from "@/lib/auth";
import { verifyChallenge } from "@/lib/two-factor";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientAddress, RateLimitError, resetRateLimit } from "@/lib/rate-limit";
import { recordAuthEvent } from "@/lib/security-events";

const authSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export async function login(formData: FormData) {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  const requestHeaders = await headers();
  const clientAddress = getClientAddress(requestHeaders);
  const ipKey = `login:ip:${clientAddress}`;
  const attemptKey = `login:ip-email:${clientAddress}:${parsed.data.email}`;

  try {
    enforceRateLimit(ipKey, { limit: 20, windowMs: 15 * 60_000 });
    enforceRateLimit(attemptKey, { limit: 5, windowMs: 15 * 60_000 });

    const user = await prisma.user.findUnique({ 
      where: { email: parsed.data.email } 
    });

    if (!user || !user.active || !verifyPassword(parsed.data.password, user.passwordHash)) {
      // Recorded so the Security Centre can see authentication pressure. The
      // reason is deliberately coarse and no password material is stored.
      await recordAuthEvent({
        action: "auth.sign_in_failed",
        userId: user?.id ?? null,
        ipAddress: clientAddress,
        metadata: {
          reason: !user ? "unknown_account" : !user.active ? "inactive_account" : "bad_credentials",
          role: user?.role ?? null,
        },
      });
      return { error: "Invalid email or password." };
    }

    // An enrolled account does not get a session from a password alone. The
    // pending marker carries no role, so holding one grants nothing until the
    // second factor is proved.
    if (user.twoFactorEnrolledAt) {
      await setPendingTwoFactor(user.id);
      resetRateLimit(ipKey);
      resetRateLimit(attemptKey);

      await recordAuthEvent({
        action: "auth.second_factor_required",
        userId: user.id,
        ipAddress: clientAddress,
        metadata: { role: user.role },
      });

      return { twoFactorRequired: true as const };
    }

    await setSession(user);
    resetRateLimit(ipKey);
    resetRateLimit(attemptKey);

    await recordAuthEvent({
      action: "auth.sign_in_succeeded",
      userId: user.id,
      ipAddress: clientAddress,
      metadata: { role: user.role, secondFactor: "not_enrolled" },
    });
    
    // Redirect based on role
    const destination = isAdminRole(user.role) ? "/admin" : "/portal";
    return { success: true, destination };
  } catch (error) {
    if (error instanceof RateLimitError) {
      await recordAuthEvent({
        action: "auth.sign_in_throttled",
        userId: null,
        ipAddress: clientAddress,
        metadata: { reason: "rate_limited" },
      });
      return { error: "Too many sign-in attempts. Please wait before trying again." };
    }

    console.error("Login error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Completes a sign-in that is waiting on a second factor.
 *
 * Accepts a TOTP code or a recovery code. The session is only issued here, so a
 * password on its own never produces one for an enrolled account.
 */
export async function submitTwoFactor(formData: FormData) {
  const code = (formData.get("code") as string | null)?.trim() ?? "";
  const requestHeaders = await headers();
  const clientAddress = getClientAddress(requestHeaders);

  const userId = await readPendingTwoFactor();
  if (!userId) {
    return { error: "That sign-in attempt has expired. Please enter your password again." };
  }

  const result = await verifyChallenge(userId, code);

  if (!result.ok) {
    await recordAuthEvent({
      action: "auth.second_factor_failed",
      userId,
      ipAddress: clientAddress,
      metadata: { reason: result.reason },
    });

    if (result.reason === "rate_limited") {
      return { error: "Too many attempts. Please wait before trying again." };
    }
    if (result.reason === "not_enrolled") {
      await clearPendingTwoFactor();
      return { error: "Two-factor is not set up on this account. Please sign in again." };
    }
    return { error: "That code was not accepted. Check your authenticator, or use a recovery code." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, active: true },
  });

  if (!user?.active) {
    await clearPendingTwoFactor();
    return { error: "This account is no longer active." };
  }

  await setSession(user);
  await clearPendingTwoFactor();

  await recordAuthEvent({
    action: "auth.sign_in_succeeded",
    userId: user.id,
    ipAddress: clientAddress,
    metadata: {
      role: user.role,
      secondFactor: result.usedRecoveryCode ? "recovery_code" : "authenticator",
      recoveryCodesRemaining: result.recoveryCodesRemaining,
    },
  });

  return {
    success: true as const,
    destination: isAdminRole(user.role) ? "/admin" : "/portal",
    usedRecoveryCode: result.usedRecoveryCode,
    recoveryCodesRemaining: result.recoveryCodesRemaining,
  };
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
