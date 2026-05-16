import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Hero } from "@/components/site/Sections";
import { legalPages } from "@/lib/cyvrix-data";

export function generateStaticParams() {
  return legalPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = legalPages.find((item) => item.slug === slug);
  return { title: page ? page.title : "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = legalPages.find((item) => item.slug === slug);
  if (!page) notFound();
  return (
    <div>
      <Navbar />
      <Hero eyebrow="Legal" title={page.title} subtitle={page.summary} />
      <main className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-5">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-900">This page is professional website policy content, not legal advice. Final legal documents should be reviewed by a qualified legal professional.</div>
          <div className="mt-8 grid gap-4">
            {page.sections.map((section) => (
              <section key={section} className="rounded-lg border border-slate-200 p-6 dark:border-white/10">
                <h2 className="font-outfit text-xl font-black">{section}</h2>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">CYVRIX administrators can edit this section in the Legal Pages CMS, including version notes, visibility, SEO metadata, and review status.</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
