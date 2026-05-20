import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, FeatureList, Hero } from "@/components/site/Sections";
import { landingPages } from "@/lib/cyvrix-data";

export function generateStaticParams() {
  return landingPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = landingPages.find((item) => item.slug === slug);
  return { title: page ? page.title : "Campaign" };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = landingPages.find((item) => item.slug === slug);
  if (!page) notFound();
  return (
    <div>
      <Navbar />
      <Hero eyebrow="CYVRIX campaign" title={page.title} subtitle={page.outcome} primary="Request campaign consultation" secondary="View core services" />
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:px-8">
          <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10">
            <h2 className="font-outfit text-2xl font-black">Template includes</h2>
            <div className="mt-5"><FeatureList items={["Campaign-specific hero and CTA", "Service-aligned proof points", "Lead capture to CRM", "SEO and Open Graph fields", "Admin draft/publish controls"]} /></div>
          </div>
          <div className="rounded-lg border border-slate-200 p-6 dark:border-white/10">
            <h2 className="font-outfit text-2xl font-black">Primary service</h2>
            <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">{page.service}</p>
          </div>
        </div>
      </section>
      <CTASection title={page.title} copy={page.outcome} />
      <Footer />
    </div>
  );
}
