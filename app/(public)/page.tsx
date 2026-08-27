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
    description: page?.seoDescription || "Managed IT, cloud and cybersecurity for growing organisations. On-site engineering across South Wales, remote support UK-wide.",
  };
}

export default async function HomePage() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.home);

  const {
    services,
    pageData,
  } = await getHomePageData().catch((error) => {
    console.error("[home-page] failed to load cached homepage data", error);
    return {
      services: [],
      pageData: null,
    };
  });

  const siteImages = await getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} }));

  /*
   * The Hero section Home Page CMS writes.
   *
   * This page used to ignore it entirely, so every field on that form -
   * eyebrow, title, description, both buttons, the background image - was
   * saved and discarded, and the admin showed copy the site never rendered.
   * Empty fields fall through to the reviewed wording inside PremiumHome.
   */
  const heroSection = pageData?.sections.find((section) => section.sectionType === "Hero");
  const heroSettings = (heroSection?.settingsJson ?? {}) as Record<string, unknown>;
  const asText = (value: unknown) => (typeof value === "string" ? value : undefined);

  return (
    <PremiumHome
      services={services.length > 0 ? services : staticServices}
      engineImages={siteImages.engines}
      heroImage={heroSection?.mediaId || siteImages.hero}
      hero={{
        eyebrow: heroSection?.subtitle ?? undefined,
        title: heroSection?.title ?? undefined,
        body: heroSection?.body ?? undefined,
        primaryLabel: heroSection?.buttonLabel ?? undefined,
        primaryUrl: heroSection?.buttonUrl ?? undefined,
        secondaryLabel: asText(heroSettings.secondaryCtaLabel),
        secondaryUrl: asText(heroSettings.secondaryCtaUrl),
      }}
    />
  );
}
