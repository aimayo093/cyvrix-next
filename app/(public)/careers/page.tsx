import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Cloud,
  FileText,
  MapPin,
  MessageSquare,
  Route,
  ServerCog,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { PageHeroImage } from "@/components/public/PageHeroImage";
import { getPageHero } from "@/lib/page-heroes";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("careers");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Careers",
    description:
      page?.seoDescription ||
      "Managed service, cybersecurity, cloud and field engineering roles at CYVRIX Technologies, and how to apply.",
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

/**
 * Capability areas we recruit into, mapped to the four service engines.
 *
 * These describe the kind of work, not open vacancies. Live vacancies come from
 * the CMS and are rendered separately, so this page stays useful when nothing is
 * open without ever implying a role exists that does not.
 */
const disciplines = [
  {
    icon: ServerCog,
    title: "Managed service engineering",
    summary:
      "First and second line support, endpoint and identity administration, patching, monitoring, and the day-to-day work of keeping client environments stable.",
    skills: ["Microsoft 365 and Entra ID", "Windows and endpoint management", "Service desk and ticket ownership"],
  },
  {
    icon: ShieldCheck,
    title: "Cybersecurity",
    summary:
      "Security assessment, hardening, monitoring and incident response. Work that ranges from reviewing a tenant baseline to helping an organisation respond when something has already gone wrong.",
    skills: ["Security assessment and hardening", "Detection and response", "Governance and Cyber Essentials readiness"],
  },
  {
    icon: Cloud,
    title: "Cloud and infrastructure",
    summary:
      "Migration, platform design, and the ongoing management of cloud and hybrid environments. Frequently the work that follows a business outgrowing an arrangement that was fine three years ago.",
    skills: ["Azure and Microsoft 365 migration", "Networking and firewalls", "Backup and disaster recovery design"],
  },
  {
    icon: Wrench,
    title: "Field engineering",
    summary:
      "Site-based delivery: installations, structured cabling, hardware deployment, office moves, and the contract work that needs a competent person physically present.",
    skills: ["Structured cabling and installation", "Hardware deployment and IMAC", "Site surveys and documentation"],
  },
];

/** What an application actually involves, so candidates are not guessing. */
const hiringStages = [
  {
    step: "01",
    title: "You get in touch",
    detail:
      "Send a CV and a short note about the work you are looking for. If a role is advertised, say which one. If nothing is advertised, tell us what you do and we will keep it on file.",
  },
  {
    step: "02",
    title: "An initial conversation",
    detail:
      "A short call covering your experience, what you want next, and whether the work we have is a genuine fit. This is two-way. Ask us the awkward questions here.",
  },
  {
    step: "03",
    title: "A practical discussion",
    detail:
      "A longer technical conversation about real scenarios rather than trivia. We care how you approach a problem you have not seen before, and how you explain it to someone non-technical.",
  },
  {
    step: "04",
    title: "A decision, either way",
    detail:
      "We tell you the outcome and the reasoning behind it. If it is a no, you will hear that too, rather than being left to work it out from our silence.",
  },
];

/** How we work, stated plainly rather than as a values poster. */
const workingHere = [
  {
    title: "You will talk to clients",
    detail:
      "This is not a role where you receive tickets and never speak to the person who raised them. Explaining a technical situation to a business owner is part of the job, not an optional extra.",
  },
  {
    title: "Documentation is part of the work",
    detail:
      "We write down what was configured and why. It is how a colleague picks up an environment without reconstructing your reasoning, and it is the difference between a deliberate decision and configuration drift.",
  },
  {
    title: "We say when something is not needed",
    detail:
      "If a client does not need the thing they are asking for, we say so. That applies internally as well; nobody is expected to defend a recommendation they do not believe in.",
  },
  {
    title: "We are a small company",
    detail:
      "CYVRIX was incorporated in 2024. That means broader work and more direct influence than a large provider, and it also means less structure. It suits people who are comfortable without a process for everything.",
  },
];

