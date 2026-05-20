import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/portal"],
      },
    ],
    sitemap: "https://www.cyvrix.co.uk/sitemap.xml",
  };
}
