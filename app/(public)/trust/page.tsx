import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { certificationStatus, companyFacts, isIcoRegistrationCurrent } from "@/lib/company-facts";
import { ArrowRight, BadgeCheck, ClipboardCheck, FileText, Hourglass, LockKeyhole, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Trust Centre",
  description:
    "Learn how CYVRIX approaches evidence-led credentials, responsible security delivery and clear data-handling practices.",
};

const trustPrinciples = [
  {
    title: "Evidence-led credentials",
    description:
      "We publish certifications, partner relationships, customer references and testimonials only when their supporting evidence, authority and review status are current.",
    icon: ClipboardCheck,
  },
  {
    title: "Security-first delivery",
    description:
      "Technology work is approached with proportionate security, clear ownership and practical communication in mind from discovery through to delivery.",
    icon: ShieldCheck,
  },
  {
    title: "Clear data handling",
    description:
      "Our privacy information explains how we handle enquiry data. We keep requests focused on the information needed to respond appropriately.",
    icon: LockKeyhole,
  },
  {
    title: "Responsible reporting",
    description:
      "If you believe you have identified a security concern affecting CYVRIX, please contact us with enough detail for an appropriate response.",
    icon: FileText,
  },
];

export default function TrustCentrePage() {
  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <section className="border-b border-white/10 bg-[#041635] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-sky-300">
              <ShieldCheck className="h-4 w-4" />
              CYVRIX Trust Centre
            </p>
            <h1 className="mt-5 font-outfit text-5xl font-black tracking-tight sm:text-6xl">Trust should be supported by evidence.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              CYVRIX is committed to clear, responsible technology delivery. We do not use credentials, customer claims or performance statistics to create an impression that cannot be substantiated.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Our approach</p>
            <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">A dependable standard for public information.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {trustPrinciples.map((principle) => {
              const Icon = principle.icon;
              return (
                <article key={principle.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                  <Icon className="h-6 w-6 text-sky-300" />
                  <h3 className="mt-7 font-outfit text-2xl font-black">{principle.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">{principle.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#041635] py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Credentials and references</p>
            <h2 className="mt-4 font-outfit text-3xl font-black tracking-tight sm:text-4xl">Published only when ready for public scrutiny.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Each public credential, partner logo, testimonial and case study is subject to verification and, where needed, permission and expiry checks before it can appear on the website.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-6 text-sm leading-7 text-sky-50">
            Public entries are deliberately selective: current evidence and appropriate authority take priority over the volume of logos or claims.
          </div>
        </div>
      </section>

      {/* Current status: stated plainly, including what is not held. */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Where we currently stand</p>
            <h2 className="mt-4 font-outfit text-3xl font-black tracking-tight sm:text-4xl">
              What we hold, and what we are working towards.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              We would rather tell you exactly where we are than leave an impression that flatters us. This
              is the current position.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <React.Suspense fallback={<IcoCardFallback />}>
              <IcoRegistrationCard />
            </React.Suspense>

            {certificationStatus.inProgress.map((item) => (
              <article key={item.name} className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-7">
                <div className="flex items-center gap-2">
                  <Hourglass className="h-5 w-5 text-amber-300" />
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">In progress</p>
                </div>
                <h3 className="mt-6 font-outfit text-xl font-black text-white">{item.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.issuer}</p>
                <p className="mt-4 rounded-xl border border-white/10 bg-[#020817]/60 px-4 py-3 text-sm leading-6 text-slate-300">
                  {item.note}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  We will publish the certificate details here once certification is awarded, and not
                  before.
                </p>
              </article>
            ))}
          </div>

          <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-400">
            We hold no other certification or accreditation at present. Where a service page describes
            readiness work for a standard such as Cyber Essentials, that means helping you prepare and
            remediate; the certification decision rests with the certification body.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
          <h2 className="font-outfit text-4xl font-black tracking-tight sm:text-5xl">Need to discuss a technology or security concern?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Start with a practical conversation. We will help identify the most appropriate next step without making assumptions about your environment.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/book-consultation?service=General%20Technology%20Review"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#2691F0] px-7 font-bold text-white transition-colors hover:bg-white hover:text-[#041635]"
            >
              Book a Free Review <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-14 items-center justify-center rounded-md border border-white/15 px-7 font-bold text-white transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Contact CYVRIX
            </Link>
          </div>
          <Link href="/privacy-policy" className="mt-7 inline-block text-sm font-bold text-sky-300 hover:text-white">
            Read our privacy information
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * The registration reference is only published while the registration is
 * current, which needs the actual request time rather than build time. Kept in
 * its own dynamic boundary so the rest of the page stays prerendered.
 */
async function IcoRegistrationCard() {
  await connection();
  const current = isIcoRegistrationCurrent();

  return (
    <article className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-7">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-5 w-5 text-emerald-300" />
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">In place</p>
      </div>
      <h3 className="mt-6 font-outfit text-xl font-black text-white">
        Registered with the Information Commissioner&rsquo;s Office
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        {companyFacts.registeredName} is registered with the ICO as a data protection fee payer.
      </p>

      {current ? (
        <dl className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Reference</dt>
            <dd className="mt-1 font-mono font-bold tracking-wide text-white">{companyFacts.icoRegistrationNumber}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Payment tier</dt>
            <dd className="mt-1 font-semibold text-slate-200">{companyFacts.icoPaymentTier}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Registered</dt>
            <dd className="mt-1 font-semibold text-slate-200">{companyFacts.icoRegisteredOn}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Renews by</dt>
            <dd className="mt-1 font-semibold text-slate-200">{companyFacts.icoRegistrationExpires}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-5 rounded-xl border border-white/10 bg-[#020817]/60 px-4 py-3 text-sm leading-6 text-slate-300">
          The registration reference is withheld pending annual renewal.
        </p>
      )}

      <p className="mt-4 text-xs leading-6 text-slate-400">
        Verifiable on the ICO register of fee payers. Our Data Protection Officer can be contacted at{" "}
        <a
          href={`mailto:${companyFacts.dataProtectionOfficerEmail}`}
          className="font-bold text-sky-300 underline underline-offset-4 hover:text-white"
        >
          {companyFacts.dataProtectionOfficerEmail}
        </a>
        .
      </p>
    </article>
  );
}

function IcoCardFallback() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
      <div className="h-5 w-24 rounded bg-white/10" />
      <div className="mt-6 h-6 w-3/4 rounded bg-white/10" />
      <div className="mt-4 h-4 w-full rounded bg-white/5" />
    </div>
  );
}
