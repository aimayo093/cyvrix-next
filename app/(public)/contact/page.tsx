import * as React from "react";
import { ContactClient } from "./ContactClient";
import { toPublicContactSettings } from "@/lib/contact-settings";
import { getPublicPageData, getPublicPageSeoMetadata, getSiteImages, type SiteImages } from "@/lib/public-cache";
import { getPageHero } from "@/lib/page-heroes";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("contact");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Contact Us",
    description: page?.seoDescription || "Speak to CYVRIX Technologies about IT support, cybersecurity, and cloud configurations.",
  };
}

export default async function ContactPage() {
  const [{ pageData, services, contactSettingsRecord }, siteImages] = await Promise.all([
    getPublicPageData("contact"),
    getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} })),
  ]);
  const hero = getPageHero("contact", siteImages.pages?.contact);

  const contactSettings = toPublicContactSettings(contactSettingsRecord?.value);

  return (
    <div className="bg-[#020817] min-h-screen">
      <ContactClient
        pageData={pageData}
        services={services}
        contactSettings={contactSettings}
        heroImage={hero.image}
        heroImageAlt={hero.imageAlt}
      />
    </div>
  );
}

