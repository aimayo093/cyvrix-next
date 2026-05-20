import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, Hero } from "@/components/site/Sections";
import { services } from "@/lib/cyvrix-data";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "IT Services" };

export default function ServicesPage() {
  return (
    <div>
      <Navbar />
      <Hero eyebrow="CYVRIX services" title="Managed IT, cybersecurity, cloud, infrastructure, and consultancy services" subtitle="A full technology service catalogue for UK businesses that need dependable operations, stronger security, and a clear improvement roadmap." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {services.map((service) => (
            <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-lg border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-cyan-400 dark:border-white/10">
              <service.icon className="mb-5 h-8 w-8 text-cyan-500" />
              <h2 className="font-outfit text-xl font-black">{service.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{service.summary}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-cyan-600 dark:text-cyan-300">Open service <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
      <CTASection />
      <Footer />
    </div>
  );
}
