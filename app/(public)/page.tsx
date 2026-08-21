import type { Metadata } from "next";
import { PremiumHome } from "@/components/public/PremiumHome";
import { cacheLife, cacheTag } from "next/cache";
import { getHomePageData, getHomeSeoMetadata, getSiteImages, PUBLIC_CACHE_TAGS, type SiteImages } from "@/lib/public-cache";
import { services as staticServices } from "@/lib/cyvrix-data";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getHomeSeoMetadata().catch((error) => {
    console.error("[home-metadata] failed to load cached SEO data", error);
    return null;
  });

  return {
    // Absolute, because the root layout template appends "| CYVRIX Technologies"
    // and the homepage title already carries the brand. Without this the tab
    // reads "CYVRIX Technologies | ... | CYVRIX Technologies".
    title: {
      absolute: page?.seoTitle || "CYVRIX Technologies | Managed IT, Cloud & Cybersecurity",
    },
    description: page?.seoDescription || "Managed services, cloud and cybersecurity, field engineering and professional technology projects for growing UK organisations.",
  };
}

export default async function HomePage() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.home);

  const {
    services,
  } = await getHomePageData().catch((error) => {
    console.error("[home-page] failed to load cached homepage data", error);
    return {
      services: [],
    };
  });

  const siteImages = await getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} }));

  return (
    <PremiumHome
      services={services.length > 0 ? services : staticServices}
      engineImages={siteImages.engines}
      heroImage={siteImages.hero}
    />
  );
}
