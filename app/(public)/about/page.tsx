"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Shield, 
  Zap, 
  Globe, 
  Target, 
  Users, 
  Award,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/shared/Button";

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

export default function AboutPage() {
  return (
    <div className="pt-20 lg:pt-32 pb-24">
      {/* Hero Section */}
      <section className="relative mb-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#EAF4FF,transparent_70%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#2691F0] text-xs font-black uppercase tracking-widest mb-8"
          >
            <Users className="h-3 w-3" />
            <span>Our Identity & Mission</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-outfit text-5xl md:text-7xl font-black text-[#041635] leading-tight tracking-tight mb-8"
          >
            Clarity in a Complex <br />
            <span className="text-[#2691F0]">Digital Landscape.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-3xl mx-auto text-xl text-slate-600 leading-relaxed"
          >
            CYVRIX Technologies is a premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.
          </motion.p>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              title: "Mission", 
              icon: Target, 
              color: "text-[#2691F0]",
              copy: "Reduce IT risk and operational friction for growing UK organisations through dependable support, secure systems, and commercially grounded consultancy." 
            },
            { 
              title: "Vision", 
              icon: Globe, 
              color: "text-emerald-500",
              copy: "To become the trusted technology partner for ambitious businesses that want enterprise-grade IT maturity without losing agility." 
            },
            { 
              title: "Values", 
              icon: Shield, 
              color: "text-indigo-500",
              copy: "Clarity, security, ownership, and practical improvement. We avoid jargon and focus on outcomes that move the needle for your business." 
            }
          ].map((pillar) => (
            <div key={pillar.title} className="p-10 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center ${pillar.color} mb-6`}>
                <pillar.icon className="h-6 w-6" />
              </div>
              <h2 className="font-outfit text-2xl font-bold text-[#041635] mb-4">{pillar.title}</h2>
              <p className="text-slate-500 leading-relaxed">{pillar.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Story Section */}
      <section className="py-24 bg-[#041635] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#2691F0] -skew-x-12 translate-x-1/2 opacity-10" />
        
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[#2691F0] font-black uppercase tracking-widest text-xs mb-4">Why CYVRIX</p>
              <h2 className="font-outfit text-4xl md:text-5xl font-black mb-8 leading-tight">Senior thinking without unnecessary complexity.</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-10">
                CYVRIX is designed for leaders who want a partner that can operate support, advise on risk, and deliver transformation work. Our model is built around practical engineering and service discipline.
              </p>
              
              <div className="space-y-6">
                {[
                  "UK-focused support and consultancy model",
                  "Security and compliance considered in every service",
                  "Direct access to technical leadership",
                  "Clear, predictable service level agreements",
                  "Practical focus on business uptime and security"
                ].map((item) => (
                  <div key={item} className="flex gap-4 items-center">
                    <div className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[#2691F0]">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <p className="font-bold text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square rounded-3xl bg-white/5 border border-white/10 p-12 flex flex-col justify-center"
            >
              <div className="grid grid-cols-2 gap-8">
                {[
                  { label: "UK Service", val: "100%" },
                  { label: "SLA Adherence", val: "99.8%" },
                  { label: "Response Time", val: "<15m" },
                  { label: "Client Rating", val: "4.9/5" }
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-4xl font-black text-[#2691F0] mb-1">{stat.val}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
              <Award className="absolute -bottom-6 -right-6 h-32 w-32 text-white/5" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pt-24">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <h2 className="font-outfit text-3xl md:text-5xl font-black text-[#041635] mb-8">Ready to start your journey with CYVRIX?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-12" asChild>
              <Link href="/book-consultation">Book a Consultation</Link>
            </Button>
            <Button size="lg" variant="outline" className="px-12" asChild>
              <Link href="/services">Explore Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
