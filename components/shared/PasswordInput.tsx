"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  hasLeftIcon?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, hasLeftIcon = false, ...props }, ref) => {
    const [show, setShow] = React.useState(false);

    return (
      <div className="relative w-full">
        {hasLeftIcon && (
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        )}
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            "w-full bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm py-3",
            hasLeftIcon ? "pl-12" : "pl-4",
            "pr-12",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
