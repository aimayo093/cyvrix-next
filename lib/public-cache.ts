import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ServiceProduct, ServiceProductPriceDisplayMode } from "@/lib/cyvrix-data";

export const PUBLIC_CACHE_TAGS = {
  shell: "public-shell",
  home: "home-page",
  brandAssets: "brand-assets",
  navigation: "navigation",
  footer: "footer",
  services: "services",
  serviceProducts: "service-products",
  testimonials: "testimonials",
  partners: "partners",
  trustedLogos: "trusted-logos",
  complianceCards: "compliance-cards",
  faqs: "faqs",
  caseStudies: "case-studies",
  seo: "seo",
  cmsPages: "cms-pages",
  legalPages: "legal-pages",
  industries: "industries",
  insights: "insights",
  careers: "careers",
  contactSettings: "contact-settings",
  siteImages: "site-images",
} as const;

function verifiedTrustWhere({
  requiresPermission,
  requiresVisibility = true,
}: {
  requiresPermission: boolean;
  requiresVisibility?: boolean;
}) {
  return {
    ...(requiresVisibility ? { isVisible: true } : {}),
    publicVisibility: true,
    verificationStatus: "VERIFIED",
    verificationReference: { not: "" },
    evidenceUrl: { not: "" },
    evidenceReviewedAt: { not: null },
    evidenceReviewedBy: { not: "" },
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    ...(requiresPermission
      ? {
          permissionConfirmed: true,
          permissionEvidenceUrl: { not: "" },
          permissionConfirmedAt: { not: null },
        }
      : {}),
  };
}

export async function getFaviconMetadata() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.brandAssets, PUBLIC_CACHE_TAGS.seo);

  try {
    return await prisma.brandAsset.findFirst({
      where: { assetKey: "favicon", isActive: true },
    });
  } catch (error) {
    console.warn("[public-cache] failed to load favicon metadata", error);
    return null;
  }
}

export async function getHomeSeoMetadata() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.home, PUBLIC_CACHE_TAGS.seo);

  try {
    return await prisma.cmsPage.findUnique({
      where: { slug: "home" },
      select: {
        seoTitle: true,
        seoDescription: true,
      },
    });
  } catch (error) {
    console.warn("[public-cache] failed to load home SEO metadata", error);
    return null;
  }
}

