"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Layout, 
  Rocket, 
  Target,
  Quote
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { caseStudies } from "@/lib/cyvrix-data";

export default function CaseStudyDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const study = caseStudies.find(s => s.slug === slug);

  if (!study) {
    notFound();
  }

  return (
    <div className="pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <Link 
          href="/case-studies" 
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#2691F0] mb-12 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Case Studies
        </Link>

        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 rounded-lg bg-blue-50 text-[#2691F0] text-[10px] font-black uppercase tracking-widest mb-6">
              {study.clientType} Success Story
            </span>
            <h1 className="font-outfit text-4xl md:text-6xl font-black text-[#041635] leading-tight mb-8">
              {study.title}
            </h1>
            
            <div className="flex flex-wrap gap-8 mb-16 p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[#2691F0]" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</p>
                  <p className="text-sm font-bold text-[#041635]">{study.timeline}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-[#2691F0]" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sector</p>
                  <p className="text-sm font-bold text-[#041635]">{study.clientType}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-16">
            <section>
              <h2 className="font-outfit text-2xl font-bold text-[#041635] mb-6 flex items-center gap-3">
                <Target className="h-6 w-6 text-rose-500" />
                The Challenge
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed italic border-l-4 border-slate-200 pl-8 py-2">
                "{study.challenge}"
              </p>
            </section>

            <section>
              <h2 className="font-outfit text-2xl font-bold text-[#041635] mb-6 flex items-center gap-3">
                <Layout className="h-6 w-6 text-[#2691F0]" />
                Our Solution
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {study.solution}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {study.services.map((service) => (
                  <div key={service} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="font-bold text-slate-700">{service}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#041635] rounded-3xl p-8 md:p-12 text-white">
              <h2 className="font-outfit text-2xl font-bold mb-8 flex items-center gap-3">
                <Rocket className="h-6 w-6 text-emerald-400" />
                Key Outcomes
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed mb-10">
                {study.outcome}
              </p>
              <div className="flex flex-wrap gap-3">
                {study.technologies.map((tech) => (
                  <span key={tech} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white">
                    {tech}
                  </span>
                ))}
              </div>
            </section>

            {study.testimonial && (
              <section className="relative py-12">
                <Quote className="absolute top-0 left-0 h-16 w-16 text-slate-100 -z-10" />
                <div className="relative z-10">
                  <p className="text-2xl font-medium text-[#041635] italic leading-relaxed mb-6">
                    "{study.testimonial}"
                  </p>
                  <p className="font-black text-[#2691F0] uppercase tracking-widest text-sm">
                    — Client Feedback
                  </p>
                </div>
              </section>
            )}

            <div className="pt-12 border-t border-slate-100">
              <Button size="lg" className="w-full md:w-auto" asChild>
                <Link href="/book-consultation">Discuss a Similar Project</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
