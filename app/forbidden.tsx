import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { SiteMessageScreen } from "@/components/public/SiteMessageScreen";

export const metadata: Metadata = {
  title: "Access not permitted",
  description: "You do not have permission to view this area of the CYVRIX platform.",
  robots: { index: false, follow: false },
};

export default function Forbidden() {
  return (
    <SiteMessageScreen
      eyebrow="Error 403"
      heading="You do not have access to this area."
      description="Your account is signed in, but it does not hold the permissions required for this page. Access is granted by role, so this may be intentional."
      icon={LockKeyhole}
      note="If you believe you should have access, ask a Super Admin to review the role assigned to your account."
      links={[
        { href: "/", label: "Home", description: "Return to the CYVRIX homepage." },
        { href: "/contact", label: "Contact us", description: "Request a review of your access." },
      ]}
    />
  );
}
