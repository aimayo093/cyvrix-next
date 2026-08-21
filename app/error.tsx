"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { SiteMessageScreen } from "@/components/public/SiteMessageScreen";

/**
 * Route-level error boundary. Renders inside the root layout.
 *
 * The digest is a non-identifying reference produced by Next.js. It is shown so
 * a visitor can quote it to support; no stack trace or internal detail is exposed.
 */
export default function GlobalRouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    console.error("[route-error]", error.digest ?? "no-digest");
  }, [error]);

  return (
    <SiteMessageScreen
      eyebrow="Error 500"
      heading="Something went wrong at our end."
      description="This page could not be displayed because of an unexpected problem in our application. The issue has been recorded for investigation."
      icon={AlertTriangle}
      note={
        error.digest
          ? `If you contact us about this, please quote reference ${error.digest}.`
          : undefined
      }
      links={[
        { href: "/", label: "Home", description: "Return to the CYVRIX homepage." },
        { href: "/contact", label: "Contact us", description: "Tell us what you were trying to do." },
      ]}
    >
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="inline-flex h-12 items-center justify-center rounded-lg bg-[#2691F0] px-6 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817] active:scale-95"
      >
        Try again
      </button>
    </SiteMessageScreen>
  );
}
