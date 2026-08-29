import { KeyRound, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/shared/Button";
import {
  confirmTwoFactorEnrolment,
  dismissRecoveryCodes,
  issueNewRecoveryCodes,
  startTwoFactorEnrolment,
  turnOffTwoFactor,
} from "@/lib/admin-actions";
import type { EnrolmentOffer } from "@/lib/two-factor";
import type { TwoFactorState } from "@/lib/two-factor";

/**
 * Two-factor authentication on the signed-in administrator's own account.
 *
 * Three states, and the screen only ever shows one: not set up, mid-enrolment
 * with a QR to scan, or on. Recovery codes appear exactly once, immediately
 * after they are generated, because they are stored hashed and cannot be read
 * back.
 */
export function TwoFactorPanel({
  state,
  offer,
  recoveryCodes,
  error,
}: {
  state: TwoFactorState;
  /** Present only while enrolling. */
  offer: EnrolmentOffer | null;
  /** Present only in the one render right after they are issued. */
  recoveryCodes: string[] | null;
  error: string | null;
}) {
  if (recoveryCodes) {
    return (
      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-outfit font-black text-amber-900">Save these recovery codes now</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-amber-900">
              This is the only time they are shown. Each one signs you in once if you lose your phone.
              There is no password reset on this site, so without these a lost device means a lost
              account. Print them, or put them in a password manager.
            </p>
          </div>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {recoveryCodes.map((code) => (
            <li
              key={code}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-center font-mono text-sm font-bold tracking-wider text-amber-900"
            >
              {code}
            </li>
          ))}
        </ul>

        {/* A form, not a link. Navigating away used to leave the clearing to
            the next render, and a render cannot clear a cookie — which is what
            produced a 500 on the one screen these codes are ever shown. */}
        <form action={dismissRecoveryCodes}>
          <button
            type="submit"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
          >
            I have saved them
          </button>
        </form>
      </section>
    );
  }

  if (offer) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-[#2691F0]" />
          <div>
            <h2 className="font-outfit font-black text-[#041635]">Set up your authenticator</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
              Scan this with Google Authenticator, Microsoft Authenticator, 1Password or any app that
              supports time-based codes, then enter the code it shows to confirm it works.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          {/* Inline SVG rather than an image URL, so the secret never leaves the page. */}
          <div
            className="w-[200px] shrink-0 rounded-xl border border-slate-200 bg-white p-3"
            aria-label="QR code for authenticator setup"
            dangerouslySetInnerHTML={{ __html: offer.qrSvg }}
          />

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Or enter this key by hand
            </p>
            <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2.5 font-mono text-sm font-bold tracking-wider text-[#041635]">
              {offer.secret}
            </p>

            <form action={confirmTwoFactorEnrolment} className="mt-6 space-y-3">
              <label htmlFor="enrol-code" className="block text-xs font-black uppercase tracking-wider text-slate-500">
                Code from your app
              </label>
              <input
                id="enrol-code"
                name="code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-full max-w-[220px] rounded-xl border border-slate-200 px-4 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] text-[#041635] outline-none transition-colors focus:border-[#2691F0] focus:ring-2 focus:ring-[#2691F0]/20"
              />
              <div>
                <Button type="submit" variant="premium" className="h-auto px-5 py-2.5 text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  Confirm and turn on
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  if (state.enrolled) {
    const low = (state.recoveryCodesRemaining ?? 0) <= 3;

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-outfit font-black text-[#041635]">Two-factor authentication is on</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              A code from your authenticator is required at every sign-in
              {state.enrolledAt
                ? `, since ${state.enrolledAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`
                : ""}
              .
            </p>
          </div>
        </div>

        <div
          className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            low ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className={`text-sm font-semibold ${low ? "text-amber-900" : "text-slate-600"}`}>
            {state.recoveryCodesRemaining} recovery code
            {state.recoveryCodesRemaining === 1 ? "" : "s"} left
            {low ? " — worth issuing a new set." : "."}
          </p>
          <form action={issueNewRecoveryCodes}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
            >
              Issue new codes
            </button>
          </form>
        </div>

        <form action={turnOffTwoFactor} className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-3 flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-500">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            Turning this off leaves your password as the only thing protecting an administrator account,
            and the Security Center will report it.
          </p>
          <button
            type="submit"
            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Turn off two-factor
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="font-outfit font-black text-[#041635]">Two-factor authentication is off</h2>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            Your password is currently the only control protecting this account. Most real compromises
            begin with a credential rather than an exploit, which is why the Security Center reports
            this as a high finding.
          </p>
        </div>
      </div>

      <form action={startTwoFactorEnrolment} className="mt-6">
        <Button type="submit" variant="premium" className="h-auto px-5 py-2.5 text-sm">
          <Smartphone className="h-4 w-4" />
          Set up two-factor
        </Button>
      </form>
    </section>
  );
}
