"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, ChevronRight } from "lucide-react";
import { industries as staticIndustries } from "@/lib/cyvrix-data";

interface IndustriesClientProps {
  industries: any[];
}

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

export function IndustriesClient({ industries }: IndustriesClientProps) {
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
            <Building2 className="h-3 w-3" />
            <span>Specialised Sector Support</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-outfit text-5xl md:text-7xl font-black text-white leading-tight tracking-tight mb-8"
          >
            IT Support Shaped Around <br />
            <span className="text-[#2691F0]">Real Operating Environments.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-3xl mx-auto text-lg text-slate-400 leading-relaxed"
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
          {industries.map((industry) => {
            const imageUrl = (industry as any).content?.image;
            const staticInd = staticIndustries.find(s => s.slug === industry.slug);
            const IconComponent = staticInd?.icon || Building2;
            return (
              <motion.div
                key={industry.slug}
                variants={fadeInUp}
                className="group relative"
              >
                <Link 
                  href={`/industries/${industry.slug}`}
                  className="block h-full rounded-2xl bg-[#020817] border border-white/10 hover:border-[#2691F0]/50 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden flex flex-col min-h-[320px]"
                >
                  {/* Background Image Layer */}
                  {imageUrl ? (
                    <>
                      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${imageUrl})` }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#041635] via-[#041635]/80 to-black/20" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[#020817] group-hover:bg-[#020817] transition-colors" />
                  )}

                  {/* Content Layer */}
                  <div className="relative p-8 flex flex-col h-full z-10">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${imageUrl ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-[#020817] text-[#2691F0] group-hover:bg-[#2691F0] group-hover:text-white'}`}>
                      <IconComponent className="h-7 w-7" />
                    </div>
                    
                    <h2 className={`font-outfit text-2xl font-bold mb-4 ${imageUrl ? 'text-white' : 'text-white'}`}>{industry.title}</h2>
                    <p className={`text-sm leading-relaxed mb-8 ${imageUrl ? 'text-slate-300' : 'text-slate-500'}`}>{industry.content?.summary || industry.help}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-8">
                      {(industry.content?.challenges || industry.challenges || []).slice(0, 3).map((challenge: string) => (
                        <span key={challenge} className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${imageUrl ? 'bg-white/10 text-white backdrop-blur-md' : 'bg-[#020817] text-slate-400'}`}>
                          {challenge}
                        </span>
                      ))}
                    </div>

                    <div className={`flex items-center gap-2 text-sm font-black mt-auto transition-colors ${imageUrl ? 'text-[#2691F0] group-hover:text-white' : 'text-[#2691F0] group-hover:text-white'}`}>
                      View Sector Details
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}
