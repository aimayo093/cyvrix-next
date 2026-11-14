"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordTouch } from "@/lib/attribution";

/**
 * Renders nothing and sends nothing. Notes the tab's arrival source on each
 * public page, so a campaign link survives internal navigation to a form.
 * See lib/attribution.ts.
 */
export function AttributionRecorder() {
  const pathname = usePathname();
  useEffect(() => {
    recordTouch();
  }, [pathname]);
  return null;
}
