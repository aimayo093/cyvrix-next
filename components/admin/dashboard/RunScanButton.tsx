"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar } from "lucide-react";

/**
 * Runs a security scan from the Today page, then refreshes it so the card
 * shows the new result. Same endpoint as the Security Centre's own button;
 * the server decides who may run it.
 */
export function RunScanButton() {
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "running" | "error" | "forbidden">("idle");

  const run = async () => {
    setState("running");
    try {
      const response = await fetch("/api/admin/security-scan", { method: "POST" });
      if (response.status === 403) return setState("forbidden");
      if (!response.ok) return setState("error");
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={state === "running"}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-[#041635] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] disabled:opacity-60"
      >
        {state === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Radar className="h-4 w-4" aria-hidden="true" />
        )}
        {state === "running" ? "Scanning…" : "Run scan"}
      </button>
      <p role="status" className="text-xs font-semibold text-slate-500">
        {state === "error" && "The scan did not finish. Try again from the Security Centre."}
        {state === "forbidden" && "Your role can't run scans."}
      </p>
    </div>
  );
}
