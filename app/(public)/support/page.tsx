import * as React from "react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("support");
  return {
    title: page?.seoTitle || "Support Desk | CYVRIX Technologies",
    description: page?.seoDescription || "Raise a technical support ticket or contact our operations desk.",
  };
}

export default async function SupportPage() {
  const { pageData } = await getPublicPageData("support");

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
      />
    </div>
  );
}
