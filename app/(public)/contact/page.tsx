import * as React from "react";
import { prisma } from "@/lib/prisma";
import { ContactClient } from "./ContactClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "contact" } });
  return {
    title: page?.seoTitle || "Contact Us | CYVRIX Technologies",
    description: page?.seoDescription || "Speak to CYVRIX Technologies about IT support, cybersecurity, and cloud configurations.",
  };
}

export default async function ContactPage() {
  const [pageData, services, industries] = await Promise.all([
    prisma.cmsPage.findUnique({
      where: { slug: "contact" },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.service.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    prisma.industry.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="bg-[#020817] min-h-screen">
      <ContactClient
        pageData={pageData}
        services={services}
        industries={industries}
      />
    </div>
  );
}

