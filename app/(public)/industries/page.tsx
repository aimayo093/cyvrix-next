import { prisma } from "@/lib/prisma";
import { industries as staticIndustries } from "@/lib/cyvrix-data";
import { IndustriesClient } from "./IndustriesClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Industries | CYVRIX Technologies",
  description: "IT Support Shaped Around Real Operating Environments.",
};

export default async function IndustriesPage() {
  const dbIndustries = await prisma.industry.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" }
  });

  // Merge DB industries with static ones to preserve icons/challenges if missing
  const mergedIndustries = dbIndustries.map(dbInd => {
    const staticInd = staticIndustries.find(s => s.slug === dbInd.slug);
    return {
      ...dbInd,
      challenges: (dbInd.content as any)?.challenges || staticInd?.challenges || [],
      help: (dbInd.content as any)?.summary || staticInd?.help || "",
    };
  });

  return <IndustriesClient industries={mergedIndustries} />;
}
