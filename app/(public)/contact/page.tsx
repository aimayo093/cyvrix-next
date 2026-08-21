import * as React from "react";
import { ContactClient } from "./ContactClient";
import { toPublicContactSettings } from "@/lib/contact-settings";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("contact");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "Contact Us",
    description: page?.seoDescription || "Speak to CYVRIX Technologies about IT support, cybersecurity, and cloud configurations.",
  };
}

export default async function ContactPage() {
  const { pageData, services, contactSettingsRecord } =
    await getPublicPageData("contact");

  const contactSettings = toPublicContactSettings(contactSettingsRecord?.value);

  return (
    <div className="bg-[#020817] min-h-screen">
      <ContactClient
        pageData={pageData}
        services={services}
        contactSettings={contactSettings}
      />
    </div>
  );
}

