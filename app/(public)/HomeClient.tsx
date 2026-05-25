"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, MonitorSmartphone, Server, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { services as staticServices } from "@/lib/cyvrix-data";
import { cn } from "@/lib/utils";

interface HomeClientProps {
  services: any[];
  pageData?: any;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export function HomeClient({ services, pageData }: HomeClientProps) {
  const content = pageData?.ContentBlock?.[0]?.content || {};
  const heroTitle = pageData?.heroTitle || "Managed IT & Cybersecurity you can actually rely on.";
  const heroSubtitle = pageData?.heroSubtitle || "We provide strategic IT support, proactive cybersecurity, and robust cloud infrastructure to empower your team and protect your critical data.";
  const featuredImage = pageData?.featuredImage;

  return (
    <div className="bg-[#020817]">
      {/* Clean Corporate Hero */}
      <section className="relative pt-24 pb-20 lg:pt-36 lg:pb-32 overflow-hidden border-b border-white/5">
        {featuredImage ? (
          <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${featuredImage})` }} />
        ) : (
          <div className="absolute inset-0 z-0 bg-corporate-grid opacity-50" />
        )}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#020817] to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-transparent pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded glass-panel-subtle text-[#2691F0] text-xs font-bold uppercase tracking-widest mb-6"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Trusted IT Partner for UK Businesses</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-outfit text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 text-balance"
              >
                {heroTitle}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-10 text-balance"
              >
                {heroSubtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button size="lg" className="bg-[#2691F0] text-white hover:bg-white hover:text-[#041635] px-8 h-14 rounded font-bold shadow-lg shadow-[#2691F0]/20 transition-all group" asChild>
                  <Link href="/book-consultation">
                    Request an IT Audit
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="px-8 h-14 rounded font-bold border-white/20 text-white hover:bg-white/10 transition-colors" asChild>
                  <Link href="/services">Explore Our Services</Link>
                </Button>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative hidden lg:block"
            >
              <div className="aspect-[4/3] rounded-lg glass-panel overflow-hidden relative border border-white/10">
                <div className="absolute inset-0 bg-[#041635]/5 mix-blend-multiply" />
                <div className="absolute inset-0 flex items-center justify-center text-slate-300 flex-col gap-4">
                   <MonitorSmartphone className="h-24 w-24 opacity-20" />
                   <p className="font-bold text-lg opacity-40 uppercase tracking-widest text-center">Premium UK <br/> Operations Center</p>
                </div>
              </div>
              
              {/* Floating Stat Card */}
              <div className="absolute -bottom-6 -left-6 glass-panel p-6 rounded-lg border border-white/10 w-64 animate-float">
                <p className="text-sm font-bold text-slate-400 mb-1">Average Response Time</p>
                <p className="text-4xl font-black text-white flex items-end gap-2">
                  12 <span className="text-lg text-slate-500 font-bold mb-1">Mins</span>
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#06b6d4] bg-[#06b6d4]/10 px-2 py-1 rounded w-fit border border-[#06b6d4]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
                  SLA Exceeded
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Accreditations Bar */}
      <section className="bg-[#020817] border-b border-white/5 py-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 mb-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">Accredited & Certified Partner</p>
        </div>
        <div className="relative w-full flex overflow-hidden group">
          <div className="flex w-max animate-marquee whitespace-nowrap opacity-50 group-hover:opacity-100 transition-all duration-500 hover:[animation-play-state:paused]">
            {/* We render the list twice to create the infinite loop effect */}
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-12 md:gap-20 px-6 md:px-10 items-center">
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <ShieldCheck className="h-6 w-6 text-[#2691F0]" /> ISO 27001
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <CheckCircle2 className="h-6 w-6 text-[#06b6d4]" /> Cyber Essentials Plus
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <Server className="h-6 w-6 text-blue-500" /> Microsoft Solutions Partner
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <ShieldAlert className="h-6 w-6 text-rose-500" /> CREST Certified
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <Cpu className="h-6 w-6 text-emerald-500" /> AWS Advanced Partner
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <MonitorSmartphone className="h-6 w-6 text-slate-400" /> Dell
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <MonitorSmartphone className="h-6 w-6 text-slate-400" /> Lenovo
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <MonitorSmartphone className="h-6 w-6 text-slate-400" /> HP
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <MonitorSmartphone className="h-6 w-6 text-slate-400" /> Asus
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <ShieldCheck className="h-6 w-6 text-red-500" /> Fortinet
                </div>
                <div className="flex items-center gap-2 font-bold text-white text-lg">
                  <Server className="h-6 w-6 text-sky-400" /> Cisco
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Structured Services Grid */}
      <section className="py-24 bg-[#020817] relative">
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-outfit text-4xl md:text-5xl font-black text-white mb-6">Comprehensive IT Solutions</h2>
            <p className="text-lg text-slate-400">From day-to-day helpdesk support to complex cloud migrations and robust cybersecurity defenses, we have the expertise to scale with you.</p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {services.slice(0, 6).map((service, idx) => {
              const imageUrl = (service.content as any)?.image;
              const staticSvc = staticServices.find(s => s.slug === service.slug);
              const IconComponent = staticSvc?.icon || ShieldCheck;
              return (
                <motion.div
                  key={service.slug}
                  variants={fadeInUp}
                  className="glass-panel-subtle rounded-xl border-white/5 hover:border-[#2691F0]/50 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col min-h-[320px]"
                >
                  {/* Background Image Layer */}
                  {imageUrl ? (
                    <>
                      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-40 mix-blend-luminosity" style={{ backgroundImage: `url(${imageUrl})` }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/90 to-[#020817]/40" />
                    </>
                  ) : (
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5 group-hover:bg-[#2691F0] transition-colors" />
                  )}

                  {/* Content Layer */}
                  <div className="relative p-8 flex flex-col h-full z-10">
                    <div className={`w-12 h-12 rounded flex items-center justify-center mb-auto ${imageUrl ? 'text-[#2691F0] bg-white/10 backdrop-blur-md' : 'text-[#2691F0] bg-white/5 group-hover:bg-[#2691F0] group-hover:text-white'} transition-colors border border-white/10`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="mt-8">
                      <h3 className={`font-outfit text-2xl font-bold mb-4 text-white`}>{service.title}</h3>
                      <p className={`leading-relaxed mb-6 line-clamp-3 text-slate-400`}>{service.summary}</p>
                      <Link href={`/services/${service.slug}`} className={`inline-flex items-center text-sm font-bold transition-colors text-[#2691F0] hover:text-white`}>
                        Read more <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
          
          <div className="mt-12 text-center">
             <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                <Link href="/services">View All Services</Link>
             </Button>
          </div>
        </div>
      </section>

      {/* Human-Centric Trust Section */}
      <section className="py-24 bg-[#041635] text-white relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#2691F0]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#2691F0] font-bold uppercase tracking-widest text-xs mb-4">
                {content?.whyCyvrix?.subtitle || "Why Choose CYVRIX"}
              </p>
              <h2 className="font-outfit text-4xl md:text-5xl font-black mb-8 leading-tight text-white">
                {content?.whyCyvrix?.title || "Your quiet partner in a noisy digital world."}
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                {content?.whyCyvrix?.description || "We believe that great IT should be invisible. When your infrastructure is robust, secure, and proactively managed, your team can focus entirely on driving your business forward."}
              </p>
              <div className="space-y-6">
                {(content?.whyCyvrix?.points || [
                  "No generic fixes. We resolve the root cause of issues.",
                  "Clear, jargon-free communication from local UK experts.",
                  "Transparent reporting via your dedicated client portal.",
                  "Security-first architecture in every deployment."
                ]).map((item: string, i: number) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded bg-[#2691F0]/20 flex items-center justify-center text-[#2691F0]">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
              <Button size="lg" className="mt-10 bg-[#2691F0] hover:bg-white hover:text-[#041635] transition-all font-bold" asChild>
                <Link href="/about">{content?.whyCyvrix?.btnText || "Meet The Team"}</Link>
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-lg glass-panel overflow-hidden relative group border-white/10">
                {content?.whyCyvrix?.imageUrl ? (
                  <img src={content.whyCyvrix.imageUrl} alt="Team" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 flex-col gap-4 p-8 text-center">
                     <p className="font-bold text-xl uppercase tracking-widest text-slate-500">Corporate Office / Team Photo</p>
                     <p className="text-sm">Insert authentic photography of the CYVRIX engineering team here to build human connection.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Case Study CTA */}
      <section className="py-24 bg-[#020817] border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
        <div className="max-w-4xl mx-auto px-5 text-center relative z-10">
          <p className="text-gradient-neon font-bold uppercase tracking-widest text-xs mb-6 inline-block">
            {content?.testimonial?.subtitle || "Client Success"}
          </p>
          <h2 className="text-3xl md:text-4xl font-outfit font-black text-white leading-tight mb-10 text-balance">
            {content?.testimonial?.quote || "\"Since partnering with CYVRIX, our downtime has dropped to zero and our compliance audits pass seamlessly. They are a true extension of our business.\""}
          </h2>
          <div className="flex flex-col items-center">
            <p className="font-black text-white text-lg">{content?.testimonial?.author || "Sarah Jenkins"}</p>
            <p className="text-sm text-slate-400 font-bold mt-1">{content?.testimonial?.role || "Operations Director, UK Logistics Corp"}</p>
          </div>
        </div>
      </section>

      {/* Final Corporate CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#041635] z-0" />
        <div className="absolute inset-0 bg-corporate-grid opacity-30 z-0" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#2691F0]/20 rounded-[100%] blur-[100px] z-0 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-5 text-center relative z-10">
          <h2 className="font-outfit text-4xl md:text-5xl font-black mb-6 text-white">
            {content?.finalCta?.title || "Secure your business future today."}
          </h2>
          <p className="text-slate-400 text-lg mb-10 text-balance">
            {content?.finalCta?.description || "Speak to one of our technical architects for a no-obligation audit of your current IT infrastructure and security posture."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-[#2691F0] text-white hover:bg-white hover:text-[#041635] rounded font-bold h-14 px-8 shadow-lg shadow-[#2691F0]/20 transition-all">
              Request Free Audit
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded font-bold h-14 px-8 transition-colors">
              Call 0800 123 4567
            </Button>
          </div>
        </div>
      </section>

      {/* Client Slider — driven by CMS content.clients */}
      <ClientSlider clients={content?.clients} />
    </div>
  );
}

// ─── Client Slider Component ───────────────────────────────────────────────
interface ClientEntry {
  name: string;
  logoUrl?: string;
  industry?: string;
}

const DEFAULT_CLIENTS: ClientEntry[] = [
  { name: "Meridian Logistics" },
  { name: "Hartwell Group" },
  { name: "Pinnacle Finance" },
  { name: "NorthBridge Law" },
  { name: "Apex Healthcare" },
  { name: "Sterling Manufacturing" },
  { name: "Elysian Retail" },
  { name: "Crestwood Consulting" },
  { name: "BrightPath Education" },
  { name: "OakField Properties" },
];

function ClientSlider({ clients }: { clients?: ClientEntry[] }) {
  const items: ClientEntry[] = Array.isArray(clients) && clients.length > 0 ? clients : DEFAULT_CLIENTS;
  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <section className="bg-[#020817] border-b border-white/5 py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Trusted By Leading UK Businesses</p>
      </div>
      <div className="relative w-full flex overflow-hidden group">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-20 z-10 bg-gradient-to-r from-[#020817] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-20 z-10 bg-gradient-to-l from-[#020817] to-transparent" />

        <div className="flex w-max animate-marquee whitespace-nowrap hover:[animation-play-state:paused] gap-0">
          {doubled.map((client, i) => (
            <div
              key={i}
              className="flex items-center justify-center mx-8 md:mx-12 group/card"
            >
              {client.logoUrl ? (
                <div className="h-10 w-auto max-w-[120px] opacity-40 group-hover/card:opacity-100 transition-opacity duration-300 filter grayscale group-hover/card:grayscale-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={client.logoUrl}
                    alt={client.name}
                    className="h-10 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-40 group-hover/card:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#2691F0] font-black text-sm">
                    {client.name.charAt(0)}
                  </div>
                  <span className="text-xs font-black text-white tracking-wide whitespace-nowrap">{client.name}</span>
                  {client.industry && (
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{client.industry}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
