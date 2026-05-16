import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Hero } from "@/components/site/Sections";
import { legalPages } from "@/lib/cyvrix-data";

export const metadata = { title: "Legal" };

export default function LegalIndexPage() {
  return (
    <div>
      <Navbar />
      <Hero eyebrow="Legal" title="Professional legal and policy pages" subtitle="Legal content is editable in admin and includes a clear note that final legal documents should be reviewed by a qualified legal professional." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {legalPages.map((page) => <Link key={page.slug} href={`/legal/${page.slug}`} className="rounded-lg border border-slate-200 p-6 font-bold transition hover:border-cyan-400 dark:border-white/10">{page.title}</Link>)}
        </div>
      </section>
      <Footer />
    </div>
  );
}
