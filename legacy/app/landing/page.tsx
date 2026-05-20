import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Hero } from "@/components/site/Sections";
import { landingPages } from "@/lib/cyvrix-data";

export const metadata = { title: "Campaign Landing Pages" };

export default function LandingIndexPage() {
  return (
    <div>
      <Navbar />
      <Hero eyebrow="Campaigns" title="Reusable CYVRIX landing page templates" subtitle="Campaign pages for cybersecurity audits, managed IT support, cloud migration, Microsoft 365 hardening, and backup and disaster recovery." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {landingPages.map((page) => <Link key={page.slug} href={`/landing/${page.slug}`} className="rounded-lg border border-slate-200 p-6 font-bold transition hover:border-cyan-400 dark:border-white/10">{page.title}</Link>)}
        </div>
      </section>
      <Footer />
    </div>
  );
}
