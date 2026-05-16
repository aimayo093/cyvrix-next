import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, FeatureList, Hero, SectionHeader } from "@/components/site/Sections";
import { findIndustry, industries, services } from "@/lib/cyvrix-data";

export function generateStaticParams() {
  return industries.map((industry) => ({ slug: industry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = findIndustry(slug);
  return { title: industry ? industry.title : "Industry" };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = findIndustry(slug);
  if (!industry) notFound();
  const relevant = services.filter((service) => industry.services.includes(service.title));

  return (
    <div>
      <Navbar />
      <Hero eyebrow="Industry support" title={industry.title} subtitle={industry.help} />
      <main className="bg-white dark:bg-slate-950">
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-3 lg:px-8">
          <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10"><h2 className="mb-5 font-outfit text-xl font-black">Common IT challenges</h2><FeatureList items={industry.challenges} /></div>
          <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10"><h2 className="mb-5 font-outfit text-xl font-black">Example solutions</h2><FeatureList items={industry.solutions} /></div>
          <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10"><h2 className="mb-5 font-outfit text-xl font-black">How CYVRIX helps</h2><p className="leading-7 text-slate-600 dark:text-slate-400">{industry.help}</p></div>
        </section>
        <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeader eyebrow="Relevant services" title="Support matched to this operating model" />
            <div className="grid gap-4 md:grid-cols-3">
              {relevant.map((service) => <Link key={service.slug} href={`/services/${service.slug}`} className="rounded-lg border border-slate-200 bg-white p-5 font-bold dark:border-white/10 dark:bg-slate-950">{service.title}</Link>)}
            </div>
          </div>
        </section>
      </main>
      <CTASection title={`Discuss IT support for ${industry.title}`} />
      <Footer />
    </div>
  );
}
