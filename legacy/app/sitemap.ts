import type { MetadataRoute } from "next";
import { blogPosts, caseStudies, industries, landingPages, legalPages, services } from "@/lib/cyvrix-data";

const baseUrl = "https://www.cyvrix.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/about", "/services", "/industries", "/pricing", "/case-studies", "/contact", "/request-quote", "/support", "/faq", "/blog", "/legal", "/careers", "/landing"];
  const dynamicRoutes = [
    ...services.map((item) => `/services/${item.slug}`),
    ...industries.map((item) => `/industries/${item.slug}`),
    ...caseStudies.map((item) => `/case-studies/${item.slug}`),
    ...blogPosts.map((item) => `/blog/${item.slug}`),
    ...legalPages.map((item) => `/legal/${item.slug}`),
    ...landingPages.map((item) => `/landing/${item.slug}`),
  ];

  return [...staticRoutes, ...dynamicRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
