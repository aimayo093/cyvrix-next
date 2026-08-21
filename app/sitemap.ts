import { MetadataRoute } from "next";
import { blogPosts, industries, services } from "@/lib/cyvrix-data";
import { findPublicLegalPageDefinition, publicLegalPageDefinitions } from "@/lib/legal-page-definitions";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://cyvrix.co.uk";

function route(pathname: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]) {
  return {
    url: `${BASE_URL}${pathname}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

function dedupe(routes: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return [...new Map(routes.map((item) => [item.url, item])).values()];
}

const staticRoutes: MetadataRoute.Sitemap = [
  route("", 1, "weekly"),
  route("/about", 0.8, "monthly"),
  route("/contact", 0.8, "monthly"),
  route("/services", 0.9, "weekly"),
  route("/industries", 0.8, "monthly"),
  route("/pricing", 0.8, "weekly"),
  route("/assessments", 0.8, "monthly"),
  route("/blog", 0.8, "weekly"),
  route("/case-studies", 0.7, "monthly"),
  route("/careers", 0.7, "monthly"),
  route("/trust", 0.7, "monthly"),
  ...publicLegalPageDefinitions.map((page) => route(page.route, 0.3, "yearly")),
  ...services.map((service) => route(`/services/${service.slug}`, 0.8, "monthly")),
  ...industries.map((industry) => route(`/industries/${industry.slug}`, 0.7, "monthly")),
  ...blogPosts.map((post) => route(`/blog/${post.slug}`, 0.7, "monthly")),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [pages, posts, legalPages] = await Promise.all([
      prisma.cmsPage.findMany({
        where: { visible: true, status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.blogPost.findMany({
        where: {
          status: "PUBLISHED",
          OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
        },
        select: { slug: true, updatedAt: true },
      }),
      prisma.legalPage.findMany({
        where: { status: "PUBLISHED", slug: { in: publicLegalPageDefinitions.map((page) => page.slug) } },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const pageRoutes = pages.map((page) => ({
      ...route(`/${page.slug}`, 0.8, "weekly"),
      lastModified: page.updatedAt,
    }));
    const postRoutes = posts.map((post) => ({
      ...route(`/blog/${post.slug}`, 0.7, "monthly"),
      lastModified: post.updatedAt,
    }));
    const legalRoutes = legalPages.flatMap((page) => {
      const definition = findPublicLegalPageDefinition(page.slug);
      return definition
        ? [{ ...route(definition.route, 0.3, "yearly"), lastModified: page.updatedAt }]
        : [];
    });

    return dedupe([...staticRoutes, ...pageRoutes, ...postRoutes, ...legalRoutes]);
  } catch (error) {
    console.error("Failed to generate dynamic sitemap", error);
    return staticRoutes;
  }
}
