import * as React from "react";
import { ShieldCheck, Info, FileText } from "lucide-react";
import { legalPages } from "@/lib/cyvrix-data";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Privacy Policy | CYVRIX Technologies",
  description: "Learn how CYVRIX Technologies securely handles and processes personal data under UK GDPR and Data Protection laws.",
};

export default async function PrivacyPolicyPage() {
  const slug = "privacy-policy";
  let dbPage = null;

  try {
    dbPage = await prisma.legalPage.findUnique({
      where: { slug },
    });
  } catch (error) {
    console.error("Error loading privacy-policy from database:", error);
  }

  const staticPage = legalPages.find((item) => item.slug === slug);
  const title = dbPage?.title || staticPage?.title || "Privacy Policy";
  const summary = dbPage?.body || staticPage?.summary || "How CYVRIX Technologies handles personal data, enquiries, client records, and website information.";
  const sections = staticPage?.sections || [];

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Policy Hero */}
      <section className="relative overflow-hidden bg-[#041635] text-white pt-32 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-[#041635]/90 to-[#041635]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative max-w-4xl mx-auto px-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2691F0] text-xs font-black tracking-widest uppercase mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            Compliance & Privacy
          </span>
          <h1 className="font-outfit text-4xl sm:text-5xl font-black tracking-tight mb-4">
            {title}
          </h1>
          <p className="max-w-2xl text-slate-300 font-medium text-base sm:text-lg leading-relaxed">
            {summary}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Advice/Disclaimer callout */}
          <div className="lg:col-span-12">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4 text-amber-900 shadow-sm">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold leading-relaxed">
                This document is professional website policy content, not formal legal advice. Final legal policy configurations, GDPR records, and controller/processor agreements should be reviewed by a qualified legal professional before enterprise deployment.
              </p>
            </div>
          </div>

          {/* Legal Text Stream */}
          <div className="lg:col-span-12 space-y-6">
            {sections.map((section, index) => (
              <section key={section} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-[#2691F0] font-black text-xs">
                    0{index + 1}
                  </span>
                  <h2 className="font-outfit text-xl font-black text-[#041635]">
                    {section}
                  </h2>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium text-sm sm:text-base pl-11">
                  CYVRIX system administrators can edit this specific section in the Legal Pages CMS settings inside the `/admin` module. This includes editing version notes, audit trails, active status updates, and custom search descriptions.
                </p>
              </section>
            ))}

            {/* Extra footer note */}
            <div className="text-center pt-8 text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              CYVRIX Technologies Ltd • Registered in the United Kingdom • Active GDPR Registered Controller
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
