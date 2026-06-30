import * as React from "react";
import { ContactClient } from "./ContactClient";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("contact");
  return {
    title: page?.seoTitle || "Contact Us | CYVRIX Technologies",
    description: page?.seoDescription || "Speak to CYVRIX Technologies about IT support, cybersecurity, and cloud configurations.",
  };
}

export default async function ContactPage() {
  const { pageData, services, industries, contactSettingsRecord } =
    await getPublicPageData("contact");

  const contactSettings = (contactSettingsRecord?.value as Record<string, string>) || {
    salesEmail: "sales@cyvrix.co.uk",
    supportEmail: "support@cyvrix.co.uk",
    phone: "+44 (0) 20 8080 8080",
    hqAddress: "City of London, UK",
    salesSla: "< 1hr",
    supportSla: "15-min Critical SLA",
    phoneHours: "Mon-Fri: 8am - 6pm",
    hqDetails: "Secure Site Operations",
    slaWidgetTitle: "Our Performance Service Levels",
    slaWidgetSubtitle: "CYVRIX maintains contractual uptime and support SLAs. For general inquiries, we ensure rapid senior availability:",
    slaItem1Name: "Virtual CIO Consultations",
    slaItem1Value: "Same Business Day",
    slaItem2Name: "Critical Cybersecurity Escapes",
    slaItem2Value: "< 15 Minutes SLA",
    slaItem3Name: "UK Engineering Dispatch",
    slaItem3Value: "Under 4 Hours",
    securityTitle: "Standard Security & Compliance",
    securityItem1Name: "ISO 27001",
    securityItem1Value: "Framework Aligned",
    securityItem2Name: "Cyber Essentials",
    securityItem2Value: "Consultancy Certified",
    securityItem3Name: "GDPR Compliant",
    securityItem3Value: "Document Vault Protected",
    securityItem4Name: "UK Registered",
    securityItem4Value: "Incorporated in London"
  };

  return (
    <div className="bg-[#020817] min-h-screen">
      <ContactClient
        pageData={pageData}
        services={services}
        industries={industries}
        contactSettings={contactSettings}
      />
    </div>
  );
}

