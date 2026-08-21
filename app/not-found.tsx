import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { SiteMessageScreen } from "@/components/public/SiteMessageScreen";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you requested could not be found on the CYVRIX website.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteMessageScreen
      eyebrow="Error 404"
      heading="We could not find that page."
      description="The address may have been mistyped, or the page may have been moved or retired. Nothing is wrong with your connection."
      icon={Compass}
      links={[
        { href: "/", label: "Home", description: "Return to the CYVRIX homepage." },
        { href: "/services", label: "Services", description: "Managed IT, cloud, cybersecurity and infrastructure." },
        { href: "/search", label: "Search the site", description: "Find services, industries, insights and roles." },
        { href: "/contact", label: "Contact us", description: "Speak to the team about what you were looking for." },
      ]}
    />
  );
}
