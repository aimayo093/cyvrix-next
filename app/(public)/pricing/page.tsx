import * as React from "react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { ProductisedServices } from "@/components/public/ProductisedServices";
import { pricingPackages as staticPackages, productisedServicePlans } from "@/lib/cyvrix-data";
import { getPublicPageData, getPublicPageSeoMetadata, getPublicServiceProducts } from "@/lib/public-cache";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("pricing");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Managed IT Plans",
    description: page?.seoDescription || "Explore managed IT service plans and the right commercial route for cloud, cybersecurity, field engineering or professional technology work.",
  };
}

export default async function PricingPage() {
  const [{ pageData }, publishedProducts] = await Promise.all([
    getPublicPageData("pricing"),
    getPublicServiceProducts(),
  ]);
  const hasPublishedCmsSections = Boolean(pageData?.sections?.length);
  const products = publishedProducts.length > 0 ? publishedProducts : productisedServicePlans;

  return (
    <main className="min-h-screen bg-[#020817]">
      {hasPublishedCmsSections ? (
        <div className="pt-10">
          <SectionRenderer sections={pageData?.sections || []} pricingPackages={staticPackages} />
        </div>
      ) : (
        <ProductisedServices plans={products} />
      )}
    </main>
  );
}
