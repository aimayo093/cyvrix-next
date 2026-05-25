import * as React from "react";
import { prisma } from "@/lib/prisma";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { pricingPackages as staticPackages } from "@/lib/cyvrix-data";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "pricing" } });
  return {
    title: page?.seoTitle || "Pricing | CYVRIX Technologies",
    description: page?.seoDescription || "Explore our predictable IT support and cybersecurity plans.",
  };
}

export default async function PricingPage() {
  const [pageData] = await Promise.all([
    prisma.cmsPage.findUnique({
      where: { slug: "pricing" },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
        pricingPackages={staticPackages}
      />
    </div>
  );
}
