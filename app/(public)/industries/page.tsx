import { IndustriesClient } from "./IndustriesClient";
import { Metadata } from "next";
import { getPublicIndustriesData } from "@/lib/public-cache";
import { getStaticPublicIndustry, toPublicIndustry } from "@/lib/public-industry";
import { industries as staticIndustries } from "@/lib/cyvrix-data";

export const metadata: Metadata = {
  title: "Industries",
  description: "IT Support Shaped Around Real Operating Environments.",
};

export default async function IndustriesPage() {
  const dbIndustries = await getPublicIndustriesData();
  const industries = dbIndustries.length > 0
    ? dbIndustries.map(toPublicIndustry)
    : staticIndustries.flatMap((industry) => {
      const publicIndustry = getStaticPublicIndustry(industry.slug);
      return publicIndustry ? [publicIndustry] : [];
    });

  return <IndustriesClient industries={industries} />;
}
