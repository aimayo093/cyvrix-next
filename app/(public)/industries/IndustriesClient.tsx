import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { industries as staticIndustries } from "@/lib/cyvrix-data";
import type { PublicIndustry } from "@/lib/public-industry";
import { PageHeroImage } from "@/components/public/PageHeroImage";

export function IndustriesClient({
  industries,
  heroImage,
  heroImageAlt,
}: {
  industries: PublicIndustry[];
  heroImage: string;
  heroImageAlt: string;
}) {
  return (
    <div className="min-h-screen bg-[#020817] pb-28 pt-20 text-white lg:pt-32">
      <section className="relative border-b border-white/10 bg-[#041635] py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(38,145,240,0.2),transparent_36%),radial-gradient(circle_at_82%_80%,rgba(6,182,212,0.12),transparent_36%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-200"><Building2 className="h-4 w-4" />Industry technology support</p>
            <h1 className="mt-6 font-outfit text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">Technology shaped by the realities of your sector.</h1>
            <p className="mt-7 text-lg leading-8 text-slate-300">CYVRIX focuses on the operational pressures behind technology decisions: people, access, connectivity, resilience and the work that cannot stop.</p>
            <p className="mt-4 text-base leading-8 text-slate-400">Every sector below sets out what it actually contends with, the priorities we would look at first, and the services most often relevant. If yours is not listed, the approach still applies.</p>
          </div>
          <PageHeroImage src={heroImage} alt={heroImageAlt} priority />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 sm:py-28">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry) => {
            const Icon = staticIndustries.find((item) => item.slug === industry.slug)?.icon || Building2;
            return (
              <article key={industry.slug} className="group flex min-h-80 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all hover:-translate-y-1 hover:border-sky-300/50 hover:bg-white/[0.06]">
                <Icon className="h-7 w-7 text-sky-300" />
                <h2 className="mt-8 font-outfit text-2xl font-black">{industry.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{industry.summary}</p>
                {industry.challenges.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{industry.challenges.slice(0, 3).map((challenge) => <span key={challenge} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">{challenge}</span>)}</div>}
                <Link href={`/industries/${industry.slug}`} className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-black text-sky-300 transition-colors group-hover:text-white">Explore sector priorities <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
