import * as React from "react";
import { prisma } from "@/lib/prisma";
import { SectionRenderer } from "@/components/shared/SectionRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "faq" } });
  return {
    title: page?.seoTitle || "Frequently Asked Questions | CYVRIX Technologies",
    description: page?.seoDescription || "Get answers to common queries regarding our UK-managed IT support and services.",
  };
}

export default async function FAQPage() {
  const [pageData, faqs] = await Promise.all([
    prisma.cmsPage.findUnique({
      where: { slug: "faq" },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.fAQ.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
        faqs={faqs}
      />
    </div>
  );
}
