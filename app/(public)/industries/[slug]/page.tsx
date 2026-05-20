"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight, 
  Shield, 
  Zap, 
  Globe 
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { findIndustry } from "@/lib/cyvrix-data";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function IndustryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const industry = findIndustry(slug);

  if (!industry) {
    notFound();
  }

  return (
    <div className="pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <Link 
          href="/industries" 
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#2691F0] mb-12 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Industries
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[#2691F0] mb-8">
              <industry.icon className="h-8 w-8" />
            </div>
            <h1 className="font-outfit text-4xl md:text-6xl font-black text-[#041635] leading-tight mb-6">
              {industry.title}
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed mb-10">
              {industry.help}
            </p>

            <div className="space-y-4 mb-12">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Core Challenges</h3>
              {industry.challenges.map((challenge) => (
                <div key={challenge} className="flex gap-4 items-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mt-1">
                    <span className="text-[10px] font-bold">!</span>
                  </div>
                  <p className="text-slate-700 font-medium">{challenge}</p>
                </div>
              ))}
            </div>

            <Button size="lg" asChild>
              <Link href="/book-consultation">Get Industry-Specific Support</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="bg-[#041635] rounded-3xl p-8 md:p-12 text-white">
              <h3 className="font-outfit text-2xl font-bold mb-8">Our Targeted Solutions</h3>
              <div className="grid gap-6">
                {industry.solutions.map((solution, idx) => (
                  <div key={solution} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-[#2691F0]/20 flex items-center justify-center text-[#2691F0]">
                      {idx % 3 === 0 ? <Shield className="h-5 w-5" /> : idx % 3 === 1 ? <Zap className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{solution}</p>
                      <p className="text-sm text-slate-400 mt-1">Tailored for {industry.title.toLowerCase()} operational needs.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
              <h3 className="font-outfit text-xl font-bold text-[#041635] mb-6">Relevant Services</h3>
              <div className="flex flex-wrap gap-2">
                {industry.services.map((service) => (
                  <span key={service} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
