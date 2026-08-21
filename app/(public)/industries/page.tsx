import { IndustriesClient } from "./IndustriesClient";
import { getSiteImages, type SiteImages } from "@/lib/public-cache";
import { getPageHero } from "@/lib/page-heroes";
import { Metadata } from "next";
import { getPublicIndustriesData } from "@/lib/public-cache";
import { getStaticPublicIndustry, toPublicIndustry } from "@/lib/public-industry";
import { industries as staticIndustries } from "@/lib/cyvrix-data";

export const metadata: Metadata = {
  title: "Industries",
  description: "IT Support Shaped Around Real Operating Environments.",
};

export default async function IndustriesPage() {
  const [dbIndustries, siteImages] = await Promise.all([
    getPublicIndustriesData(),
    getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} })),
  ]);
  const hero = getPageHero("industries", siteImages.pages?.industries);
  const industries = dbIndustries.length > 0
    ? dbIndustries.map((industry) => toPublicIndustry(industry))
    : staticIndustries.flatMap((industry) => {
      const publicIndustry = getStaticPublicIndustry(industry.slug);
      return publicIndustry ? [publicIndustry] : [];
    });

  return <IndustriesClient industries={industries} heroImage={hero.image} heroImageAlt={hero.imageAlt} />;
}
