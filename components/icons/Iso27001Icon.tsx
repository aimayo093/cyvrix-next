import * as React from "react";
import { ShieldCheck } from "lucide-react";

export function Iso27001Icon() {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-[#2691F0]/20 bg-white/5 px-4 py-3 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2691F0]/10 text-[#2691F0]">
        <ShieldCheck className="h-6 w-6" />
      </div>

      <div>
        <p className="text-sm font-semibold text-[#041635] dark:text-white">
          ISO 27001
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Information Security Management
        </p>
      </div>
    </div>
  );
}
