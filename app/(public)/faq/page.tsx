import * as React from "react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("faq");
  return {
    title: page?.seoTitle || "Frequently Asked Questions | CYVRIX Technologies",
    description: page?.seoDescription || "Get answers to common queries regarding our UK-managed IT support and services.",
  };
}

export default async function FAQPage() {
  const { pageData, faqs } = await getPublicPageData("faq");

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
        faqs={faqs}
      />
    </div>
  );
}
