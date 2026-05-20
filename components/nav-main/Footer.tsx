"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ArrowRight, Mail, Phone, MapPin, Globe, Shield, Cpu } from "lucide-react";
import { Button } from "@/components/shared/Button";

const footerLinks = {
  Services: [
    { name: "Managed IT Support", href: "/services/managed-it-support" },
    { name: "Cybersecurity", href: "/services/cybersecurity" },
    { name: "Cloud Solutions", href: "/services/cloud-solutions" },
    { name: "IT Consultancy", href: "/services/it-consultancy" },
  ],
  Company: [
    { name: "About Us", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Case Studies", href: "/case-studies" },
    { name: "Contact", href: "/contact" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/legal/privacy-policy" },
    { name: "Terms of Service", href: "/legal/terms-of-service" },
    { name: "Cookies Policy", href: "/legal/cookies-policy" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#041635] text-white pt-24 pb-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-1">
            <Logo className="mb-6 brightness-0 invert" />
            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
              Premium IT support and cybersecurity solutions for UK businesses that demand absolute reliability and strategic excellence.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-[#2691F0] transition-colors">
                <Globe className="h-5 w-5" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-[#2691F0] transition-colors">
                <Shield className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-outfit font-black text-sm uppercase tracking-widest mb-6 text-white/50">{title}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-slate-400 hover:text-[#2691F0] transition-colors text-sm font-bold">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs font-bold">
            &copy; {new Date().getFullYear()} CYVRIX Technologies Ltd. All rights reserved. Registered in England & Wales.
          </p>
          <div className="flex gap-8">
            <Link href="#" className="text-slate-500 hover:text-white text-xs font-bold transition-colors">Security Audit</Link>
            <Link href="#" className="text-slate-500 hover:text-white text-xs font-bold transition-colors">Status Page</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
