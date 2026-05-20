"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSession, isAdminRole, setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const authSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export async function login(formData: FormData) {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { email: parsed.data.email } 
    });

    if (!user || !user.active || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return { error: "Invalid email or password." };
    }

    await setSession(user);
    
    // Redirect based on role
    const destination = isAdminRole(user.role) ? "/admin" : "/portal";
    return { success: true, destination };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
