import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/auth/AuthShell";
import { requestPasswordReset } from "@/lib/password-reset";
import { RESET_REQUESTED_MESSAGE } from "@/lib/password-reset-core";
import { RateLimitError } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/structured-data";

export const metadata = { title: "Reset your password", robots: { index: false } };

/**
 * Step one of a self-service password reset (DECISIONS §18). Every request
 * gets the same reply, whether or not an account exists.
 */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; limited?: string }> }) {
  const sp = await searchParams;

  async function request(formData: FormData) {
    "use server";
    let limited = false;
    try {
      // The link is built from the configured site URL, never the request's
      // Host header, so it cannot be pointed at another domain.
      await requestPasswordReset(formData.get("email"), SITE_URL, await headers());
    } catch (error) {
      if (error instanceof RateLimitError) limited = true;
      else console.error("[password-reset] request failed", error instanceof Error ? error.name : "error");
    }
    redirect(limited ? "/forgot-password?limited=1" : "/forgot-password?sent=1");
  }

  return (
    <AuthShell
      title="Reset your password"
      intro="Enter the email address you sign in with. If it belongs to an account, we will email you a link to choose a new password."
    >
      {sp.sent ? (
        <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold leading-relaxed text-emerald-200">
          {RESET_REQUESTED_MESSAGE}
        </p>
      ) : (
        <form action={request} className="space-y-6">
          {sp.limited && (
            <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">
              Too many reset requests. Please wait a while and try again.
            </p>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className={authLabelClass}>Email address</label>
            <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} placeholder="name@company.co.uk" className={authInputClass} />
          </div>
          <button type="submit" className={authButtonClass}>Send reset link</button>
        </form>
      )}
    </AuthShell>
  );
}
