import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("about");
  return {
    title: page?.seoTitle || "About CYVRIX | Premium IT Consultancy",
    description: page?.seoDescription || "CYVRIX Technologies is a premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.",
  };
}

export default async function AboutPage() {
  const { pageData, services, testimonials, partners, trustedLogos, complianceCards } =
    await getPublicPageData("about");

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
