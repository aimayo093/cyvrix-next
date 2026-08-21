"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { clearSession, isAdminRole, setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientAddress, RateLimitError, resetRateLimit } from "@/lib/rate-limit";

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
      return { error: "Invalid email or password." };
    }

    await setSession(user);
    resetRateLimit(ipKey);
    resetRateLimit(attemptKey);
    
    // Redirect based on role
    const destination = isAdminRole(user.role) ? "/admin" : "/portal";
    return { success: true, destination };
  } catch (error) {
    if (error instanceof RateLimitError) {
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
