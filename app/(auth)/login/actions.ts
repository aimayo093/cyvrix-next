"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { clearSession, isAdminRole, setSession } from "@/lib/auth";
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

    await setSession(user);
    resetRateLimit(ipKey);
    resetRateLimit(attemptKey);

    await recordAuthEvent({
      action: "auth.sign_in_succeeded",
      userId: user.id,
      ipAddress: clientAddress,
      metadata: { role: user.role },
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

export async function signOut() {
  await clearSession();
  redirect("/login");
}
