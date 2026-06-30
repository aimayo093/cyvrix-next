import * as React from "react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("careers");
  return {
    title: page?.seoTitle || "Careers | CYVRIX Technologies",
    description: page?.seoDescription || "Join CYVRIX Technologies and help us build calm, secure, and resilient technology operations.",
  };
}

export default async function CareersPage() {
  const { pageData, careerJobs } = await getPublicPageData("careers");

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
        careerJobs={careerJobs}
      />
    </div>
  );
}
