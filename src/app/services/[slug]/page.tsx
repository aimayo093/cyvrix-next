import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, FeatureList, Hero, SectionHeader } from "@/components/site/Sections";
import { findService, services } from "@/lib/cyvrix-data";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findService(slug);
  return { title: service ? service.title : "Service" };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) notFound();
  const related = services.filter((item) => item.slug !== service.slug).slice(0, 3);

  return (
    <div>
      <Navbar />
      <Hero eyebrow="CYVRIX service" title={service.title} subtitle={service.summary} primary="Request consultation" secondary="View all services" />
      <main className="bg-white dark:bg-slate-950">
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-3 lg:px-8">
          <Panel title="What it includes"><FeatureList items={service.includes} /></Panel>
          <Panel title="Who it is for"><p className="leading-7 text-slate-600 dark:text-slate-400">{service.audience}</p></Panel>
          <Panel title="Problems it solves"><FeatureList items={service.problems} /></Panel>
        </section>
        <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:px-8">
            <Panel title="Key features"><FeatureList items={service.features} /></Panel>
            <Panel title="CYVRIX delivery process"><FeatureList items={service.process} /></Panel>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <SectionHeader eyebrow="Security and compliance" title="Controls are designed into delivery" intro={service.compliance} />
          <div className="grid gap-4 md:grid-cols-2">
            {service.faqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border border-slate-200 p-6 dark:border-white/10">
                <h3 className="font-bold">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeader eyebrow="Related services" title="Services often paired with this work" />
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((item) => <Link key={item.slug} href={`/services/${item.slug}`} className="rounded-lg border border-slate-200 bg-white p-5 font-bold dark:border-white/10 dark:bg-slate-950">{item.title}</Link>)}
            </div>
          </div>
        </section>
      </main>
      <CTASection title={`Request a ${service.title} consultation`} />
      <Footer />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10"><h2 className="mb-5 font-outfit text-xl font-black">{title}</h2>{children}</div>;
}