function CareersFallback({
  jobs,
}: {
  jobs: Array<{ id: string; title: string; location: string | null; type: string | null; description: string | null }>;
}) {
  const hasJobs = jobs.length > 0;
  const hero = getPageHero("careers");

  return (
    <div className="pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Careers
            </span>
            <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Technology work with the reasoning left in.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-200">
              CYVRIX is a Wales-based managed IT and cybersecurity company working with organisations across
              the UK. We look after the systems businesses depend on every day, and we do it in a way that
              treats the client as someone entitled to understand their own environment.
            </p>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              We publish roles here when they are genuinely open. We do not list illustrative vacancies to
              appear larger than we are. If nothing is advertised and you think you would be useful to us,
              the section below explains how to say so.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="#open-roles"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
              >
                See current openings <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#applying"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
              >
                How to apply
              </Link>
            </div>
          </div>

          <PageHeroImage src={hero.image} alt={hero.imageAlt} priority aspect="aspect-[4/3]" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="max-w-3xl">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">Where we recruit</span>
          <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
            Four areas of work, and what each one actually involves.
          </h2>
          <p className="mt-5 text-base font-medium leading-relaxed text-slate-300">
            These are the disciplines our work falls into. They describe the kind of role we recruit for
            rather than a list of open positions, so you can judge whether your experience fits before
            spending time on an application.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {disciplines.map(({ icon: Icon, title, summary, skills }) => (
            <article key={title} className="flex flex-col rounded-3xl border border-white/10 bg-[#071126] p-7 md:p-8">
              <Icon className="h-7 w-7 text-[#7ab8f4]" />
              <h3 className="mt-6 font-outfit text-2xl font-black text-white">{title}</h3>
              <p className="mt-4 flex-grow text-base font-medium leading-relaxed text-slate-300">{summary}</p>
              <ul className="mt-6 space-y-2 border-t border-white/10 pt-5">
                {skills.map((skill) => (
                  <li key={skill} className="flex gap-2.5 text-sm font-semibold text-slate-300">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2691F0]" />
                    {skill}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#050f27] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">Working here</span>
            <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
              What the job is like, before you apply for it.
            </h2>
            <p className="mt-5 text-base font-medium leading-relaxed text-slate-300">
              Every company describes itself as collaborative and fast-moving. These are the things that
              would actually change your working week, including the ones that will not suit everybody.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {workingHere.map(({ title, detail }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-[#071126] p-7">
                <h3 className="font-outfit text-xl font-black text-white">{title}</h3>
                <p className="mt-3 text-base font-medium leading-relaxed text-slate-300">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="open-roles" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-16 md:py-24">
        <div className="max-w-3xl">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">Current openings</span>
          <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
            {hasJobs ? "Roles open right now." : "No roles are open at the moment."}
          </h2>
        </div>

        {hasJobs ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <article key={job.id} className="flex flex-col rounded-3xl border border-white/10 bg-[#071126] p-7">
                <BriefcaseBusiness className="h-6 w-6 text-[#7ab8f4]" />
                <h3 className="mt-6 font-outfit text-2xl font-black text-white">{job.title}</h3>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-slate-300">
                  {job.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[#7ab8f4]" />
                      {job.location}
                    </span>
                  )}
                  {job.type && <span>{job.type}</span>}
                </div>
                {job.description && (
                  <p className="mt-5 flex-grow text-sm font-medium leading-relaxed text-slate-300">{job.description}</p>
                )}
                <Link
                  href="/contact"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
                >
                  Apply for this role <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-white/10 bg-[#071126] p-8 md:p-10">
            <p className="max-w-3xl text-base font-medium leading-relaxed text-slate-300">
              We do not publish illustrative vacancies. When a position opens it will appear here with the
              role, location, employment type and what the work involves.
            </p>
            <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-slate-300">
              In the meantime we do read speculative applications, particularly from people working in the
              four areas above. If your experience is relevant we will keep your details on file and come
              back to you when something opens.
            </p>
            <Link
              href="#applying"
              className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
            >
              How to send a speculative application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      <section className="border-y border-white/10 bg-[#050f27] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">The process</span>
            <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
              Four stages, and you hear back at each one.
            </h2>
          </div>

          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {hiringStages.map(({ step, title, detail }) => (
              <li key={step} className="rounded-2xl border border-white/10 bg-[#071126] p-6">
                <span className="font-mono text-sm font-black tabular-nums text-[#2691F0]">{step}</span>
                <h3 className="mt-4 font-outfit text-lg font-black text-white">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="applying" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">Applying</span>
            <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
              How to send us your CV.
            </h2>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              Start through the contact form and tell us you are applying. Include the role if one is
              advertised, a short note on the work you are looking for, and attach your CV as a PDF or Word
              document. We will confirm receipt.
            </p>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              Please do not include your date of birth, National Insurance number, passport details, bank
              details or any other identity document in an application. We do not need them at this stage
              and will ask separately if an offer is made.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
              >
                <MessageSquare className="h-4 w-4" />
                Start an application
              </Link>
              <Link
                href="/privacy-policy"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
              >
                How we handle your data
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-7 md:p-8">
            <FileText className="h-7 w-7 text-[#7ab8f4]" />
            <h3 className="mt-6 font-outfit text-2xl font-black text-white">What happens to your CV</h3>
            <ul className="mt-6 space-y-4 text-sm font-medium leading-relaxed text-slate-200">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7ab8f4]" />
                <span>
                  Documents sent to us are checked before anyone opens them. Files that fail the check are
                  rejected rather than stored.
                </span>
              </li>
              <li className="flex gap-3">
                <Route className="mt-0.5 h-4 w-4 shrink-0 text-[#7ab8f4]" />
                <span>
                  Applications are visible only to the people involved in hiring. They are not added to any
                  marketing list.
                </span>
              </li>
              <li className="flex gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#7ab8f4]" />
                <span>
                  We keep unsuccessful applications for up to twelve months in case something suitable opens,
                  then delete them. Ask at any point and we will remove yours sooner.
                </span>
              </li>
            </ul>
            <p className="mt-7 border-t border-white/10 pt-5 text-xs font-semibold leading-relaxed text-slate-400">
              CYVRIX LIMITED is registered with the Information Commissioner&rsquo;s Office under reference
              ZC075683. Our{" "}
              <Link href="/privacy-policy" className="text-[#7ab8f4] underline-offset-2 hover:underline">
                privacy policy
              </Link>{" "}
              sets out your rights over the information you send us.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
