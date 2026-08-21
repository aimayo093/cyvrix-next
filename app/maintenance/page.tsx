import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { SiteMessageScreen } from "@/components/public/SiteMessageScreen";

export const metadata: Metadata = {
  title: "Planned maintenance",
  description: "The CYVRIX website is temporarily unavailable while planned maintenance is carried out.",
  robots: { index: false, follow: false },
};

/**
 * Static maintenance screen. It is deliberately free of database and CMS reads
 * so it remains available while dependencies are unavailable. Route traffic here
 * from the edge or hosting platform during a maintenance window.
 */
export default function MaintenancePage() {
  return (
    <SiteMessageScreen
      eyebrow="Planned maintenance"
      heading="We are carrying out scheduled maintenance."
      description="The website is temporarily unavailable while we complete planned work. Existing support arrangements are unaffected and our team can still be reached by your usual route."
      icon={Wrench}
      note="If you have an urgent issue and hold a support agreement with CYVRIX, please use the contact route set out in that agreement."
    />
  );
}
