import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { getHomePageData, getHomeSeoMetadata, PUBLIC_CACHE_TAGS } from "@/lib/public-cache";

export async function generateMetadata() {
  const page = await getHomeSeoMetadata().catch((error) => {
    console.error("[home-metadata] failed to load cached SEO data", error);
    return null;
  });

  return {
    title: page?.seoTitle || "CYVRIX Technologies | Managed IT, Cybersecurity & Cloud",
    description: page?.seoDescription || "Enterprise-grade IT support, cybersecurity, and cloud solutions for UK businesses.",
  };
}

export default async function HomePage() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.home);

  const {
    pageData,
    services,
    testimonials,
    partners,
    trustedLogos,
    complianceCards,
    faqs,
    caseStudies,
  } = await getHomePageData().catch((error) => {
    console.error("[home-page] failed to load cached homepage data", error);
    return {
      pageData: null,
      services: [],
      testimonials: [],
      partners: [],
      trustedLogos: [],
      complianceCards: [],
      faqs: [],
      caseStudies: [],
    };
  });

  if (!pageData?.sections.length) {
    return (
      <main className="bg-slate-950 px-6 py-24 text-white sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-sky-300">CYVRIX Technologies</p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-7xl">Secure, dependable IT support for growing UK businesses.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">Managed IT, cybersecurity, cloud and infrastructure consultancy from a calm technical partner that keeps operations moving.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link className="rounded-md bg-cyan-400 px-6 py-3 font-bold text-slate-950" href="/book-consultation">Book a free consultation</Link>
            <Link className="rounded-md border border-slate-500 px-6 py-3 font-bold" href="/services">Explore services</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <SectionRenderer
      sections={pageData?.sections || []}
      services={services}
      testimonials={testimonials}
      partners={partners}
      trustedLogos={trustedLogos}
      complianceCards={complianceCards}
      faqs={faqs}
      caseStudies={caseStudies}
      forceFullPageReload={false}
    />
  );
}
