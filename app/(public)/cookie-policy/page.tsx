import { Cookie } from "lucide-react";
import { LegalDocumentPage } from "@/components/public/LegalDocumentPage";
import { getPublicIntegrations, getPublicLegalPage } from "@/lib/public-cache";
import { toPublicLegalDocument, type PublicLegalDocument } from "@/lib/public-legal";
import { getDefaultLegalDocument } from "@/lib/legal-content";
import { INTEGRATIONS, type ActiveIntegration } from "@/lib/integrations";

export const metadata = {
  title: "Cookie Policy",
  description: "The CYVRIX cookie policy and its publication status.",
  alternates: { canonical: "/cookie-policy" },
};

/**
 * Names every analytics service switched on in the Integrations CMS.
 *
 * Without this, enabling Google Analytics or Clarity from the admin would leave
 * the policy describing only the hosting platform's analytics - a policy that
 * says less than the site does. The list is generated from the same setting that
 * loads the scripts, so the two cannot disagree.
 *
 * A reviewed default document has sections; one saved through the Legal Pages
 * CMS has only paragraphs. LegalDocumentPage renders one or the other, never
 * both, so the disclosure is added in the form the document already uses.
 * Adding a section to a paragraphs-only document would hide the reviewed text.
 */
function withIntegrationDisclosure(
  document: PublicLegalDocument,
  active: ActiveIntegration[],
): PublicLegalDocument {
  const services = INTEGRATIONS.filter(
    (integration) =>
      integration.category === "analytics" && active.some((item) => item.id === integration.id),
  );
  if (services.length === 0) return document;

  const paragraphs = [
    "The following third-party analytics services are currently enabled on this site. None of them loads until you allow the Analytics category, and withdrawing that choice stops them and removes the cookies they set on this domain. A provider may also set cookies on its own domain, which its own privacy information covers.",
    ...services.map((service) => {
      const cookies =
        service.cookies.length > 0 ? `Cookies: ${service.cookies.join(", ")}.` : "It does not set cookies.";
      return `${service.name}, provided by ${service.provider}. ${service.purpose} ${cookies} Privacy information: ${service.privacyUrl}`;
    }),
  ];

  if (document.sections && document.sections.length > 0) {
    return {
      ...document,
      sections: [...document.sections, { heading: "Third-party analytics services", paragraphs }],
    };
  }
  return { ...document, paragraphs: [...document.paragraphs, ...paragraphs] };
}

export default async function CookiePolicyPage() {
  const [legalPage, integrations] = await Promise.all([
    getPublicLegalPage("cookie-policy"),
    getPublicIntegrations().catch((): ActiveIntegration[] => []),
  ]);
  const base = toPublicLegalDocument(legalPage) ?? getDefaultLegalDocument("cookie-policy");

  return (
    <LegalDocumentPage
      title="Cookie Policy"
      eyebrow="Cookies"
      summary="Information about the published CYVRIX cookie policy."
      icon={Cookie}
      document={base ? withIntegrationDisclosure(base, integrations) : base}
    />
  );
}
