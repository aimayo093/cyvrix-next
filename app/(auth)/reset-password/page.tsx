import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/auth/AuthShell";
import { checkResetToken, completePasswordReset } from "@/lib/password-reset";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-reset-core";

// The token is in this page's URL: never send it on as a referrer.
export const metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" as const };

/** Step two of a self-service password reset (DECISIONS §18). */
export default function ResetPasswordPage(props: { searchParams: Promise<{ token?: string; error?: string }> }) {
  return (
    <React.Suspense fallback={<AuthShell title="Choose a new password">{null}</AuthShell>}>
      <ResetPasswordContent {...props} />
    </React.Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  const token = sp.token ?? "";
  const check = await checkResetToken(token);

  async function reset(formData: FormData) {
    "use server";
    const submitted = String(formData.get("token") ?? "");
    const result = await completePasswordReset(submitted, formData.get("password"), formData.get("confirm"));
    // ended=1 makes the proxy show sign-in and clear the now-invalid cookie,
    // rather than bounce a still-cookied browser away from the confirmation.
    if (result.ok) redirect("/login?ended=1&reset=1");
    if (result.reason === "password") {
      redirect(`/reset-password?token=${encodeURIComponent(submitted)}&error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/reset-password?error=${encodeURIComponent(result.message)}`);
  }

  if (!check.ok) {
    return (
      <AuthShell title="This link cannot be used">
        <p className="text-sm leading-relaxed text-slate-300">
          {sp.error ?? (check.reason === "expired" ? "This reset link has expired." : "This reset link is not valid, or it has already been used.")}
        </p>
        <Link href="/forgot-password" className={`${authButtonClass} mt-6 inline-block text-center`}>Ask for a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" intro="Once it is saved, you will be signed out on every device and can sign in with the new password.">
      <form action={reset} className="space-y-6">
        {sp.error && (
          <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">{sp.error}</p>
        )}
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <label htmlFor="password" className={authLabelClass}>New password</label>
          <input id="password" name="password" type="password" required minLength={PASSWORD_MIN_LENGTH} maxLength={200} autoComplete="new-password" className={authInputClass} />
          <p className="ml-1 text-xs text-slate-500">At least {PASSWORD_MIN_LENGTH} characters. Passwords found in known data breaches are refused.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm" className={authLabelClass}>Repeat new password</label>
          <input id="confirm" name="confirm" type="password" required minLength={PASSWORD_MIN_LENGTH} maxLength={200} autoComplete="new-password" className={authInputClass} />
        </div>
        <button type="submit" className={authButtonClass}>Save new password</button>
      </form>
    </AuthShell>
  );
}
