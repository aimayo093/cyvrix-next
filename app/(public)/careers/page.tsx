import * as React from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MapPin } from "lucide-react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("careers");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Careers",
    description: page?.seoDescription || "Join CYVRIX Technologies and help us build calm, secure, and resilient technology operations.",
  };
}

export default async function CareersPage() {
  const { pageData, careerJobs } = await getPublicPageData("careers");
  const sections = pageData?.sections || [];

  return (
    <div className="min-h-screen bg-[#020817]">
      {sections.length > 0 ? (
        <SectionRenderer sections={sections} careerJobs={careerJobs} />
      ) : (
        <CareersFallback jobs={careerJobs} />
      )}
    </div>
  );
}

function CareersFallback({
  jobs,
}: {
  jobs: Array<{ id: string; title: string; location: string | null; type: string | null; description: string | null }>;
}) {
  const hasJobs = jobs.length > 0;

  return (
    <div className="pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <span className="inline-flex rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
            Careers
          </span>
          <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-6xl">Build technology work with clear purpose.</h1>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-relaxed text-slate-200">
            CYVRIX publishes active roles and their application details here once they are ready to be advertised.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        {hasJobs ? (
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <article key={job.id} className="flex flex-col rounded-3xl border border-white/10 bg-[#071126] p-7">
                <BriefcaseBusiness className="h-6 w-6 text-[#7ab8f4]" />
                <h2 className="mt-6 font-outfit text-2xl font-black text-white">{job.title}</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-slate-300">
                  {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#7ab8f4]" />{job.location}</span>}
                  {job.type && <span>{job.type}</span>}
                </div>
                {job.description && <p className="mt-5 flex-grow text-sm font-medium leading-relaxed text-slate-300">{job.description}</p>}
                <Link href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white">
                  Ask about this role <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#071126] p-8 text-center md:p-12">
            <BriefcaseBusiness className="mx-auto h-8 w-8 text-[#7ab8f4]" />
            <h2 className="mt-5 font-outfit text-3xl font-black text-white">Current opportunities will appear here.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-slate-300">
              We do not publish illustrative vacancies. When a role is open, this page will show the position, location, employment details and application route.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
