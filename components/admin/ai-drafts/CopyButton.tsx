"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

/** Copies a social post's text, for pasting into the network by hand. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#041635] transition-colors hover:border-[#2691F0] hover:text-[#2691F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy text"}</span>
    </button>
  );
}
