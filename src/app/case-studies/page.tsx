import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, Hero } from "@/components/site/Sections";
import { caseStudies } from "@/lib/cyvrix-data";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Case Studies" };

export default function CaseStudiesPage() {
  return (
    <div>
      <Navbar />
      <Hero eyebrow="Case studies" title="Operational IT, security, and cloud outcomes for growing organisations" subtitle="A case study system for client type, challenge, solution, technologies, outcomes, timeline, services, and testimonials." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 lg:grid-cols-3 lg:px-8">
          {caseStudies.map((study) => (
            <Link key={study.slug} href={`/case-studies/${study.slug}`} className="group rounded-lg border border-slate-200 p-6 transition hover:border-cyan-400 dark:border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-500">{study.clientType}</p>
              <h2 className="mt-4 font-outfit text-2xl font-black">{study.title}</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{study.challenge}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-600 dark:text-cyan-300">Read case study <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
      <CTASection />
      <Footer />
    </div>
  );
}
