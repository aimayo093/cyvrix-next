import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { companyFacts } from "@/lib/company-facts";
import { PRIVACY_REQUEST_TYPES } from "@/lib/privacy-requests";

export const metadata: Metadata = {
  title: "Make a Data Protection Request",
  description:
    "Request access to, correction of, or deletion of the personal information CYVRIX holds about you.",
  alternates: { canonical: "/privacy-request" },
};

type PageProps = {
  searchParams: Promise<{ status?: string; reference?: string; message?: string }>;
};

export default function PrivacyRequestPage(props: PageProps) {
  return (
    <div className="min-h-screen bg-[#020817] pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Your data rights
          </span>
          <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-5xl">
            Make a data protection request.
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-slate-200">
            Under UK GDPR you can ask what personal information we hold about you, have it corrected
            or deleted, restrict how it is used, or object to that use. Use this form and we will
            respond within one month.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-5 py-14">
        <React.Suspense fallback={<FormSkeleton />}>
          <RequestPanel {...props} />
        </React.Suspense>

        <aside className="mt-10 rounded-3xl border border-white/10 bg-[#071126] p-7">
          <h2 className="font-outfit text-xl font-black text-white">How we handle your request</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            <li>
              We respond within one month of receiving your request. If it is complex we will tell you
              and explain why more time is needed.
            </li>
            <li>
              We will verify who you are before disclosing any personal information. We do this by
              replying to the address you give below, so please use an address you control. We will not
              ask you to upload identity documents through this form.
            </li>
            <li>
              There is no charge for making a request.
            </li>
            <li>
              If you are unhappy with our response you can complain to the Information Commissioner&rsquo;s
              Office at ico.org.uk or on 0303 123 1113.
            </li>
          </ul>
          <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-7 text-slate-400">
            You can also contact our Data Protection Officer directly at{" "}
            <a
              href={`mailto:${companyFacts.dataProtectionOfficerEmail}`}
              className="font-black text-[#7ab8f4] underline underline-offset-4 hover:text-white"
            >
              {companyFacts.dataProtectionOfficerEmail}
            </a>
            . Our{" "}
            <Link href="/privacy-policy" className="font-black text-[#7ab8f4] underline underline-offset-4 hover:text-white">
              Privacy Policy
            </Link>{" "}
            explains what we collect and why.
          </p>
        </aside>
      </main>
    </div>
  );
}

async function RequestPanel({ searchParams }: PageProps) {
  const { status, reference, message } = await searchParams;

  if (status === "received" && reference) {
    return (
      <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/[0.07] p-8 md:p-10">
        <CheckCircle2 className="h-8 w-8 text-emerald-300" />
        <h2 className="mt-5 font-outfit text-2xl font-black text-white">Your request has been received.</h2>
        <p className="mt-4 text-base leading-8 text-slate-200">
          Your reference is <span className="font-mono font-bold text-white">{reference}</span>. Please
          quote it if you contact us about this request.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          We will reply to the address you gave, within one month. We may need to confirm your identity
          before we can release any personal information.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white"
        >
          Return to the homepage
        </Link>
      </section>
    );
  }

  return (
    <>
      {status === "error" && message && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-400/[0.07] p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
          <p className="text-sm font-semibold leading-6 text-rose-100">{message}</p>
        </div>
      )}
      <RequestForm />
    </>
  );
}

function RequestForm() {
  return (
    <form
      action="/api/privacy-request"
      method="post"
      className="rounded-3xl border border-white/10 bg-[#071126] p-7 md:p-10"
    >
            {/* Honeypot: hidden from people, filled in by bots. */}
            <input name="_hp" type="text" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <fieldset>
        <legend className="text-sm font-black text-white">What would you like us to do?</legend>
        <div className="mt-5 space-y-2.5">
          {PRIVACY_REQUEST_TYPES.map((type, index) => (
            <label
              key={type.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#2691F0]/40"
            >
              <input
                type="radio"
                name="requestType"
                value={type.value}
                required
                defaultChecked={index === 0}
                className="mt-1 h-4 w-4 shrink-0 accent-[#2691F0]"
              />
              <span>
                <span className="block text-sm font-bold text-slate-100">{type.label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">{type.article}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-black text-white">
          Your full name
          <input
            type="text"
            name="fullName"
            required
            maxLength={120}
            autoComplete="name"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
          />
        </label>
        <label className="block text-sm font-black text-white">
          Your email address
          <input
            type="email"
            name="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="name@example.co.uk"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
          />
          <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">
            Use an address you control. We reply here to confirm your identity.
          </span>
        </label>
      </div>

      <label className="mt-6 block text-sm font-black text-white">
        Anything that helps us find your information
        <textarea
          name="details"
          rows={5}
          maxLength={4000}
          placeholder="For example, when you contacted us, which email address you used, or the organisation you work for."
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
        />
        <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">
          Please do not include passwords, card details or other sensitive information.
        </span>
      </label>

      <label className="mt-7 flex items-start gap-3 text-sm leading-6 text-slate-300">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[#2691F0]" />
        <span>
          I have read the{" "}
          <Link href="/privacy-policy" className="font-black text-[#7ab8f4] underline underline-offset-4 hover:text-white">
            Privacy Policy
          </Link>{" "}
          and understand my details will be used to handle this request.
        </span>
      </label>

      <button
        type="submit"
        className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-[#2691F0] px-7 font-black text-white shadow-lg shadow-[#2691F0]/20 transition-colors hover:bg-white hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071126] sm:w-auto"
      >
        Submit request
      </button>
    </form>
  );
}

function FormSkeleton() {
  return <div className="h-96 rounded-3xl border border-white/10 bg-[#071126]" aria-hidden="true" />;
}
