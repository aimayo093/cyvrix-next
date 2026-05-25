"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
  logoDefault?: string;
  logoWhite?: string;
  logoDark?: string;
  logoSticky?: string;
  logoAlt?: string;
  theme?: "light" | "dark";
}

export function Logo({
  variant = "full",
  className,
  logoDefault,
  logoWhite,
  logoDark,
  logoSticky,
  logoAlt = "CYVRIX Technologies",
  theme = "dark",
}: LogoProps) {
  // Determine which logo URL to use
  let activeLogo = logoDefault || "";
  if (theme === "dark") {
    activeLogo = logoSticky || logoWhite || logoDefault || "";
  } else if (theme === "light") {
    activeLogo = logoDark || logoDefault || "";
  }

  return (
    <Link href="/" className={cn("flex items-center gap-2 group relative block", className)}>
      {activeLogo ? (
        <div className="relative h-10 w-44 transition-opacity duration-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeLogo}
            alt={logoAlt}
            className="h-10 w-auto object-contain transition-all duration-300"
          />
        </div>
      ) : (
        <>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-outfit font-black text-2xl transition-colors shadow-lg shrink-0",
            theme === "dark" 
              ? "bg-white text-[#041635] group-hover:bg-[#2691F0] group-hover:text-white" 
              : "bg-[#041635] text-white group-hover:bg-[#2691F0]"
          )}>
            C
          </div>
          {variant === "full" && (
            <div className="flex flex-col leading-none">
              <span className={cn(
                "font-outfit text-xl font-black tracking-tight transition-colors duration-300",
                theme === "dark" ? "text-white" : "text-[#041635]"
              )}>
                CYVRIX
              </span>
              <span className="text-[10px] font-black text-[#2691F0] tracking-[0.2em] uppercase">
                Technologies
              </span>
            </div>
          )}
        </>
      )}
    </Link>
  );
}
