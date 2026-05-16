"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSession, isAdminRole, setSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const authSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(12, "Password must be at least 12 characters."),
});

const signupSchema = authSchema.extend({
  name: z.string().trim().min(2).max(120),
});

export async function login(formData: FormData) {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.active || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  await setSession(user);
  redirect(isAdminRole(user.role) ? "/admin" : "/portal");
}

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "An account already exists for this email." };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
      role: "CLIENT",
    },
  });

  redirect("/login?message=Your client account request has been created. Please sign in.");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = z.object({ email: z.string().trim().email().toLowerCase() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/thank-you?type=password-reset&status=error&message=${encodeURIComponent("Enter a valid email address.")}`);
  }

  await prisma.auditLog.create({
    data: {
      action: "password_reset_requested",
      entityType: "User",
      metadata: { email: parsed.data.email },
    },
  });

  redirect("/thank-you?type=password-reset");
}

export async function updatePassword(formData: FormData) {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/thank-you?type=password-reset&status=error&message=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid password reset request.")}`);
  }

  await prisma.user.update({
    where: { email: parsed.data.email },
    data: { passwordHash: hashPassword(parsed.data.password) },
  });

  redirect("/login?message=Password updated. Please sign in.");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
