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
  );

  try {
    const [
      brandSettings,
      companySettings,
      brandAssets,
      headerMenu,
      footerSections,
      socialLinks,
      complianceCards,
    ] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "brand" } }),
      prisma.siteSetting.findUnique({ where: { key: "company" } }),
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

    return {
      brandSettings,
      companySettings,
      brandAssets,
      headerMenu,
      footerSections,
      socialLinks,
      complianceCards,
    };
  } catch (error) {
    console.warn("[public-cache] failed to load public shell data", error);
    return {
      brandSettings: null,
      companySettings: null,
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
