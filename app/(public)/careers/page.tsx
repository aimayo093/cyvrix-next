import * as React from "react";
import { prisma } from "@/lib/prisma";
import { SectionRenderer } from "@/components/shared/SectionRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "careers" } });
  return {
    title: page?.seoTitle || "Careers | CYVRIX Technologies",
    description: page?.seoDescription || "Join CYVRIX Technologies and help us build calm, secure, and resilient technology operations.",
  };
}

export default async function CareersPage() {
  const [pageData, activeJobs] = await Promise.all([
    prisma.cmsPage.findUnique({
      where: { slug: "careers" },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.careerJob.findMany({
      where: { visible: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
        careerJobs={activeJobs}
      />
    </div>
  );
}
