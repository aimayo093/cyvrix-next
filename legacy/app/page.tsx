import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, SectionHeader } from "@/components/site/Sections";
import { caseStudies, industries, services, testimonials } from "@/lib/cyvrix-data";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function Home() {
  const featuredServices = services.slice(0, 4);
  const selectedIndustries = industries.slice(0, 6);
  const featuredStudy = caseStudies[0];
  const testimonial = testimonials[0];

  return (
    <div>
      <Navbar />
      <main className="bg-white text-slate-950 dark:bg-white dark:text-slate-950">
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white pt-36">
          <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.12),transparent_60%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">CYVRIX Technologies</p>
              <h1 className="mt-5 max-w-4xl font-outfit text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Secure, dependable IT support for growing UK businesses.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Managed IT, cybersecurity, cloud and infrastructure consultancy from a calm technical partner that keeps operations moving.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/request-quote" className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 font-black text-white">
                  Book a free consultation
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/services" className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-5 py-3 font-bold text-slate-700">
                  Explore services
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                {["UK-focused", "Security-first", "MSP-ready", "Cloud and infrastructure"].map((item) => <span key={item} className="rounded-md bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">{item}</span>)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-50 p-3"><ShieldCheck className="h-6 w-6 text-blue-700" /></div>
                <div>
                  <p className="font-outfit text-xl font-black">Technology control view</p>
                  <p className="text-sm text-slate-500">Support, security and content managed from one admin panel.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {["Open support tickets", "Quote requests", "Published services", "Security recommendations"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-md bg-slate-50 p-4">
                    <span className="font-semibold text-slate-700">{item}</span>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-blue-700 shadow-sm">{["SLA", "CRM", "CMS", "Risk"][index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeader eyebrow="Services" title="Focused technology services, managed properly" intro="Clear support, stronger security and practical cloud guidance without overwhelming your team." />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {featuredServices.map((service) => (
                <Link key={service.slug} href={`/services/${service.slug}`} className="rounded-lg border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
                  <service.icon className="mb-5 h-7 w-7 text-blue-700" />
                  <h3 className="font-outfit text-xl font-black">{service.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{service.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Why CYVRIX</p>
              <h2 className="mt-4 font-outfit text-3xl font-black md:text-5xl">A quieter, more reliable way to run business technology.</h2>
            </div>
            <div className="grid gap-4">
              {[
                "One secure admin and client portal for content, tickets, quotes and documents.",
                "Security thinking built into support, cloud, endpoint and network decisions.",
                "Simple communication for directors, operations teams and busy users.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <p className="font-semibold leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Managed IT and cybersecurity</p>
              <h2 className="mt-4 font-outfit text-3xl font-black md:text-5xl">Support that reduces noise. Security that reduces risk.</h2>
            </div>
            <p className="text-lg leading-8 text-slate-600">
              CYVRIX helps teams stabilise day-to-day IT, harden Microsoft 365 and Google Workspace, protect endpoints, test backups and make better technology decisions as they grow.
            </p>
          </div>
        </section>

        <section className="bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeader eyebrow="Industries" title="Built for practical UK operating environments" intro="Support models for offices, clinics, warehouses, professional teams and fast-growing companies." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedIndustries.map((industry) => (
                <Link key={industry.slug} href={`/industries/${industry.slug}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-5 font-bold text-slate-100 transition hover:bg-white/[0.08]">
                  {industry.title}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 lg:grid-cols-2 lg:px-8">
            <Link href={`/case-studies/${featuredStudy.slug}`} className="rounded-lg border border-slate-200 p-7 transition hover:border-blue-300">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">Case study</p>
              <h2 className="mt-4 font-outfit text-2xl font-black">{featuredStudy.title}</h2>
              <p className="mt-4 leading-7 text-slate-600">{featuredStudy.outcome}</p>
            </Link>
            <blockquote className="rounded-lg bg-slate-50 p-7 ring-1 ring-slate-200">
              <p className="text-lg font-semibold leading-8 text-slate-700">{testimonial.quote}</p>
              <footer className="mt-5 text-sm font-black text-slate-950">{testimonial.name}, {testimonial.company}</footer>
            </blockquote>
          </div>
        </section>

        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Common question</p>
            <h2 className="mt-4 font-outfit text-3xl font-black">Can CYVRIX become our outsourced IT department?</h2>
            <p className="mt-4 leading-8 text-slate-600">Yes. CYVRIX can manage support, devices, cloud platforms, suppliers, documentation, security improvements and client-facing service workflows.</p>
            <Link href="/faq" className="mt-6 inline-flex font-black text-blue-700">View FAQs</Link>
          </div>
        </section>

        <CTASection title="Ready for calmer, more secure IT?" copy="Start with a short consultation. CYVRIX will help identify the right next step for your support, security or cloud environment." />
      </main>
      <Footer />
    </div>
  );
}
