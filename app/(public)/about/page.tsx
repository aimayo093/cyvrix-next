import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Compass, ShieldCheck, Waypoints } from "lucide-react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { PageHeroImage } from "@/components/public/PageHeroImage";
import { FounderProfile } from "@/components/public/FounderProfile";
import { getPublicPageData, getPublicPageSeoMetadata, getSiteImages, type SiteImages } from "@/lib/public-cache";
import { companyFacts } from "@/lib/company-facts";
import { getPageHero } from "@/lib/page-heroes";
import { stripBrandSuffix } from "@/lib/utils";

export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("about");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "About",
    description:
      page?.seoDescription ||
      "CYVRIX is a UK technology consultancy helping growing organisations manage, secure and modernise the technology their people rely on.",
  };
}

export default async function AboutPage() {
  const [{ pageData, services, testimonials, partners, trustedLogos, complianceCards }, siteImages] =
    await Promise.all([
      getPublicPageData("about"),
      getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} })),
    ]);
  const sections = pageData?.sections || [];

  return (
    <div className="min-h-screen bg-[#020817]">
      {sections.length > 0 ? (
        <SectionRenderer
          sections={sections}
          services={services}
          testimonials={testimonials}
          partners={partners}
          trustedLogos={trustedLogos}
          complianceCards={complianceCards}
        />
      ) : (
        <AboutFallback heroImage={siteImages.pages?.about} />
      )}
    </div>
  );
}

const principles = [
  {
    title: "Start with context",
    description:
      "We understand the people, systems, suppliers and operational priorities before recommending a change. A recommendation that ignores how the business actually runs is not worth making.",
    icon: Waypoints,
  },
  {
    title: "Keep security practical",
    description:
      "Protection, access control and recovery belong in everyday technology decisions rather than in a separate project that never quite starts. Proportionate beats theoretical.",
    icon: ShieldCheck,
  },
  {
    title: "Deliver with clear ownership",
    description:
      "You should always know the next step, who is doing it and when it will be done. Ambiguity about ownership is the most common reason technology work stalls.",
    icon: CheckCircle2,
  },
];

const values = [
  { title: "Clarity", description: "Plain explanations of what we found, what it means and what we recommend. No jargon used to sound authoritative." },
  { title: "Security", description: "Security considered as part of the work rather than bolted on at the end or sold as a separate anxiety." },
  { title: "Ownership", description: "We take responsibility for the outcome, including telling you when something has gone wrong or needs to change." },
  { title: "Practical improvement", description: "Change sized to what the organisation can absorb, sequenced so each step leaves things better than it found them." },
];

