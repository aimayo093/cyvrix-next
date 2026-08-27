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
    testimonials,
    partners,
    trustedLogos,
  } = await getHomePageData().catch((error) => {
    console.error("[home-page] failed to load cached homepage data", error);
    return {
      services: [],
      pageData: null,
      testimonials: [],
      partners: [],
      trustedLogos: [],
    };
  });

  const siteImages = await getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} }));

  /*
   * The four bands Home Page CMS writes.
   *
   * This page used to read the Hero and nothing else, so the Services Grid,
   * Why Choose Us and Final Call-to-Action forms saved cleanly, showed the new
   * copy back in the admin, and changed nothing on the site. That is what made
   * the home page and its CMS look like two different products.
   *
   * The section types are the ones Home Page CMS looks up by name, so the two
   * modules read the same rows. Empty fields fall through to the reviewed
   * wording inside PremiumHome.
   */
  const sectionOfType = (type: string) => pageData?.sections.find((section) => section.sectionType === type);
  const heroSection = sectionOfType("Hero");
  const servicesSection = sectionOfType("Service cards");
  const deliverySection = sectionOfType("Image and text");
  const ctaSection = sectionOfType("CTA section");

  const settingsOf = (section: { settingsJson?: unknown } | undefined) =>
    (section?.settingsJson ?? {}) as Record<string, unknown>;
  const asText = (value: unknown) => (typeof value === "string" ? value : undefined);
  /** `points` is stored as an array of strings; anything else is ignored. */
  const asPoints = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;

  const heroSettings = settingsOf(heroSection);

  /*
   * Everything the bands above do not lay out.
   *
   * Today that is Partner logos, Testimonials and Trusted logos - all trust
   * content, all suppressed inside SectionRenderer until the verification
   * workflow exists. Passing them through means the rows stay connected to the
   * page rather than being edited into nothing.
   */
  const laidOut = new Set([heroSection?.id, servicesSection?.id, deliverySection?.id, ctaSection?.id].filter(Boolean));
  const additionalSections = (pageData?.sections ?? []).filter((section) => !laidOut.has(section.id));

  return (
    <PremiumHome
      services={services.length > 0 ? services : staticServices}
      engineImages={siteImages.engines}
      heroImage={heroSection?.mediaId || siteImages.hero}
      additionalSections={additionalSections}
      testimonials={testimonials}
      partners={partners}
      trustedLogos={trustedLogos}
      content={{
        hero: {
          eyebrow: heroSection?.subtitle ?? undefined,
          title: heroSection?.title ?? undefined,
          body: heroSection?.body ?? undefined,
          primaryLabel: heroSection?.buttonLabel ?? undefined,
          primaryUrl: heroSection?.buttonUrl ?? undefined,
          secondaryLabel: asText(heroSettings.secondaryCtaLabel),
          secondaryUrl: asText(heroSettings.secondaryCtaUrl),
        },
        services: {
          // Home Page CMS labels these "Section Title" and "Section Subtitle",
          // and the band leads with an eyebrow above the heading — so the
          // heading is `title` and the paragraph under it is `subtitle`.
          title: servicesSection?.title ?? undefined,
          body: servicesSection?.subtitle ?? undefined,
          primaryLabel: servicesSection?.buttonLabel ?? undefined,
          primaryUrl: servicesSection?.buttonUrl ?? undefined,
        },
        delivery: {
          eyebrow: deliverySection?.subtitle ?? undefined,
          title: deliverySection?.title ?? undefined,
          body: deliverySection?.body ?? undefined,
          points: asPoints(settingsOf(deliverySection).points),
          primaryLabel: deliverySection?.buttonLabel ?? undefined,
          primaryUrl: deliverySection?.buttonUrl ?? undefined,
        },
        cta: {
          title: ctaSection?.title ?? undefined,
          body: ctaSection?.body ?? undefined,
          primaryLabel: ctaSection?.buttonLabel ?? undefined,
          primaryUrl: ctaSection?.buttonUrl ?? undefined,
        },
      }}
    />
  );
}
