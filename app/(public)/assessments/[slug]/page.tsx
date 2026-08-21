import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { submitAssessment } from "@/lib/actions";
import { assessmentOffers, findAssessmentOffer } from "@/lib/assessment-offers";

type AssessmentPageProps = {
  params: Promise<{ slug: string }>;
};

const organisationSizes = ["1–10", "11–50", "51–200", "201–500", "500+"];
const planningHorizons = ["Exploring options", "Within 90 days", "Within 30 days", "A time-sensitive issue"];

export function generateStaticParams() {
  return assessmentOffers.map((offer) => ({ slug: offer.slug }));
}

export async function generateMetadata({ params }: AssessmentPageProps) {
  const { slug } = await params;
  const offer = findAssessmentOffer(slug);

  if (!offer) {
    return { title: "Assessment not found" };
  }

  return {
    title: offer.title,
    description: offer.description,
  };
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { slug } = await params;
  const offer = findAssessmentOffer(slug);

  if (!offer) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <section className="border-b border-white/10 bg-[#041635] pb-16 pt-32">
        <div className="mx-auto max-w-6xl px-6">
          <Link href="/assessments" className="inline-flex items-center gap-2 text-sm font-bold text-sky-300 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            All assessments
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-sky-300">{offer.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-outfit text-5xl font-black tracking-tight sm:text-6xl">{offer.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{offer.description}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.78fr_1.22fr] lg:py-20">
        <aside>
          <h2 className="font-outfit text-3xl font-black">What this conversation is for</h2>
          <ul className="mt-7 space-y-4">
            {offer.outcomes.map((outcome) => (
              <li key={outcome} className="flex gap-3 text-sm leading-7 text-slate-300">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sky-300" />
                {outcome}
              </li>
            ))}
          </ul>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-400">
            <ShieldCheck className="mb-3 h-5 w-5 text-sky-300" />
            Please do not enter passwords, access tokens, IP addresses, configuration exports or incident details that are not needed for an initial conversation.
          </div>
        </aside>

        <div className="rounded-3xl border border-white/10 bg-[#041635] p-7 shadow-2xl shadow-sky-900/10 sm:p-10">
          <h2 className="font-outfit text-2xl font-black">Request this assessment</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Share the essentials. We will use this context to route the enquiry appropriately.</p>
          <form action={submitAssessment} className="mt-8 space-y-6">
            <input type="hidden" name="assessmentType" value={offer.slug} />
            <label className="sr-only">
              Leave this field empty
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field name="name" label="Your name" required placeholder="Alex Smith" />
              <Field name="email" label="Work email" type="email" required placeholder="alex@company.co.uk" />
              <Field name="company" label="Organisation" required placeholder="Company name" />
              <Select name="organisationSize" label="Organisation size" options={organisationSizes} />
              <Select name="assessmentScope" label={offer.scopeLabel} options={offer.scopeOptions} />
              <Select name="planningHorizon" label="When is this relevant?" options={planningHorizons} />
            </div>

            <label className="block text-sm font-bold text-slate-200">
              Useful context <span className="font-medium text-slate-500">(optional)</span>
              <textarea name="message" rows={5} placeholder="A short description of the objective, change or operational concern is enough." className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#020817] px-4 py-3 font-semibold text-white placeholder:text-slate-500 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#2691F0]" />
            </label>

            <label className="flex items-start gap-3 text-xs font-semibold leading-6 text-slate-400">
              <input name="consent" type="checkbox" required className="mt-1 accent-[#2691F0]" />
              <span>I consent to CYVRIX processing this assessment request in line with the <Link href="/privacy-policy" className="text-sky-300 underline underline-offset-2 hover:text-white">Privacy Policy</Link>.</span>
            </label>

            <button type="submit" className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#2691F0] px-6 py-4 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635]">
              Send assessment request <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Field({ name, label, type = "text", required = false, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block text-sm font-bold text-slate-200">
      {label}
      <input name={name} type={type} required={required} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 font-semibold text-white placeholder:text-slate-500 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#2691F0]" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: readonly string[] }) {
  return (
    <label className="block text-sm font-bold text-slate-200">
      {label}
      <select name={name} required className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 font-semibold text-white outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#2691F0]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
