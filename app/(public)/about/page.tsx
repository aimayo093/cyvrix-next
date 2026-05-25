import { prisma } from "@/lib/prisma";
import { SectionRenderer } from "@/components/shared/SectionRenderer";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await prisma.cmsPage.findUnique({ where: { slug: "about" } });
  return {
    title: page?.seoTitle || "About CYVRIX | Premium IT Consultancy",
    description: page?.seoDescription || "CYVRIX Technologies is a premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.",
  };
}

export default async function AboutPage() {
  const [
    pageData,
    services,
    testimonials,
    partners,
    trustedLogos,
    complianceCards,
  ] = await Promise.all([
    prisma.cmsPage.findUnique({
      where: { slug: "about" },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.service.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    prisma.testimonial.findMany({ where: { approved: true, featured: true } }),
    prisma.partnerLogo.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.trustedBusinessLogo.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.complianceCard.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="pt-10 bg-[#020817] min-h-screen">
      <SectionRenderer
        sections={pageData?.sections || []}
        services={services}
        testimonials={testimonials}
        partners={partners}
        trustedLogos={trustedLogos}
        complianceCards={complianceCards}
      />
    </div>
  );
}
