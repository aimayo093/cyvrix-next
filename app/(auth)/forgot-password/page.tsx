import * as React from "react";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/auth/AuthShell";
import { admitPasswordResetRequest, sendPasswordResetIfAccount } from "@/lib/password-reset";
import { RESET_REQUESTED_MESSAGE, resetRequestRedirect } from "@/lib/password-reset-core";
import { RateLimitError } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/structured-data";

export const metadata = { title: "Reset your password", robots: { index: false } };

/**
 * Step one of a self-service password reset (DECISIONS §18). Every request
 * gets the same reply, at the same speed, whether or not an account exists.
 */
export default function ForgotPasswordPage(props: { searchParams: Promise<{ sent?: string; limited?: string }> }) {
  return (
    <React.Suspense fallback={<AuthShell title="Reset your password">{null}</AuthShell>}>
      <ForgotPasswordContent {...props} />
    </React.Suspense>
  );
}

async function request(formData: FormData) {
  "use server";
  let email = "";
  let limited = false;
  try {
    email = await admitPasswordResetRequest(formData.get("email"), await headers());
  } catch (error) {
    if (error instanceof RateLimitError) limited = true;
    else console.error("[password-reset] request failed", error instanceof Error ? error.name : "error");
  }
  if (email && !limited) {
    // The account lookup and the email happen after the response, so how long
    // the reply takes never shows whether an account exists. The link is
    // built from the configured site URL, never the request's Host header.
    after(() =>
      sendPasswordResetIfAccount(email, SITE_URL).catch((error) =>
        console.error("[password-reset] send failed", error instanceof Error ? error.name : "error"),
      ),
    );
  }
  redirect(resetRequestRedirect({ limited }));
}

async function ForgotPasswordContent({ searchParams }: { searchParams: Promise<{ sent?: string; limited?: string }> }) {
  const sp = await searchParams;
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
