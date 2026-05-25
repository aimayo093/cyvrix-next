import { prisma } from "@/lib/prisma";
import { SectionRenderer } from "@/components/shared/SectionRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "home" } });
  return {
    title: page?.seoTitle || "CYVRIX Technologies | Managed IT, Cybersecurity & Cloud",
    description: page?.seoDescription || "Enterprise-grade IT support, cybersecurity, and cloud solutions for UK businesses.",
  };
}

export default async function HomePage() {
  const [
    pageData,
    services,
    testimonials,
    partners,
    trustedLogos,
    complianceCards,
    faqs,
    caseStudies,
  ] = await Promise.all([
    prisma.cmsPage.findUnique({
      where: { slug: "home" },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.service.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.testimonial.findMany({
      where: { approved: true, featured: true },
    }),
    prisma.partnerLogo.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.trustedBusinessLogo.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.complianceCard.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.fAQ.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.caseStudy.findMany({
      where: { published: true },
    }),
  ]);

  return (
    <SectionRenderer
      sections={pageData?.sections || []}
      services={services}
      testimonials={testimonials}
      partners={partners}
      trustedLogos={trustedLogos}
      complianceCards={complianceCards}
      faqs={faqs}
      caseStudies={caseStudies}
    />
  );
}
