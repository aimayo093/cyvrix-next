import * as React from "react";
import { prisma } from "@/lib/prisma";
import { SectionRenderer } from "@/components/shared/SectionRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "support" } });
  return {
    title: page?.seoTitle || "Support Desk | CYVRIX Technologies",
    description: page?.seoDescription || "Raise a technical support ticket or contact our operations desk.",
  };
}

export default async function SupportPage() {
  const [pageData] = await Promise.all([
    prisma.cmsPage.findUnique({
      where: { slug: "support" },
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
      />
    </div>
  );
}
