"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <div className="w-10 h-10 rounded-xl bg-[#041635] flex items-center justify-center text-white font-outfit font-black text-2xl group-hover:bg-[#2691F0] transition-colors shadow-lg">
        C
      </div>
      {variant === "full" && (
        <div className="flex flex-col leading-none">
          <span className="font-outfit text-xl font-black text-[#041635] tracking-tight">CYVRIX</span>
          <span className="text-[10px] font-black text-[#2691F0] tracking-[0.2em] uppercase">Technologies</span>
        </div>
      )}
    </Link>
  );
}
