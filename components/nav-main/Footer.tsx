"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import {
  MessageCircle,
  Mail,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Phone,
  LockKeyhole,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Linkedin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function Twitter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function Facebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function Instagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function Youtube(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
      <polygon points="10 15 15 12 10 9" />
    </svg>
  );
}

function Github(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}


interface FooterProps {
  footerSections?: any[];
  socialLinks?: any[];
  logoUrl?: string;
  logoAlt?: string;
  companyDesc?: string;
  phone?: string;
  email?: string;
  address?: string;
  copyright?: string;
  complianceCards?: any[];
}

function getSocialIcon(platform: string) {
  const plat = platform.toLowerCase().trim();
  if (plat.includes("linkedin")) return Linkedin;
  if (plat.includes("twitter") || plat === "x") return Twitter;
  if (plat.includes("facebook")) return Facebook;
  if (plat.includes("instagram")) return Instagram;
  if (plat.includes("youtube")) return Youtube;
  if (plat.includes("github")) return Github;
  if (plat.includes("whatsapp")) return MessageCircle;
  if (plat.includes("email") || plat === "mail") return Mail;
  return ShieldCheck;
}

export function Footer({
  footerSections = [],
  socialLinks = [],
  logoUrl,
  logoAlt,
  companyDesc = "Premium IT support and robust cybersecurity solutions for UK businesses that demand absolute reliability and strategic technological excellence.",
  phone,
  email,
  address,
  copyright,
  complianceCards = [],
}: FooterProps) {
  const visibleComplianceCards = complianceCards.filter(
    (card) =>
      !card.displayLocation ||
      card.displayLocation.toLowerCase() === "all" ||
      card.displayLocation.toLowerCase().includes("footer")
  );

  function getSafeDisplayStatus(card: { title: string; status: string; logoUrl?: string | null }) {
    if (card.status !== "Certified" || card.logoUrl) {
      return card.status;
    }
    const title = card.title.toLowerCase();
    if (title.includes("27001")) return "Framework aligned";
    if (title.includes("essentials")) return "Advisory service";
    if (title.includes("gdpr") || title.includes("dpa")) return "Compliance support";
    if (title.includes("itil")) return "Service aligned";
    return "Framework followed";
  }

  function getCardIcon(iconKey?: string | null) {
    const key = iconKey?.toLowerCase() || "";
    if (key.includes("lock") || key.includes("keyhole")) return LockKeyhole;
    if (key.includes("buoy") || key.includes("life")) return LifeBuoy;
    return ShieldCheck;
  }
  return (
    <footer className="relative bg-[#041635] text-white pt-24 pb-12 overflow-hidden border-t-4 border-[#2691F0]">
      {/* Background design elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#2691F0]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#06b6d4]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          {/* Logo & Brand Column */}
          <div className="lg:col-span-4 space-y-6">
            <Logo
              logoDefault={logoUrl}
              logoWhite={logoUrl}
              logoAlt={logoAlt}
              theme="dark"
              className="mb-4"
            />
            <p className="text-slate-400 text-sm leading-relaxed pr-6">
              {companyDesc}
            </p>
            
            {/* Contact Details */}
            <div className="space-y-3 pt-2 text-xs font-semibold text-slate-300">
              {address && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-[#2691F0] shrink-0" />
                  <span>{address}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-[#2691F0] shrink-0" />
                  <Link href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-white transition-colors">
                    {phone}
                  </Link>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-[#2691F0] shrink-0" />
                  <Link href={`mailto:${email}`} className="hover:text-white transition-colors">
                    {email}
                  </Link>
                </div>
              )}
            </div>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-4">
                {socialLinks.map((social) => {
                  const Icon = getSocialIcon(social.platform);
                  return (
                    <Link
                      key={social.id}
                      href={social.url}
                      target={social.openInNewTab ? "_blank" : undefined}
                      aria-label={social.label || social.platform}
                      className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#2691F0] hover:border-[#2691F0] transition-all hover:scale-105"
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Footer Columns & Compliance Trust Section */}
          <div className="lg:col-span-8 space-y-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {footerSections.map((section) => (
                <div key={section.id} className="space-y-5">
                  <h4 className="font-outfit font-black text-xs uppercase tracking-widest text-slate-400">
                    {section.title}
                  </h4>
                  {section.description && (
                    <p className="text-xs text-slate-500 font-semibold">{section.description}</p>
                  )}
                  <ul className="space-y-3">
                    {section.links &&
                      section.links
                        .filter((l: any) => l.isVisible !== false)
                        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                        .map((link: any) => (
                          <li key={link.id}>
                            <Link
                              href={link.url}
                              target={link.openInNewTab ? "_blank" : undefined}
                              className="group flex items-center text-slate-300 hover:text-white transition-colors text-sm font-semibold"
                            >
                              <ArrowRight className="h-3 w-3 mr-1.5 opacity-0 -ml-4 text-[#2691F0] group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                              {link.label}
                            </Link>
                          </li>
                        ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Compliance & Trust Section */}
            {visibleComplianceCards.length > 0 && (
              <div className="pt-6 border-t border-white/5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#2691F0]" />
                    <span className="font-outfit font-black text-[10px] uppercase tracking-widest text-slate-500">
                      Compliance & Trust
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    {visibleComplianceCards.map((card) => {
                      const displayStatus = getSafeDisplayStatus(card);
                      const CardIcon = getCardIcon(card.iconKey);

                      return (
                        <a
                          key={card.id}
                          href={card.externalUrl || "#"}
                          target={card.externalUrl ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          title={`${card.title} (${displayStatus}) — ${card.description || ""}`}
                          className="group flex items-center justify-center transition-all duration-200"
                        >
                          {card.logoUrl ? (
                            <img
                              src={card.logoUrl}
                              alt={card.title}
                              className="h-8 w-auto object-contain filter brightness-75 opacity-70 group-hover:brightness-100 group-hover:opacity-100 transition-all duration-200"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 bg-white/5 border border-[#2691F0]/20 rounded-xl px-2.5 py-1.5 opacity-80 group-hover:opacity-100 transition-all duration-200">
                              <CardIcon className="h-4 w-4 text-[#2691F0]" />
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black text-slate-200 tracking-tight leading-none">
                                  {card.title}
                                </span>
                                <span className="text-[7px] text-slate-400 font-semibold uppercase tracking-wider leading-none mt-0.5">
                                  {card.category || "Compliance"}
                                </span>
                              </div>
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Footer Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wide text-center md:text-left">
            {copyright || `© ${new Date().getFullYear()} CYVRIX Technologies Ltd.`}{" "}
            <span className="hidden sm:inline">All rights reserved. Registered in England &amp; Wales.</span>
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/book-consultation"
              className="text-slate-500 hover:text-[#2691F0] text-xs font-bold uppercase tracking-wide transition-colors"
            >
              Security Audit
            </Link>
            <Link
              href="#"
              className="text-slate-500 hover:text-[#2691F0] text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              System Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
