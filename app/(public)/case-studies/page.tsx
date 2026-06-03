"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Clock, Tag } from "lucide-react";
import { caseStudies } from "@/lib/cyvrix-data";

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

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-[#020817] pt-20 pb-24 text-white lg:pt-32">
      {/* Hero Section */}
      <section className="relative mb-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#2691F0,transparent_70%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2691F0]/10 border border-blue-100 text-[#2691F0] text-xs font-black uppercase tracking-widest mb-8"
          >
            <BookOpen className="h-3 w-3" />
            <span>Success Stories</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-outfit text-5xl md:text-7xl font-black text-white leading-tight tracking-tight mb-8"
          >
            Proven Results for <br />
            <span className="text-[#2691F0]">UK Organisations.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-3xl mx-auto text-lg text-slate-400 leading-relaxed"
          >
            Explore how we've helped businesses across various sectors achieve operational excellence, improve security posture, and modernize their digital infrastructure.
          </motion.p>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {caseStudies.map((study) => (
            <motion.div
              key={study.slug}
              variants={fadeInUp}
              className="group"
            >
              <a 
                href={`/case-studies/${study.slug}`}
                className="block p-10 rounded-3xl bg-[#020817] border border-white/10 hover:border-[#2691F0]/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500"
              >
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <span className="px-3 py-1 rounded-lg bg-[#041635] text-white text-[10px] font-black uppercase tracking-widest">
                    {study.clientType}
                  </span>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                    <Clock className="h-3 w-3" />
                    {study.timeline}
                  </div>
                </div>

                <h2 className="font-outfit text-3xl font-bold text-white mb-6 group-hover:text-[#2691F0] transition-colors duration-300">
                  {study.title}
                </h2>
                
                <p className="text-slate-500 text-lg leading-relaxed mb-10">
                  {study.challenge}
                </p>

                <div className="flex flex-wrap gap-2 mb-10">
                  {study.technologies.map((tech) => (
                    <div key={tech} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#020817] border border-white/5 text-xs font-bold text-slate-400">
                      <Tag className="h-3 w-3 text-[#2691F0]" />
                      {tech}
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black text-[#2691F0]">
                    Read Case Study
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
