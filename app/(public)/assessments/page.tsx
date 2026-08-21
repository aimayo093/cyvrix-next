import Link from "next/link";
import { ArrowRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { assessmentOffers } from "@/lib/assessment-offers";

export const metadata = {
  title: "Technology Assessments",
  description:
    "Start with a focused CYVRIX technology assessment for IT operations, Microsoft 365 security, cybersecurity, cloud or network infrastructure.",
};

export default function AssessmentsPage() {
  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#041635] pb-20 pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(38,145,240,0.24),transparent_34%)]" />
        <div className="absolute inset-0 bg-corporate-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-200">
            <ClipboardCheck className="h-4 w-4" />
            Start with useful context
          </p>
          <h1 className="mt-6 max-w-4xl font-outfit text-5xl font-black tracking-tight sm:text-6xl">
            Technology assessments that help you choose the right next step.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Choose the conversation that best fits the work in front of you. We ask for concise commercial context only; do not share passwords, access details or sensitive configurations.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {assessmentOffers.map((offer) => (
            <article key={offer.slug} className="group flex min-h-80 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:border-sky-300/50 hover:bg-white/[0.06]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">{offer.eyebrow}</p>
              <h2 className="mt-4 font-outfit text-2xl font-black text-white">{offer.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">{offer.description}</p>
              <Link href={`/assessments/${offer.slug}`} className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-black text-sky-300 group-hover:text-white">
                Start this assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-12 flex items-start gap-3 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-5 text-sm leading-7 text-sky-50">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
          <p>Each request creates a structured CRM enquiry so CYVRIX can respond with the appropriate service route. An assessment request is not a certification, penetration test or production change.</p>
        </div>
      </section>
    </div>
  );
}
