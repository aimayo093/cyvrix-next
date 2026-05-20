import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { pricingPackages } from "@/lib/cyvrix-data";

export const metadata: Metadata = {
  title: "Pricing and Engagement Models | CYVRIX Technologies",
  description: "Explore our flexible IT support, cybersecurity audit sprints, and cloud consultancy plans tailored for UK businesses.",
};

export default function PricingPage() {
  return (
    <div className="pt-24 pb-32 bg-slate-50 text-[#041635]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-black uppercase tracking-widest text-[#2691F0] bg-blue-500/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
            Engagement Packages
          </span>
          <h1 className="font-outfit text-4xl md:text-5.5xl font-black text-[#041635] mt-6 mb-6 leading-tight tracking-tight">
            Predictable support, <span className="text-[#2691F0]">zero fluff.</span>
          </h1>
          <p className="text-md text-slate-600 leading-relaxed font-medium">
            CYVRIX works on simple engagement models scoped to your company size, endpoints, risk profile, and SLA needs. No sudden overheads, just practical engineering.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {pricingPackages.map((plan, index) => {
            const isFeatured = index === 1; // Highlight the middle package as standard
            
            return (
              <div 
                key={plan.name} 
                className={`flex flex-col bg-white rounded-3xl border transition-all p-8 relative overflow-hidden ${
                  !plan.visible 
                    ? "opacity-60 border-dashed border-slate-300"
                    : isFeatured
                    ? "border-[#2691F0] shadow-xl shadow-blue-500/5 ring-1 ring-[#2691F0]/40 scale-102 lg:-translate-y-2"
                    : "border-slate-200 shadow-sm hover:shadow-lg"
                }`}
              >
                {/* Decorative highlight details for featured plans */}
                {isFeatured && plan.visible && (
                  <div className="absolute top-0 right-0 bg-[#2691F0] text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-bl-2xl flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Recommended
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="font-outfit text-2.5xl font-black text-[#041635] mb-2">{plan.name}</h3>
                  <p className="text-xs font-black text-[#2691F0] uppercase tracking-widest">{plan.cadence}</p>
                  <p className="text-slate-500 text-xs font-bold mt-4 leading-relaxed">{plan.summary}</p>
                </div>

                <div className="border-t border-slate-100 pt-8 flex-grow">
                  <p className="text-xs font-black text-[#041635] uppercase tracking-widest mb-4">Core Deliverables</p>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                        <Check className="h-4.5 w-4.5 text-[#2691F0] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto border-t border-slate-100 pt-6">
                  <Link href="/request-quote">
                    <Button 
                      variant={isFeatured ? "premium" : "outline"} 
                      className={`w-full gap-2 ${
                        isFeatured 
                          ? "bg-[#2691F0] text-white hover:bg-blue-600 border-none" 
                          : "text-[#041635] hover:bg-slate-50"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Audit/Assurance block */}
        <div className="mt-20 bg-[#041635] text-white rounded-3xl p-8 md:p-12 text-center md:text-left md:flex items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-[#2691F0]/10 rounded-full blur-3xl" />
          <div className="max-w-2xl relative z-10">
            <h3 className="font-outfit text-2.5xl font-black mb-3">Looking for a custom security framework?</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              We construct custom service-level agreements and incident mitigation structures for enterprise entities and regulated sectors (such as healthcare and finance).
            </p>
          </div>
          <Link href="/contact" className="relative z-10 shrink-0 mt-6 md:mt-0">
            <Button variant="premium" className="bg-[#2691F0] text-white hover:bg-blue-600 border-none shadow-lg shadow-blue-500/20 whitespace-nowrap">
              Contact Enterprise Sales
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
