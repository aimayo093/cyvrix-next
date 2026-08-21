import { notFound } from "next/navigation";
import { IndustryClient } from "./IndustryClient";
import { getPublicIndustryDetail, getSiteImages, type SiteImages } from "@/lib/public-cache";
import { getStaticPublicIndustry, toPublicIndustry } from "@/lib/public-industry";
import { industries as staticIndustries } from "@/lib/cyvrix-data";

interface IndustryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: IndustryPageProps) {
  const { slug } = await params;
  const dbIndustry = await getPublicIndustryDetail(slug);
  const industry = dbIndustry ? toPublicIndustry(dbIndustry) : getStaticPublicIndustry(slug);

  return {
    title: industry ? industry.title : "Industry Technology Support",
    description: industry?.summary || "Technology, security and resilience priorities for UK organisations.",
  };
}

export async function generateStaticParams() {
  return staticIndustries.map((industry) => ({ slug: industry.slug }));
}

export default async function IndustryDetailPage({ params }: IndustryPageProps) {
  const { slug } = await params;
  const [dbIndustry, siteImages] = await Promise.all([
    getPublicIndustryDetail(slug),
    getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} })),
  ]);
  const imageOverride = siteImages.industries[slug];
  const industry = dbIndustry
    ? toPublicIndustry(dbIndustry, imageOverride)
    : getStaticPublicIndustry(slug, imageOverride);
  if (!industry) notFound();

  return <IndustryClient industry={industry} />;
}
