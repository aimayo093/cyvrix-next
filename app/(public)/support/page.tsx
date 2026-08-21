import Link from "next/link";
import { ArrowRight, Headphones, ShieldCheck, UserRoundCheck } from "lucide-react";
import * as React from "react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("support");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Support Desk",
    description: page?.seoDescription || "Raise a technical support ticket or contact our operations desk.",
  };
}

export default async function SupportPage() {
  const { pageData } = await getPublicPageData("support");
  const sections = pageData?.sections || [];

  return (
    <div className="min-h-screen bg-[#020817]">
      {sections.length > 0 ? <SectionRenderer sections={sections} /> : <SupportFallback />}
    </div>
  );
}

function SupportFallback() {
  return (
    <div className="pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
            <Headphones className="h-3.5 w-3.5" />
            Support
          </span>
          <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-6xl">Support routed through the right channel.</h1>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-relaxed text-slate-200">
            Existing clients should use the support route agreed for their service. New technology or project enquiries can start with a short conversation about the work in front of you.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-16 md:grid-cols-2 md:py-24">
        <article className="rounded-3xl border border-white/10 bg-[#071126] p-8">
          <UserRoundCheck className="h-7 w-7 text-[#7ab8f4]" />
          <h2 className="mt-6 font-outfit text-3xl font-black text-white">Existing clients</h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-slate-300">Use the agreed portal, support email or escalation path for your service. This keeps requests connected to the right people and context.</p>
          <Link href="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white">
            Client portal sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </article>

        <article className="rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-8">
          <ShieldCheck className="h-7 w-7 text-[#7ab8f4]" />
          <h2 className="mt-6 font-outfit text-3xl font-black text-white">New to CYVRIX?</h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-slate-200">Share the essentials of the support need, change or technology concern. Do not include passwords, access tokens or sensitive configuration data.</p>
          <Link href="/contact" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635]">
            Start an enquiry <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </section>
    </div>
  );
}
