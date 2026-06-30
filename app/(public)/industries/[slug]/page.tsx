import * as React from "react";
import { notFound } from "next/navigation";
import { findIndustry as findStaticIndustry } from "@/lib/cyvrix-data";
import { IndustryClient } from "./IndustryClient";
import { getPublicIndustryDetail } from "@/lib/public-cache";

interface IndustryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: IndustryPageProps) {
  const { slug } = await params;
  const industry = await getPublicIndustryDetail(slug);
  
  return {
    title: industry ? `${industry.title} | CYVRIX Technologies` : "Industry Detail",
    description: industry ? (industry.content as any)?.summary || "Specialised IT solutions for your sector" : "Specialised IT solutions",
  };
}

export default function IndustryDetailPage(props: IndustryPageProps) {
  return (
    <React.Suspense fallback={<IndustryDetailFallback />}>
      <IndustryDetailContent {...props} />
    </React.Suspense>
  );
}

async function IndustryDetailContent({ params }: IndustryPageProps) {
  const { slug } = await params;
  
  const industry = await getPublicIndustryDetail(slug);
  if (!industry) notFound();

  const staticInd = findStaticIndustry(slug);
  const content = industry.content as any;

  const mergedIndustry = {
    ...industry,
    challenges: content?.challenges?.length ? content.challenges : (staticInd?.challenges || []),
    help: content?.summary || staticInd?.help || "",
    solutions: content?.solutions?.length ? content.solutions : (staticInd?.solutions || []),
    services: content?.services?.length ? content.services : (staticInd?.services || []),
    image: content?.image || "",
  };

  return <IndustryClient industry={mergedIndustry} />;
}

function IndustryDetailFallback() {
  return (
    <div className="min-h-screen bg-[#020817] pt-24 text-white">
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="h-4 w-36 rounded bg-white/10" />
        <div className="mt-8 h-16 max-w-3xl rounded bg-white/10" />
        <div className="mt-6 h-6 max-w-2xl rounded bg-white/10" />
      </section>
    </div>
  );
}
