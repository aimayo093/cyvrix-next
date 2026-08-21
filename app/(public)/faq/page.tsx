import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";
import { faqs as staticFaqs } from "@/lib/cyvrix-data";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("faq");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Frequently Asked Questions",
    description: page?.seoDescription || "Get answers to common queries regarding our UK-managed IT support and services.",
  };
}

export default async function FAQPage() {
  const { pageData, faqs } = await getPublicPageData("faq");
  const sections = pageData?.sections || [];
  const activeFaqs = faqs.length > 0 ? faqs : staticFaqs;

  return (
    <div className="min-h-screen bg-[#020817]">
      {sections.length > 0 ? <SectionRenderer sections={sections} faqs={faqs} /> : <FaqFallback faqs={activeFaqs} />}
    </div>
  );
}

function FaqFallback({ faqs }: { faqs: Array<{ question: string; answer: string; category?: string | null }> }) {
  return (
    <div className="pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
            <CircleHelp className="h-3.5 w-3.5" />
            Frequently asked questions
          </span>
          <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-6xl">Straight answers about technology support and delivery.</h1>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-relaxed text-slate-200">A starting point for common questions. The right approach always depends on the systems, people and outcome involved.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-2xl border border-white/10 bg-[#071126] p-6 open:border-[#2691F0]/50">
              <summary className="cursor-pointer list-none pr-8 font-outfit text-xl font-black text-white marker:hidden">
                {faq.question}
              </summary>
              {faq.category && <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#7ab8f4]">{faq.category}</p>}
              <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-slate-300">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-8 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <h2 className="font-outfit text-2xl font-black text-white">Need to discuss your own situation?</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">Start with the practical context and we will identify an appropriate next step.</p>
          </div>
          <Link href="/book-consultation" className="mt-6 inline-flex shrink-0 items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white md:mt-0">
            Book a technology review <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
