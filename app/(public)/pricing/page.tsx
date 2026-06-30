import * as React from "react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { pricingPackages as staticPackages } from "@/lib/cyvrix-data";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("pricing");
  return {
    title: page?.seoTitle || "Pricing | CYVRIX Technologies",
    description: page?.seoDescription || "Explore our predictable IT support and cybersecurity plans.",
  };
}

export default async function PricingPage() {
  const { pageData } = await getPublicPageData("pricing");

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
        pricingPackages={staticPackages}
      />
    </div>
  );
}
