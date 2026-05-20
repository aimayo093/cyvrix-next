import * as React from "react";
import { HelpCircle, ChevronRight, MessageSquare, ShieldCheck, Zap, Database } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { prisma } from "@/lib/prisma";
import { faqs as fallbackFaqs } from "@/lib/cyvrix-data";
import Link from "next/link";

export const metadata = {
  title: "Frequently Asked Questions | CYVRIX Technologies",
  description: "Get answers to common queries regarding our UK-managed IT support, cybersecurity audits, cloud operations, and compliance services.",
};

export default async function FAQPage() {
  let dbFaqs: any[] = [];
  try {
    dbFaqs = await prisma.fAQ.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.error("Error fetching FAQs from database:", error);
  }

  // Use DB faqs if they exist, otherwise fallback to static ones
  const activeFaqs = dbFaqs.length > 0 ? dbFaqs : fallbackFaqs;

  // Group by category
  const categories = Array.from(new Set(activeFaqs.map((faq) => faq.category)));

  // Simple icon selector based on category name
  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("support")) return <Zap className="h-5 w-5 text-[#2691F0]" />;
    if (lower.includes("security")) return <ShieldCheck className="h-5 w-5 text-[#2691F0]" />;
    if (lower.includes("cloud")) return <Database className="h-5 w-5 text-[#2691F0]" />;
    return <HelpCircle className="h-5 w-5 text-[#2691F0]" />;
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-[#041635] text-white pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-[#041635]/90 to-[#041635]" />
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2691F0] text-xs font-black tracking-widest uppercase mb-6 animate-pulse">
            CYVRIX Knowledge Base
          </span>
          <h1 className="font-outfit text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6">
            Help & Frequently Asked <span className="text-[#2691F0]">Questions</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-300 font-medium text-lg md:text-xl leading-relaxed">
            Get clear, authoritative answers about our technical delivery, cybersecurity controls, support response times, and UK business onboarding workflow.
          </p>
        </div>
      </section>

      {/* Accordions Section */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-16">
          {categories.map((category) => (
            <div key={category} className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                {getCategoryIcon(category)}
                <h2 className="font-outfit text-2xl font-black text-[#041635]">
                  {category}
                </h2>
              </div>

              <div className="grid gap-4">
                {activeFaqs
                  .filter((faq) => faq.category === category)
                  .map((faq, index) => (
                    <details
                      key={`${faq.question}-${index}`}
                      className="group bg-white rounded-2xl border border-slate-200 hover:border-[#2691F0]/30 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden [&_summary::-webkit-details-marker]:hidden"
                    >
                      <summary className="flex justify-between items-center p-6 cursor-pointer select-none font-bold text-[#041635] text-base sm:text-lg focus:outline-none">
                        <span>{faq.question}</span>
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-[#041635] group-open:rotate-90 group-hover:bg-blue-50 group-hover:text-[#2691F0] transition-all shrink-0 ml-4">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </summary>
                      <div className="px-6 pb-6 pt-1 border-t border-slate-50 text-slate-600 leading-relaxed font-medium text-sm sm:text-base">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Premium Support / SLA Callout Box */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-8 shadow-sm">
          <div className="relative z-10 space-y-4 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#2691F0]">
              <MessageSquare className="h-4 w-4" />
              Direct Support Queue
            </div>
            <h3 className="font-outfit text-2xl font-black text-[#041635]">
              Still have questions about our services?
            </h3>
            <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
              If you require specific technical metrics, custom SLA details, or would like to request immediate support, our UK operations desk is ready to help.
            </p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/contact">
              <Button variant="outline" className="w-full sm:w-auto">
                Contact Sales
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="default" className="w-full sm:w-auto bg-[#2691F0] text-white hover:bg-[#041635]">
                Submit Ticket
              </Button>
            </Link>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-60" />
        </div>
      </section>
    </div>
  );
}
