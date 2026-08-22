import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Headphones,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import * as React from "react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { PageHeroImage } from "@/components/public/PageHeroImage";
import { getPageHero } from "@/lib/page-heroes";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("support");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Support Desk",
    description:
      page?.seoDescription ||
      "How to reach CYVRIX support: the right route for existing clients, new enquiries and suspected security incidents.",
  };
}

export default async function SupportPage() {
  const { pageData } = await getPublicPageData("support");
  const sections = pageData?.sections || [];

  return (
    <div className="min-h-screen bg-[#020817]">
      {sections.length > 0 ? <SectionRenderer sections={sections} /> : <SupportFallback />}
    </div>
  );
}

/**
 * What a useful support request contains.
 *
 * Deliberately about information rather than response times: we do not publish
 * a response figure we cannot evidence, so the page helps by making the first
 * message a good one instead.
 */
const whatToInclude = [
  {
    title: "What you were doing",
    detail:
      "The action that led to the problem, and whether it used to work. A change that broke something yesterday is a different investigation from behaviour that has never worked.",
  },
  {
    title: "Who is affected",
    detail:
      "One person, a team, or everyone. Named users and their email addresses help more than a count, because we can check those accounts directly.",
  },
  {
    title: "The exact wording of any error",
    detail:
      "A screenshot or the text itself. Paraphrased errors send investigations in the wrong direction more often than any other single thing.",
  },
  {
    title: "When it started",
    detail:
      "An approximate time is enough. It lets us line the problem up against sign-in records, updates and configuration changes.",
  },
  {
    title: "What the business impact is",
    detail:
      "Whether people can still work, and what they cannot do. This is what determines the order things are picked up in.",
  },
  {
    title: "Anything that changed recently",
    detail:
      "A new device, a password reset, an office move, a supplier update, a new starter. Recent change is the usual explanation.",
  },
];

/** Signals that a request should be raised as a suspected security incident. */
const securitySignals = [
  "You entered credentials into a page you now think was not genuine",
  "You approved a multi-factor prompt you did not initiate",
  "Colleagues report receiving email from your address that you did not send",
  "Files have been renamed or encrypted, or a ransom note has appeared",
  "A payment or bank detail change was requested by email and may not be genuine",
  "An account is signed in from a location nobody recognises",
];

function SupportFallback() {
  const hero = getPageHero("support");

  return (
    <div className="pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
              <Headphones className="h-3.5 w-3.5" />
              Support
            </span>
            <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Support routed through the right channel.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-200">
              Getting to the right route first is most of what determines how quickly something is resolved.
              This page sets out the three ways to reach us, what to include so the first reply is useful
              rather than a request for more detail, and what to do if you think you have a security
              incident rather than a fault.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
              >
                Raise an enquiry <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#security-incident"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
              >
                Suspected security incident
              </Link>
            </div>
          </div>

          <PageHeroImage src={hero.image} alt={hero.imageAlt} priority aspect="aspect-[4/3]" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="max-w-3xl">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">Choose a route</span>
          <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
            Three ways in, depending on who you are.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <article className="flex flex-col rounded-3xl border border-white/10 bg-[#071126] p-7 md:p-8">
            <UserRoundCheck className="h-7 w-7 text-[#7ab8f4]" />
            <h3 className="mt-6 font-outfit text-2xl font-black text-white">Existing clients</h3>
            <p className="mt-4 flex-grow text-base font-medium leading-relaxed text-slate-300">
              Use the portal, support address or escalation path agreed for your service. That route already
              knows your environment, your agreement and who has authority to approve changes, which is why
              it resolves faster than a general enquiry.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
            >
              Client portal sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="flex flex-col rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-7 md:p-8">
            <LifeBuoy className="h-7 w-7 text-[#7ab8f4]" />
            <h3 className="mt-6 font-outfit text-2xl font-black text-white">New to CYVRIX</h3>
            <p className="mt-4 flex-grow text-base font-medium leading-relaxed text-slate-200">
              Tell us what has happened and what it is stopping you doing. We will say whether it is
              something we can help with, and if the honest answer is that another supplier is better placed,
              we will say that instead of taking the work.
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
            >
              Start an enquiry <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="flex flex-col rounded-3xl border border-white/10 bg-[#071126] p-7 md:p-8">
            <ClipboardList className="h-7 w-7 text-[#7ab8f4]" />
            <h3 className="mt-6 font-outfit text-2xl font-black text-white">A project rather than a fault</h3>
            <p className="mt-4 flex-grow text-base font-medium leading-relaxed text-slate-300">
              Migrations, office moves, cabling, new sites and platform changes are scoped rather than
              ticketed. A short conversation about dates, constraints and what has to keep running is a
              better starting point than a support request.
            </p>
            <Link
              href="/book-consultation"
              className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
            >
              Book a free review <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#050f27] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">Before you write</span>
            <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
              Six things that turn a report into a diagnosis.
            </h2>
            <p className="mt-5 text-base font-medium leading-relaxed text-slate-300">
              Most first replies from any support desk are a request for more information. Including these
              six things removes that round trip entirely, and usually means the first response is an answer
              rather than a question.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {whatToInclude.map(({ title, detail }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-[#071126] p-6">
                <h3 className="font-outfit text-lg font-black text-white">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security-incident" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">Security incidents</span>
            <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight md:text-4xl">
              If you think you have been compromised, say so first.
            </h2>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              A suspected compromise is handled differently from a fault. Say in your first sentence that you
              believe this is a security incident, because it changes who picks it up and what they do first.
            </p>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              Do not wait until you are certain. A false alarm costs an hour. A real incident left for a day
              while somebody decides whether it counts is considerably more expensive, and the early hours
              are the ones where containment is still cheap.
            </p>

            <h3 className="mt-10 font-outfit text-xl font-black text-white">Signs that this is an incident</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {securitySignals.map((signal) => (
                <li
                  key={signal}
                  className="flex gap-3 rounded-xl border border-white/10 bg-[#071126] p-4 text-sm font-medium leading-relaxed text-slate-300"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  {signal}
                </li>
              ))}
            </ul>

            <h3 className="mt-10 font-outfit text-xl font-black text-white">What to do while you wait</h3>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              Leave affected machines switched on but disconnect them from the network, because powering off
              destroys evidence held in memory. Do not delete suspicious email; forward a copy and keep the
              original. Tell colleagues not to act on any payment or bank detail request until it has been
              confirmed by phone on a number they already had.
            </p>

            <Link
              href="/contact"
              className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
            >
              Report a suspected incident <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-amber-400/25 bg-[#1d1503] p-7">
              <KeyRound className="h-7 w-7 text-amber-400" />
              <h3 className="mt-6 font-outfit text-xl font-black text-white">Never send credentials</h3>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
                Do not include passwords, multi-factor codes, API keys, recovery codes or access tokens in a
                support request, and do not attach configuration exports containing them. We will never ask
                you for a password, and any message that does is not from us.
              </p>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
                If you have already sent a credential to anyone, change it now and tell us. That is a
                separate action from raising the request.
              </p>
            </div>

            <div className="rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-7">
              <ShieldCheck className="h-7 w-7 text-[#7ab8f4]" />
              <h3 className="mt-6 font-outfit text-xl font-black text-white">How we handle what you send</h3>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
                Support messages are used to resolve your request and are visible only to the people working
                on it. Attachments are checked before anyone opens them. CYVRIX LIMITED is registered with
                the Information Commissioner&rsquo;s Office under reference ZC075683.
              </p>
              <Link
                href="/privacy-policy"
                className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
              >
                Read the privacy policy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
