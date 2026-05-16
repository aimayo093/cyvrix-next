import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, Hero } from "@/components/site/Sections";
import { industries } from "@/lib/cyvrix-data";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Industries" };

export default function IndustriesPage() {
  return (
    <div>
      <Navbar />
      <Hero eyebrow="Industries" title="IT support and security shaped around real operating environments" subtitle="CYVRIX supports UK SMEs, care providers, logistics operators, professional services firms, retailers, startups, nonprofits, and field-based teams." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {industries.map((industry) => (
            <Link key={industry.slug} href={`/industries/${industry.slug}`} className="group rounded-lg border border-slate-200 p-6 transition hover:border-cyan-400 dark:border-white/10">
              <industry.icon className="mb-5 h-8 w-8 text-cyan-500" />
              <h2 className="font-outfit text-xl font-black">{industry.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{industry.help}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-cyan-600 dark:text-cyan-300">View industry <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
      <CTASection />
      <Footer />
    </div>
  );
}
