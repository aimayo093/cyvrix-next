"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";

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
            <span>Client evidence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-outfit text-5xl md:text-7xl font-black text-white leading-tight tracking-tight mb-8"
          >
            Evidence, published <br />
            <span className="text-[#2691F0]">responsibly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-3xl mx-auto text-lg text-slate-400 leading-relaxed"
          >
            CYVRIX publishes named client work only when the evidence, outcomes and publication permission have been reviewed.
          </motion.p>
        </div>
      </section>

      {/* Publication standard */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#041635] p-8 text-center md:p-12">
          <motion.div variants={fadeInUp}>
            <h2 className="font-outfit text-3xl font-black text-white">Verified case studies are being prepared.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
              We will add client stories once they have a clear outcome statement, supporting evidence and written permission for public use. Until then, we will not use illustrative projects as proof of client work.
            </p>
            <Link href="/book-consultation?service=Professional%20Services" className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#2691F0] px-6 py-3 font-bold text-white transition-colors hover:bg-white hover:text-[#041635]">
              Discuss a similar project <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
