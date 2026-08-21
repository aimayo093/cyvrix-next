import { Cookie } from "lucide-react";
import { LegalDocumentPage } from "@/components/public/LegalDocumentPage";
import { getPublicLegalPage } from "@/lib/public-cache";
import { toPublicLegalDocument } from "@/lib/public-legal";
import { getDefaultLegalDocument } from "@/lib/legal-content";

export const metadata = {
  title: "Cookie Policy",
  description: "The CYVRIX cookie policy and its publication status.",
  alternates: { canonical: "/cookie-policy" },
};

export default async function CookiePolicyPage() {
  const document = toPublicLegalDocument(await getPublicLegalPage("cookie-policy")) ?? getDefaultLegalDocument("cookie-policy");

  return (
    <LegalDocumentPage
      title="Cookie Policy"
      eyebrow="Cookies"
      summary="Information about the published CYVRIX cookie policy."
      icon={Cookie}
      document={document}
    />
  );
}
