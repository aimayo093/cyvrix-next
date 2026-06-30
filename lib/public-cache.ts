import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const PUBLIC_CACHE_TAGS = {
  shell: "public-shell",
  home: "home-page",
  brandAssets: "brand-assets",
  navigation: "navigation",
  footer: "footer",
  services: "services",
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
  careers: "careers",
  contactSettings: "contact-settings",
} as const;

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
        where: { isVisible: true },
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
        where: { approved: true, featured: true },
      }),
      prisma.partnerLogo.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.trustedBusinessLogo.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.complianceCard.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.fAQ.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.caseStudy.findMany({
        where: { published: true },
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
      prisma.testimonial.findMany({ where: { approved: true, featured: true } }),
      prisma.partnerLogo.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
      prisma.trustedBusinessLogo.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
      prisma.complianceCard.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
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

export async function getPublicLegalPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.legalPages);

  try {
    return await prisma.legalPage.findUnique({
      where: { slug },
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
    const service = await prisma.service.findUnique({ where: { slug } });
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
    return await prisma.industry.findUnique({ where: { slug } });
  } catch (error) {
    console.warn(`[public-cache] failed to load industry ${slug}`, error);
    return null;
  }
}
