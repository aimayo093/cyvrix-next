import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { findIndustry as findStaticIndustry } from "@/lib/cyvrix-data";
import { IndustryClient } from "./IndustryClient";

interface IndustryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const industries = await prisma.industry.findMany({ select: { slug: true } });
  return industries.map((ind) => ({ slug: ind.slug }));
}

export async function generateMetadata({ params }: IndustryPageProps) {
  const { slug } = await params;
  const industry = await prisma.industry.findUnique({ where: { slug } });
  
  return {
    title: industry ? `${industry.title} | CYVRIX Technologies` : "Industry Detail",
    description: industry ? (industry.content as any)?.summary || "Specialised IT solutions for your sector" : "Specialised IT solutions",
  };
}

export default async function IndustryDetailPage({ params }: IndustryPageProps) {
  const { slug } = await params;
  
  const industry = await prisma.industry.findUnique({ where: { slug } });
  if (!industry) notFound();

  const staticInd = findStaticIndustry(slug);
  const content = industry.content as any;

  const mergedIndustry = {
    ...industry,
    challenges: content?.challenges?.length ? content.challenges : (staticInd?.challenges || []),
    help: content?.summary || staticInd?.help || "",
    solutions: content?.solutions?.length ? content.solutions : (staticInd?.solutions || []),
    services: content?.services?.length ? content.services : (staticInd?.services || []),
    image: content?.image || "",
  };

  return <IndustryClient industry={mergedIndustry} />;
}
