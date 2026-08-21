import { Scale } from "lucide-react";
import { LegalDocumentPage } from "@/components/public/LegalDocumentPage";
import { getPublicLegalPage } from "@/lib/public-cache";
import { toPublicLegalDocument } from "@/lib/public-legal";

export const metadata = {
  title: "Terms of Service",
  description: "The CYVRIX terms of service and their publication status.",
  alternates: { canonical: "/terms" },
};

export default async function TermsOfServicePage() {
  const document = toPublicLegalDocument(await getPublicLegalPage("terms-of-service"));

  return (
    <LegalDocumentPage
      title="Terms of Service"
      eyebrow="Terms"
      summary="Information about the published CYVRIX terms of service."
      icon={Scale}
      document={document}
    />
  );
}
