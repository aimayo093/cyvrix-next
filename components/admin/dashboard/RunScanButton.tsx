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
  const [state, setState] = React.useState<"idle" | "running" | "error" | "forbidden" | "signed-out">("idle");
  // The button stays disabled until the refreshed card has arrived, so the
  // old card cannot start a second full scan in the meantime.
  const [refreshing, startRefresh] = React.useTransition();
  const busy = state === "running" || refreshing;

  const run = async () => {
    setState("running");
    try {
      const response = await fetch("/api/admin/security-scan", { method: "POST" });
      if (response.status === 401) return setState("signed-out");
      if (response.status === 403) return setState("forbidden");
      if (!response.ok) return setState("error");
      setState("idle");
      startRefresh(() => router.refresh());
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-[#041635] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Radar className="h-4 w-4" aria-hidden="true" />
        )}
        {state === "running" ? "Scanning…" : refreshing ? "Updating…" : "Run scan"}
      </button>
      <p role="status" className="text-xs font-semibold text-slate-500">
        {state === "error" && "The scan did not finish. Try again from the Security Centre."}
        {state === "forbidden" && "Your role can't run scans."}
        {state === "signed-out" && "Your session has ended. Reload the page and sign in again."}
      </p>
    </div>
  );
}