function AboutFallback({ heroImage }: { heroImage?: string }) {
  const hero = getPageHero("about", heroImage);

  return (
    <div className="pb-24 pt-24 text-white">
      {/* Hero */}
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-20 md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
              About CYVRIX
            </span>
            <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Technology that is dependable, understandable and ready for change.
            </h1>
            <p className="mt-6 text-lg font-medium leading-relaxed text-slate-200">
              CYVRIX is a UK technology consultancy and managed services provider. We help growing
              organisations reduce technology risk and operational friction through dependable support,
              secure systems and commercially grounded advice.
            </p>
          </div>
          <PageHeroImage src={hero.image} alt={hero.imageAlt} priority />
        </div>
      </section>

      {/* Who we are */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">Who we are</p>
            <h2 className="mt-3 font-outfit text-3xl font-black leading-tight text-white md:text-4xl">
              A specialist partner, not a general supplier.
            </h2>
            <div className="mt-7 space-y-5 text-base leading-8 text-slate-300">
              <p>
                {companyFacts.registeredName} was incorporated on {companyFacts.incorporatedOn} and operates
                from {companyFacts.registeredIn.replace("England and ", "")}, working with organisations across
                the United Kingdom. We are a technology consultancy and managed services provider, registered
                for information technology consultancy and related services.
              </p>
              <p>
                We built the business around a straightforward observation: most organisations do not have a
                technology problem so much as an ownership problem. Systems accumulate, suppliers multiply,
                and nobody holds a complete picture of what is in use or what happens when it fails. The
                result is a steady drag of small issues that never quite get fixed properly.
              </p>
              <p>
                Our answer is to take that ownership seriously. We work in four clear commercial models, so
                you know from the outset how a piece of work is scoped, delivered and bought — an ongoing
                managed service, specialist cloud and security consulting, contract field delivery, or a
                fixed-scope project.
              </p>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-[#071126] p-7 lg:mt-14">
            <div className="flex items-center gap-2 text-[#7ab8f4]">
              <Building2 className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-[0.16em]">Registered details</p>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="font-black uppercase tracking-wider text-slate-500">Registered name</dt>
                <dd className="mt-1 font-semibold text-slate-200">{companyFacts.registeredName}</dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-wider text-slate-500">Company number</dt>
                <dd className="mt-1 font-semibold tabular-nums text-slate-200">{companyFacts.companyNumber}</dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-wider text-slate-500">Incorporated</dt>
                <dd className="mt-1 font-semibold text-slate-200">{companyFacts.incorporatedOn}</dd>
              </div>
              <div>
                {/* The filed registered office is residential and withheld. */}
                <dt className="font-black uppercase tracking-wider text-slate-500">Based in</dt>
                <dd className="mt-1 font-semibold leading-6 text-slate-200">
                  {companyFacts.publishRegisteredOffice
                    ? companyFacts.registeredOffice
                    : companyFacts.registeredLocation}
                </dd>
              </div>
            </dl>
            <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-slate-400">
              Details as recorded on the Companies House public register. We publish credentials and customer
              references only where the supporting evidence has been reviewed.
            </p>
          </aside>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-white/10 bg-[#041635] py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">What we value</p>
            <h2 className="mt-3 font-outfit text-3xl font-black leading-tight text-white md:text-4xl">
              Senior thinking without unnecessary complexity.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <article key={value.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="font-outfit text-xl font-black text-white">{value.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">How we work</p>
          <h2 className="mt-3 font-outfit text-3xl font-black leading-tight text-white md:text-4xl">
            A clear route from the work in front of you to useful next steps.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {principles.map((principle) => (
            <article key={principle.title} className="rounded-3xl border border-white/10 bg-[#071126] p-7">
              <principle.icon className="h-6 w-6 text-[#7ab8f4]" />
              <h3 className="mt-6 font-outfit text-2xl font-black text-white">{principle.title}</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <FounderProfile />

      {/* How we talk about credentials */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-[#071126] p-8 md:p-10">
          <div className="flex items-center gap-2 text-[#7ab8f4]">
            <Compass className="h-5 w-5" />
            <p className="text-xs font-black uppercase tracking-[0.16em]">How we talk about what we do</p>
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <p className="text-base leading-8 text-slate-300">
              We publish a certification, partner status, customer name or performance figure only when the
              supporting evidence has been reviewed and, where relevant, permission has been given. Where we
              describe readiness work for a standard such as Cyber Essentials, that means helping you prepare
              and remediate — the certification decision remains with the certification body.
            </p>
            <p className="text-base leading-8 text-slate-300">
              It would be easy to look larger than we are. We would rather be a company whose claims hold up
              under scrutiny, because the organisations we work with are increasingly asked to prove the same
              about their own suppliers. Our{" "}
              <Link href="/trust" className="font-black text-[#7ab8f4] underline underline-offset-4 hover:text-white">
                Trust Centre
              </Link>{" "}
              explains the standard we hold ourselves to.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-8 md:flex md:items-end md:justify-between md:gap-10 md:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">Start a conversation</p>
            <h2 className="mt-3 font-outfit text-3xl font-black leading-tight text-white">
              Talk through the technology priority that matters now.
            </h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-200">
              We will use the context you share to identify the most appropriate service, project or
              assessment route.
            </p>
          </div>
          <Link
            href="/book-consultation"
            className="mt-7 inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#2691F0] px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] md:mt-0"
          >
            Book a Free Review <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
