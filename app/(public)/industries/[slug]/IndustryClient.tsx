import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, Cloud, Network, ShieldCheck, Workflow } from "lucide-react";
import type { PublicIndustry } from "@/lib/public-industry";

const focusAreas = [
  { key: "securityFocus", title: "Security and access", icon: ShieldCheck },
  { key: "infrastructureFocus", title: "Infrastructure and connectivity", icon: Network },
  { key: "cloudFocus", title: "Cloud and collaboration", icon: Cloud },
  { key: "continuityFocus", title: "Resilience and continuity", icon: Workflow },
] as const;

export function IndustryClient({ industry }: { industry: PublicIndustry }) {
  return (
    <div className="min-h-screen bg-[#020817] pb-28 pt-20 text-white lg:pt-32">
      <section className="border-b border-white/10 bg-[#041635] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Link href="/industries" className="inline-flex items-center gap-2 text-sm font-black text-sky-300 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" />All industries</Link>
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Industry technology priorities</p>
              <h1 className="mt-5 font-outfit text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl">{industry.title}</h1>
              <p className="mt-7 text-lg leading-8 text-slate-300">{industry.summary}</p>
              <Link
                href={industry.journey.consultationHref}
                className="mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#2691F0] px-7 font-bold text-white shadow-lg shadow-[#2691F0]/20 transition-colors hover:bg-white hover:text-[#041635]"
              >
                Discuss your technology priorities <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-5 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_70%_30%,rgba(38,145,240,0.3),transparent_65%)] blur-2xl"
              />
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/50">
                <Image
                  src={industry.content.image}
                  alt={industry.content.imageAlt}
                  fill
                  sizes="(min-width: 1280px) 620px, (min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#041635]/55 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">The context</p>
            <h2 className="mt-4 font-outfit text-3xl font-black tracking-tight sm:text-4xl">
              What this sector actually contends with.
            </h2>
            <div className="mt-7 space-y-5">
              {industry.content.overview.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 lg:mt-16">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">What working with us looks like</p>
            <ul className="mt-6 space-y-4">
              {industry.content.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3 text-sm leading-6 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">What deserves attention</p>
            <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Technology decisions that support the work, not just the stack.</h2>
            <div className="mt-8 space-y-4">{industry.challenges.map((challenge) => <div key={challenge} className="flex gap-3 text-sm leading-6 text-slate-300"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />{challenge}</div>)}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {focusAreas.map((area) => {
              const Icon = area.icon;
              return <article key={area.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><Icon className="h-6 w-6 text-sky-300" /><h3 className="mt-7 font-outfit text-xl font-black">{area.title}</h3><ul className="mt-4 space-y-3">{industry.journey[area.key].map((focus) => <li key={focus} className="text-sm leading-6 text-slate-400">{focus}</li>)}</ul></article>;
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#041635] py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Practical delivery priorities</p>
            <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Start with the improvement that makes the biggest operational difference.</h2>
            {industry.solutions.length > 0 && <ul className="mt-8 space-y-4">{industry.solutions.map((solution) => <li key={solution} className="flex gap-3 text-sm leading-6 text-slate-300"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />{solution}</li>)}</ul>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Services often relevant</p>
            <div className="mt-7 flex flex-wrap gap-3">{industry.services.map((service) => <span key={service} className="rounded-full border border-white/10 bg-[#020817] px-4 py-2 text-sm font-bold text-slate-200">{service}</span>)}</div>
            <Link href="/assessments/it-health-check" className="mt-10 inline-flex items-center gap-2 text-sm font-black text-sky-300 hover:text-white">Start with an IT health check <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
