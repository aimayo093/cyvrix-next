"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, ChevronRight } from "lucide-react";
import { industries } from "@/lib/cyvrix-data";

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

export default function IndustriesPage() {
  return (
    <div className="pt-20 lg:pt-32 pb-24">
      {/* Hero Section */}
      <section className="relative mb-20">
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
            <Building2 className="h-3 w-3" />
            <span>Specialised Sector Support</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-outfit text-5xl md:text-7xl font-black text-[#041635] leading-tight tracking-tight mb-8"
          >
            IT Support Shaped Around <br />
            <span className="text-[#2691F0]">Real Operating Environments.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-3xl mx-auto text-lg text-slate-600 leading-relaxed"
          >
            CYVRIX supports UK SMEs, care providers, logistics operators, and professional firms with technology that understands their unique challenges and regulatory needs.
          </motion.p>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {industries.map((industry) => (
            <motion.div
              key={industry.slug}
              variants={fadeInUp}
              className="group relative"
            >
              <Link 
                href={`/industries/${industry.slug}`}
                className="block h-full p-8 rounded-2xl bg-white border border-slate-200 hover:border-[#2691F0]/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-[#2691F0] mb-6 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <industry.icon className="h-7 w-7" />
                </div>
                
                <h2 className="font-outfit text-2xl font-bold text-[#041635] mb-4">{industry.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">{industry.help}</p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {industry.challenges.slice(0, 3).map((challenge) => (
                    <span key={challenge} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-slate-50 text-slate-400 rounded-md">
                      {challenge}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-black text-[#2691F0] mt-auto">
                  View Sector Details
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
