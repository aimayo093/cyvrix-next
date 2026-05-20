import * as React from "react";
import { Briefcase, MapPin, Users, Heart, ShieldAlert, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { jobs as fallbackJobs } from "@/lib/cyvrix-data";
import { submitJobApplication } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Careers | CYVRIX Technologies",
  description: "Join CYVRIX Technologies and help us build calm, secure, and resilient technology operations for growing businesses across the United Kingdom.",
};

export default async function CareersPage() {
  let dbJobs: any[] = [];
  try {
    dbJobs = await prisma.careerJob.findMany({
      where: { visible: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching careers from database:", error);
  }

  // Use DB jobs if any, otherwise fallback to static list
  const activeJobs = dbJobs.length > 0 ? dbJobs : fallbackJobs;

  const benefits = [
    {
      title: "Remote-First Trust",
      description: "We focus on outcomes and deep work, giving you the flexibility and trust to work from where you perform best.",
      icon: <Users className="h-6 w-6 text-[#2691F0]" />,
    },
    {
      title: "Security Mindset",
      description: "Work with advanced cybersecurity principles. We prioritize technical excellence, threat mitigation, and clean code.",
      icon: <ShieldAlert className="h-6 w-6 text-[#2691F0]" />,
    },
    {
      title: "Professional Calmness",
      description: "No chaotic firefights. We design stable systems, standard practices, and keep operations organized.",
      icon: <Heart className="h-6 w-6 text-[#2691F0]" />,
    },
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-[#041635] text-white pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-[#041635]/90 to-[#041635]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2691F0] text-xs font-black tracking-widest uppercase mb-6 animate-pulse">
            <Sparkles className="h-3 w-3" />
            Grow With Us
          </span>
          <h1 className="font-outfit text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6">
            Build calm, secure <span className="text-[#2691F0]">technology operations</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-300 font-medium text-lg md:text-xl leading-relaxed">
            Help UK organizations build resilient infrastructure, secure endpoints, and keep their business operations running smoothly.
          </p>
        </div>
      </section>

      {/* Core Benefits */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="font-outfit text-3xl font-black text-[#041635] mb-4">
            Why build your career at CYVRIX?
          </h2>
          <p className="max-w-2xl mx-auto text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
            We value high-integrity consulting, professional technical knowledge, and maintaining an organized, stable environment for both our employees and our clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="p-3 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                {benefit.icon}
              </div>
              <h3 className="font-outfit font-black text-lg text-[#041635]">
                {benefit.title}
              </h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Open Positions Grid */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-10">
          <div>
            <h2 className="font-outfit text-3xl font-black text-[#041635] mb-2">
              Job Vacancies
            </h2>
            <p className="text-slate-400 font-bold text-sm">
              Current and upcoming UK-based technical and consulting roles.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {activeJobs.map((job, idx) => (
              <div key={idx} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-outfit font-black text-xl text-[#041635]">
                      {job.title}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#2691F0] px-2 py-0.5 rounded-md">
                      {job.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      Full Time
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium pt-1">
                    {job.summary || job.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="max-w-4xl mx-auto px-6 pb-24 pt-10">
        <div className="bg-[#041635] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-white/5 shadow-xl">
          <div className="relative z-10 max-w-xl mb-10 space-y-2">
            <h2 className="font-outfit text-3xl font-black">
              Register your interest
            </h2>
            <p className="text-slate-300 font-medium text-sm sm:text-base leading-relaxed">
              Interested in joining CYVRIX? Even if there isn't a perfect current opening, we'd love to hear from you. Send us your details below.
            </p>
          </div>

          <form action={submitJobApplication} className="relative z-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="block text-sm font-bold text-slate-200">
                Full Name
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all"
                />
              </label>

              <label className="block text-sm font-bold text-slate-200">
                Email Address
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. sarah@company.co.uk"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all"
                />
              </label>

              <label className="block text-sm font-bold text-slate-200">
                Target Role
                <select
                  name="role"
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#041635] px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all"
                >
                  {activeJobs.map((job, idx) => (
                    <option key={idx} value={job.title} className="bg-[#041635]">
                      {job.title}
                    </option>
                  ))}
                  <option value="General Technical Interest" className="bg-[#041635]">Other / General Technical Interest</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-200">
                CV / Resume Upload (PDF)
                <input
                  name="cv"
                  type="file"
                  accept=".pdf"
                  className="mt-2 w-full text-sm text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#2691F0] file:text-white hover:file:bg-[#2691F0]/90 file:cursor-pointer"
                />
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-200">
              Why CYVRIX? Tell us about your background and technical interests.
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Briefly describe your experience with managed services, cybersecurity, cloud provisioning, or networking..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all resize-none"
              />
            </label>

            <div className="flex items-start gap-3">
              <input
                name="consent"
                type="checkbox"
                required
                value="on"
                id="consent-checkbox"
                className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 text-[#2691F0] focus:ring-2 focus:ring-[#2691F0]"
              />
              <label htmlFor="consent-checkbox" className="text-xs text-slate-300 leading-normal font-medium select-none">
                I agree to the processing of my personal details for recruitment assessment in accordance with the CYVRIX privacy policy.
              </label>
            </div>

            <Button type="submit" variant="premium" className="w-full bg-[#2691F0] text-white hover:bg-white hover:text-[#041635] py-4 rounded-xl flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />
              Submit Application
            </Button>
          </form>

          {/* Decorative shapes */}
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>
    </div>
  );
}
