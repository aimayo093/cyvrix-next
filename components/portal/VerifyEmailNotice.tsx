"use client";

/**
 * Shown to a client whose address has not been confirmed.
 *
 * The link is sent when the account is created, but mail goes missing: filters,
 * typos, a full mailbox. Without a way to ask for another one the only route
 * back was to contact CYVRIX and have someone do it by hand, which is a support
 * ticket for a problem the person could solve themselves in one click.
 *
 * The request is not a public form. It runs against the session, so it cannot
 * be used to find out whether an address has an account, and the rate limit
 * lives on the action rather than here where anyone could step around it.
 */
import * as React from "react";
import { MailCheck, AlertCircle } from "lucide-react";
import { requestMyVerificationEmail } from "@/lib/portal-actions";

type Result = { ok: boolean; message: string } | null;

export function VerifyEmailNotice({ email }: { email: string }) {
  const [result, formAction, pending] = React.useActionState<Result, FormData>(
    // useActionState supplies the previous state and the form data; this action
    // needs neither, so the wrapper absorbs them rather than the server action
    // carrying two parameters it never reads.
    async () => requestMyVerificationEmail(),
    null
  );

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h4 className="font-outfit text-sm font-black uppercase tracking-wide text-amber-900">
            Confirm your email address
          </h4>
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-amber-900">
            We sent a confirmation link to <span className="font-mono">{email}</span> when your account
            was created. Until it is opened we cannot use this address for password recovery or
            security notices.
          </p>

          {result && (
            <p
              className={`mt-2 text-xs font-bold ${result.ok ? "text-emerald-700" : "text-rose-700"}`}
              role="status"
            >
              {result.message}
            </p>
          )}

          <form action={formAction} className="mt-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MailCheck className="h-3.5 w-3.5" />
              {pending ? "Sending..." : "Send the link again"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
