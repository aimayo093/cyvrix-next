import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://cyvrix.co.uk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static Routes
  const staticRoutes = [
    "",
    "/about",
    "/contact",
    "/services",
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  try {
    // Dynamic CMS Pages
    const pages = await prisma.cmsPage.findMany({
      where: { visible: true, status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
    
    const pageRoutes = pages.map((page) => ({
      url: `${BASE_URL}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // Blog Posts
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
    
    const postRoutes = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    // Legal Pages
    const legalPages = await prisma.legalPage.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });

    const legalRoutes = legalPages.map((page) => ({
      url: `${BASE_URL}/legal/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    }));

    return [...staticRoutes, ...pageRoutes, ...postRoutes, ...legalRoutes];
  } catch (error) {
    console.error("Failed to generate dynamic sitemap", error);
    return staticRoutes;
  }
}
