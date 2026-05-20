"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Globe, Lock, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { services, industries, testimonials } from "@/lib/cyvrix-data";
import { cn } from "@/lib/utils";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#EAF4FF,transparent_70%)]" />
          <div className="absolute top-[10%] right-[5%] w-96 h-96 bg-blue-50/50 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] left-[5%] w-96 h-96 bg-slate-50/50 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#2691F0] text-xs font-black uppercase tracking-widest mb-8"
            >
              <Zap className="h-3 w-3" />
              <span>Next-Gen Managed IT Services</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-outfit text-5xl md:text-7xl lg:text-8xl font-black text-[#041635] leading-[1.1] tracking-tight mb-8"
            >
              Secure. Reliable. <br />
              <span className="text-[#2691F0]">Built for Growth.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="max-w-2xl text-lg md:text-xl text-slate-600 leading-relaxed mb-12"
            >
              CYVRIX provides premium managed IT support, cybersecurity, and cloud infrastructure for businesses that demand excellence and absolute dependability.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Button size="lg" className="w-full sm:w-auto group" asChild>
                <Link href="/book-consultation">
                  Get Started
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/services">View Services</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-[#041635] relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent opacity-10" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="font-outfit text-4xl md:text-5xl font-black text-white mb-6">Expertise you can trust.</h2>
              <p className="text-slate-400 text-lg">We don't just fix problems; we build resilient digital foundations that empower your team to focus on what they do best.</p>
            </div>
            <Link href="/services" className="group flex items-center gap-2 text-[#2691F0] font-bold">
              View all services
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {services.slice(0, 6).map((service, idx) => (
              <motion.div
                key={service.slug}
                variants={fadeInUp}
                className="group p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-[#2691F0]/50 transition-all cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2691F0]/10 flex items-center justify-center text-[#2691F0] mb-6 group-hover:scale-110 transition-transform">
                  {idx % 3 === 0 ? <Shield /> : idx % 3 === 1 ? <Zap /> : <Globe />}
                </div>
                <h3 className="font-outfit text-2xl font-bold text-white mb-4">{service.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{service.summary}</p>
                <Link href={`/services/${service.slug}`} className="text-sm font-bold text-[#2691F0] opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more &rarr;
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust & Stats */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-[#2691F0] font-black uppercase tracking-widest text-xs mb-4">Why Cyvrix</p>
              <h2 className="font-outfit text-4xl md:text-5xl font-black text-[#041635] mb-8 leading-tight">Your quiet partner in a noisy digital world.</h2>
              <div className="space-y-6">
                {[
                  "Security-first approach in every decision we make.",
                  "Calm, expert support that resolves issues properly.",
                  "Strategic guidance to scale your infrastructure.",
                  "A dedicated portal for complete transparency."
                ].map((item) => (
                  <div key={item} className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[#2691F0]">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="font-bold text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="lg" className="mt-12" asChild>
                <Link href="/about">Learn our story</Link>
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden bg-slate-100 relative group">
                <div className="absolute inset-0 bg-[#041635]/10 group-hover:bg-transparent transition-colors duration-500" />
                <div className="absolute bottom-8 right-8 bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 max-w-xs animate-float">
                  <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">Satisfaction Rate</p>
                  <p className="text-5xl font-black text-[#041635]">99.8%</p>
                  <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[99.8%] bg-[#2691F0]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial CTA */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="text-5xl font-serif text-[#2691F0] mb-8">"</p>
          <p className="text-2xl md:text-3xl font-medium text-[#041635] leading-relaxed mb-10 italic">
            "CYVRIX has completely transformed our approach to security. We finally have the peace of mind to focus on our business growth while they handle the complexity."
          </p>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-200 mb-4" />
            <p className="font-black text-[#041635]">James Richardson</p>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">CEO, Innovate UK</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#2691F0] -z-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#041635] -skew-x-12 translate-x-1/4 -z-10" />
        
        <div className="max-w-7xl mx-auto px-5 lg:px-8 text-center text-white">
          <h2 className="font-outfit text-4xl md:text-6xl font-black mb-8 leading-tight">Ready to harden your <br className="hidden md:block" /> digital defenses?</h2>
          <p className="max-w-2xl mx-auto text-white/80 text-lg mb-12">Join hundreds of UK businesses that trust CYVRIX with their most critical technology infrastructure.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-[#041635] hover:bg-slate-100">
              Book a Free Audit
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
