"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Which surface the field sits on.
 *
 * This is an explicit prop rather than something callers patch through
 * `className`, because the field styles a focus state. A caller passing
 * `bg-white/5` cannot override a base `focus:bg-white` — tailwind-merge treats
 * the two as different variant groups — which previously left white text on a
 * white background as soon as the field was focused.
 */
type Tone = "light" | "dark";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  hasLeftIcon?: boolean;
  tone?: Tone;
}

const TONE_STYLES: Record<Tone, { field: string; icon: string; toggle: string }> = {
  light: {
    field:
      "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2691F0] focus:bg-white",
    icon: "text-slate-400",
    toggle: "text-slate-400 hover:text-slate-700",
  },
  dark: {
    field:
      "autofill-dark bg-white/5 border-white/10 text-white placeholder-slate-500 caret-white focus:border-[#2691F0] focus:bg-white/10 focus:ring-2 focus:ring-[#2691F0]/40",
    icon: "text-slate-500",
    toggle: "text-slate-400 hover:text-white",
  },
};

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, hasLeftIcon = false, tone = "light", ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    const styles = TONE_STYLES[tone];

    return (
      <div className="relative w-full">
        {hasLeftIcon && (
          <Lock className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5", styles.icon)} />
        )}
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            "w-full rounded-xl border font-bold text-sm py-3 transition-all focus:outline-none",
            styles.field,
            hasLeftIcon ? "pl-12" : "pl-4",
            "pr-12",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] rounded cursor-pointer flex items-center justify-center",
            styles.toggle
          )}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
