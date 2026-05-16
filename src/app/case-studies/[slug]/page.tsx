import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, FeatureList, Hero } from "@/components/site/Sections";
import { caseStudies } from "@/lib/cyvrix-data";

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudies.find((item) => item.slug === slug);
  return { title: study ? study.title : "Case Study" };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudies.find((item) => item.slug === slug);
  if (!study) notFound();

  return (
    <div>
      <Navbar />
      <Hero eyebrow={study.clientType} title={study.title} subtitle={study.challenge} />
      <main className="bg-white dark:bg-slate-950">
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10">
            <h2 className="font-outfit text-2xl font-black">Solution</h2>
            <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">{study.solution}</p>
            <h2 className="mt-8 font-outfit text-2xl font-black">Outcome</h2>
            <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">{study.outcome}</p>
          </div>
          <div className="grid gap-5">
            <Panel title="Technologies used"><FeatureList items={study.technologies} /></Panel>
            <Panel title="Services involved"><FeatureList items={study.services} /></Panel>
            <Panel title="Timeline"><p className="font-bold text-cyan-600 dark:text-cyan-300">{study.timeline}</p></Panel>
          </div>
        </section>
        {study.testimonial ? <blockquote className="mx-auto mb-16 max-w-4xl rounded-lg bg-slate-50 p-8 text-center text-xl font-bold leading-9 text-slate-700 dark:bg-white/[0.04] dark:text-slate-200">{study.testimonial}</blockquote> : null}
      </main>
      <CTASection title="Want a similar outcome for your business?" />
      <Footer />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10"><h2 className="mb-5 font-outfit text-xl font-black">{title}</h2>{children}</div>;
}