export async function getPublicShellData() {
  "use cache";
  cacheLife("hours");
  cacheTag(
    PUBLIC_CACHE_TAGS.shell,
    PUBLIC_CACHE_TAGS.brandAssets,
    PUBLIC_CACHE_TAGS.navigation,
    PUBLIC_CACHE_TAGS.footer,
    PUBLIC_CACHE_TAGS.complianceCards,
    PUBLIC_CACHE_TAGS.contactSettings,
  );

  try {
    const [
      brandSettings,
      companySettings,
      contactSettings,
      cmsPages,
      brandAssets,
      headerMenu,
      footerSections,
      socialLinks,
      complianceCards,
    ] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "brand" } }),
      prisma.siteSetting.findUnique({ where: { key: "company" } }),
      // Contact details are maintained in Contact Us CMS. The footer previously
      // read only the "company" setting, so a phone number entered there showed
      // on /contact and nowhere else.
      prisma.siteSetting.findUnique({ where: { key: "contact_settings" } }),
      // Navigation and Footer Builder both let an administrator pick a CMS page
      // instead of typing a URL, which stores a pageId. Neither renderer read
      // it, so choosing a page produced a link to nowhere. Slugs are loaded
      // here so the id can be resolved to a real href.
      prisma.cmsPage.findMany({ select: { id: true, slug: true } }),
      prisma.brandAsset.findMany({ where: { isActive: true } }),
      prisma.menu.findUnique({
        where: { location: "header" },
        include: {
          items: {
            where: { isVisible: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.footerSection.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        include: {
          links: {
            where: { isVisible: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.socialLink.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.complianceCard.findMany({
        where: verifiedTrustWhere({ requiresPermission: false }),
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const pageHref = new Map(
      cmsPages.map((page) => [page.id, page.slug === "home" ? "/" : `/${page.slug}`])
    );

    /**
     * The destination a menu item or footer link actually points at.
     *
     * A typed URL wins. Otherwise the chosen page is resolved to its route.
     * Null means neither was set, and the caller drops the item rather than
     * rendering a link that goes nowhere.
     */
    const resolveHref = (item: { url?: string | null; pageId?: string | null }): string | null => {
      if (item.url && item.url.trim()) return item.url.trim();
      if (item.pageId) return pageHref.get(item.pageId) ?? null;
      return null;
    };

    return {
      brandSettings,
      companySettings,
      contactSettings,
      brandAssets,
      headerMenu: headerMenu
        ? {
            ...headerMenu,
            items: headerMenu.items
              .map((item) => ({ ...item, url: resolveHref(item) }))
              .filter((item): item is typeof item & { url: string } => item.url !== null),
          }
        : null,
      footerSections: footerSections.map((section) => ({
        ...section,
        links: section.links
          .map((link) => ({ ...link, url: resolveHref(link) }))
          .filter((link): link is typeof link & { url: string } => link.url !== null),
      })),
      socialLinks,
      complianceCards,
    };
  } catch (error) {
    console.warn("[public-cache] failed to load public shell data", error);
    return {
      brandSettings: null,
      companySettings: null,
      contactSettings: null,
      brandAssets: [],
      headerMenu: null,
      footerSections: [],
      socialLinks: [],
      complianceCards: [],
    };
  }
}

export async function getHomePageData() {
  "use cache";
  cacheLife("hours");
  cacheTag(
    PUBLIC_CACHE_TAGS.home,
    PUBLIC_CACHE_TAGS.services,
    PUBLIC_CACHE_TAGS.testimonials,
    PUBLIC_CACHE_TAGS.partners,
    PUBLIC_CACHE_TAGS.trustedLogos,
    PUBLIC_CACHE_TAGS.complianceCards,
    PUBLIC_CACHE_TAGS.faqs,
    PUBLIC_CACHE_TAGS.caseStudies,
  );

  try {
    const [
      pageData,
      services,
      testimonials,
      partners,
      trustedLogos,
      complianceCards,
      faqs,
      caseStudies,
    ] = await Promise.all([
      prisma.cmsPage.findUnique({
        where: { slug: "home" },
        include: {
          sections: {
            where: { isVisible: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.service.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.testimonial.findMany({
        where: { ...verifiedTrustWhere({ requiresPermission: true, requiresVisibility: false }), approved: true, featured: true },
      }),
      prisma.partnerLogo.findMany({
        where: verifiedTrustWhere({ requiresPermission: false }),
        orderBy: { sortOrder: "asc" },
      }),
      prisma.trustedBusinessLogo.findMany({
        where: verifiedTrustWhere({ requiresPermission: true }),
        orderBy: { sortOrder: "asc" },
      }),
      prisma.complianceCard.findMany({
        where: verifiedTrustWhere({ requiresPermission: false }),
        orderBy: { sortOrder: "asc" },
      }),
      prisma.fAQ.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.caseStudy.findMany({
        where: { ...verifiedTrustWhere({ requiresPermission: true, requiresVisibility: false }), published: true },
      }),
    ]);

    return {
      pageData,
      services,
      testimonials,
      partners,
      trustedLogos,
      complianceCards,
      faqs,
      caseStudies,
    };
  } catch (error) {
    console.warn("[public-cache] failed to load homepage data", error);
    return {
      pageData: null,
      services: [],
      testimonials: [],
      partners: [],
      trustedLogos: [],
      complianceCards: [],
      faqs: [],
      caseStudies: [],
    };
  }
}

export async function getPublicPageSeoMetadata(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.cmsPages, PUBLIC_CACHE_TAGS.seo);

  try {
    return await prisma.cmsPage.findUnique({
      where: { slug },
      select: {
        seoTitle: true,
        seoDescription: true,
      },
    });
  } catch (error) {
    console.warn(`[public-cache] failed to load ${slug} SEO metadata`, error);
    return null;
  }
}

export async function getPublicPageData(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(
    PUBLIC_CACHE_TAGS.cmsPages,
    PUBLIC_CACHE_TAGS.services,
    PUBLIC_CACHE_TAGS.testimonials,
    PUBLIC_CACHE_TAGS.partners,
    PUBLIC_CACHE_TAGS.trustedLogos,
    PUBLIC_CACHE_TAGS.complianceCards,
    PUBLIC_CACHE_TAGS.faqs,
    PUBLIC_CACHE_TAGS.industries,
    PUBLIC_CACHE_TAGS.careers,
    PUBLIC_CACHE_TAGS.contactSettings,
  );

  try {
    const [
      pageData,
      services,
      testimonials,
      partners,
      trustedLogos,
      complianceCards,
      faqs,
      industries,
      careerJobs,
      contactSettingsRecord,
    ] = await Promise.all([
      prisma.cmsPage.findUnique({
        where: { slug },
        include: {
          sections: {
            where: { isVisible: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.service.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
      prisma.testimonial.findMany({ where: { ...verifiedTrustWhere({ requiresPermission: true, requiresVisibility: false }), approved: true, featured: true } }),
      prisma.partnerLogo.findMany({ where: verifiedTrustWhere({ requiresPermission: false }), orderBy: { sortOrder: "asc" } }),
      prisma.trustedBusinessLogo.findMany({ where: verifiedTrustWhere({ requiresPermission: true }), orderBy: { sortOrder: "asc" } }),
      prisma.complianceCard.findMany({ where: verifiedTrustWhere({ requiresPermission: false }), orderBy: { sortOrder: "asc" } }),
      prisma.fAQ.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
      prisma.industry.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
      prisma.careerJob.findMany({ where: { visible: true }, orderBy: { createdAt: "desc" } }),
      prisma.siteSetting.findUnique({ where: { key: "contact_settings" } }),
    ]);

    return {
      pageData,
      services,
      testimonials,
      partners,
      trustedLogos,
      complianceCards,
      faqs,
      industries,
      careerJobs,
      contactSettingsRecord,
    };
  } catch (error) {
    console.warn(`[public-cache] failed to load ${slug} page data`, error);
    return {
      pageData: null,
      services: [],
      testimonials: [],
      partners: [],
      trustedLogos: [],
      complianceCards: [],
      faqs: [],
      industries: [],
      careerJobs: [],
      contactSettingsRecord: null,
    };
  }
}

export async function getPublicServicesData() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.services);

  try {
    return await prisma.service.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.warn("[public-cache] failed to load services", error);
    return [];
  }
}

const productPriceDisplayModes = new Set<ServiceProductPriceDisplayMode>([
  "EXACT",
  "FROM",
  "REQUEST_PRICING",
  "HIDDEN",
]);

function readServiceProductFeatures(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((feature): feature is string => typeof feature === "string" && feature.trim().length > 0)
    : [];
}

function readServiceProductHref(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/book-consultation?service=Managed%20Services";
}

export async function getPublicServiceProducts(): Promise<ServiceProduct[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.serviceProducts);

  try {
    const packages = await prisma.servicePackage.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return packages.map((servicePackage) => {
      const priceDisplayMode = productPriceDisplayModes.has(servicePackage.priceDisplayMode as ServiceProductPriceDisplayMode)
        ? servicePackage.priceDisplayMode as ServiceProductPriceDisplayMode
        : "REQUEST_PRICING";

      return {
        name: servicePackage.name,
        recommendedCustomerSize: servicePackage.recommendedCustomerSize || "Suitable for organisations that need a clearly scoped technology service.",
        cadence: servicePackage.cadence || "Managed service",
        summary: servicePackage.description,
        features: readServiceProductFeatures(servicePackage.features),
        cta: servicePackage.ctaLabel || "Request pricing",
        href: readServiceProductHref(servicePackage.ctaUrl),
        featured: servicePackage.featured,
        pricingVisible: servicePackage.pricingVisible,
        priceDisplayMode,
        monthlyPrice: servicePackage.monthlyPrice?.toString() ?? null,
        annualPrice: servicePackage.annualPrice?.toString() ?? null,
      };
    });
  } catch (error) {
    console.warn("[public-cache] failed to load published service products", error);
    return [];
  }
}

export async function getPublicIndustriesData() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.industries);

  try {
    return await prisma.industry.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.warn("[public-cache] failed to load industries", error);
    return [];
  }
}

const publicInsightSelect = {
  slug: true,
  title: true,
  body: true,
  category: true,
  tags: true,
  author: true,
  publishAt: true,
  createdAt: true,
  seo: true,
} as const;

function publishedInsightWhere() {
  return {
    status: "PUBLISHED" as const,
    OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
  };
}

export async function getPublicInsights() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.insights, PUBLIC_CACHE_TAGS.seo);

  try {
    return await prisma.blogPost.findMany({
      where: publishedInsightWhere(),
      select: publicInsightSelect,
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.warn("[public-cache] failed to load published insights", error);
    return [];
  }
}

export async function getPublicInsightDetail(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.insights, PUBLIC_CACHE_TAGS.seo);

  try {
    return await prisma.blogPost.findFirst({
      where: { slug, ...publishedInsightWhere() },
      select: publicInsightSelect,
    });
  } catch (error) {
    console.warn(`[public-cache] failed to load published insight ${slug}`, error);
    return null;
  }
}

export async function getPublicLegalPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.legalPages);

  try {
    return await prisma.legalPage.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
  } catch (error) {
    console.warn(`[public-cache] failed to load legal page ${slug}`, error);
    return null;
  }
}

export async function getPublicServiceDetail(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.services);

  try {
    const service = await prisma.service.findFirst({ where: { slug, published: true } });
    if (!service) {
      return { service: null, related: [] };
    }

    const related = await prisma.service.findMany({
      where: { slug: { not: service.slug }, published: true },
      take: 3,
    });

    return { service, related };
  } catch (error) {
    console.warn(`[public-cache] failed to load service ${slug}`, error);
    return { service: null, related: [] };
  }
}

export async function getPublicIndustryDetail(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.industries);

  try {
    return await prisma.industry.findFirst({ where: { slug, published: true } });
  } catch (error) {
    console.warn(`[public-cache] failed to load industry ${slug}`, error);
    return null;
  }
}

export async function getPublicCareerJobs() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.careers);

  try {
    return await prisma.careerJob.findMany({
      where: { visible: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.warn("[public-cache] failed to load career jobs", error);
    return [];
  }
}

/**
 * Published case studies that additionally satisfy the Trust & Credentials gate:
 * verified, evidenced, unexpired and covered by a recorded customer permission.
 * A record failing any check is withheld rather than shown without proof.
 */
export async function getPublicCaseStudies() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.caseStudies);

  try {
    return await prisma.caseStudy.findMany({
      where: {
        ...verifiedTrustWhere({ requiresPermission: true, requiresVisibility: false }),
        published: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.warn("[public-cache] failed to load published case studies", error);
    return [];
  }
}

/** Site imagery that an administrator can replace, stored in the `site_images` setting. */
export type SiteImages = {
  /** Engine key -> image URL. */
  engines: Record<string, string | undefined>;
  /** Homepage hero image URL. */
  hero?: string;
  /** Industry slug -> image URL. */
  industries: Record<string, string | undefined>;
  /** Page key -> hero image URL, for pages that are not services or industries. */
  pages?: Record<string, string | undefined>;
  /** Service slug -> image URL, for the individual service pages. */
  services?: Record<string, string | undefined>;
};

function readImageMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, url] of Object.entries(value as Record<string, unknown>)) {
    if (typeof url === "string" && url.trim().length > 0) out[key] = url.trim();
  }
  return out;
}

/**
 * Replaceable site imagery. Falls back to the built-in defaults in
 * `lib/service-engines.ts` and the homepage when nothing is configured or the
 * read fails, so the public site always has usable images.
 */
export async function getSiteImages(): Promise<SiteImages> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.siteImages);

  try {
    const record = await prisma.siteSetting.findUnique({ where: { key: "site_images" } });
    const value = record?.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { engines: {}, industries: {} };

    const root = value as Record<string, unknown>;
    const hero = typeof root.hero === "string" && root.hero.trim().length > 0 ? root.hero.trim() : undefined;
    return {
      engines: readImageMap(root.engines),
      industries: readImageMap(root.industries),
      pages: readImageMap(root.pages),
      services: readImageMap(root.services),
      hero,
    };
  } catch (error) {
    console.warn("[public-cache] failed to load site images", error);
    return { engines: {}, industries: {} };
  }
}
