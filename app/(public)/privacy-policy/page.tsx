import { ShieldCheck } from "lucide-react";
import { LegalDocumentPage } from "@/components/public/LegalDocumentPage";
import { getPublicLegalPage } from "@/lib/public-cache";
import { toPublicLegalDocument } from "@/lib/public-legal";
import { getDefaultLegalDocument } from "@/lib/legal-content";

export const metadata = {
  title: "Privacy Policy",
  description: "The CYVRIX privacy policy and its publication status.",
  alternates: { canonical: "/privacy-policy" },
};

export default async function PrivacyPolicyPage() {
  const document = toPublicLegalDocument(await getPublicLegalPage("privacy-policy")) ?? getDefaultLegalDocument("privacy-policy");

  return (
    <LegalDocumentPage
      title="Privacy Policy"
      eyebrow="Privacy"
      summary="Information about the published CYVRIX privacy policy."
      icon={ShieldCheck}
      document={document}
    />
  );
}
