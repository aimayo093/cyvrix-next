"use client";

import * as React from "react";
import Link from "next/link";
import type { ComplianceCard, FooterLink as FooterLinkRecord, FooterSection, SocialLink } from "@/generated/prisma";
import { Logo } from "./Logo";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "@/components/shared/CookieConsent";
import { companyFacts, registeredCompanyLine } from "@/lib/company-facts";
import {
  MessageCircle,
  Mail,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Phone,
  Clock,
  LockKeyhole,
  LifeBuoy,
  Send,
  CheckCircle2,
} from "lucide-react";

type FooterSectionWithLinks = FooterSection & { links: FooterLinkRecord[] };

/** Render shape shared by CMS-managed sections and the built-in fallback. */
type FooterColumn = {
  key: string;
  title: string;
  description?: string | null;
  links: Array<{ key: string; label: string; url: string; openInNewTab?: boolean }>;
};

/**
 * Used whenever the CMS has no footer sections configured, so the footer is
 * never a bare logo. Admins can override the whole set in Footer Builder.
 */
const defaultFooterColumns: FooterColumn[] = [
  {
    key: "services",
    title: "Services",
    description: "Four ways to work with us.",
    links: [
      { key: "managed", label: "Managed Services", url: "/services" },
      { key: "cloudsec", label: "Cloud & Cybersecurity", url: "/services" },
      { key: "field", label: "Field Engineering", url: "/services" },
      { key: "professional", label: "Professional Services", url: "/services" },
      { key: "pricing", label: "Managed IT Plans", url: "/pricing" },
      { key: "assessments", label: "Free Assessments", url: "/assessments" },
    ],
  },
  {
    key: "company",
    title: "Company",
    description: "Who we are and how we work.",
    links: [
      { key: "about", label: "About CYVRIX", url: "/about" },
      { key: "industries", label: "Industries", url: "/industries" },
      { key: "case-studies", label: "Case Studies", url: "/case-studies" },
      { key: "insights", label: "Insights", url: "/blog" },
      { key: "careers", label: "Careers", url: "/careers" },
      { key: "trust", label: "Trust Centre", url: "/trust" },
    ],
  },
  {
    key: "support",
    title: "Support",
    description: "Get help or start a conversation.",
    links: [
      { key: "support-desk", label: "Support Desk", url: "/support" },
      { key: "portal", label: "Client Portal", url: "/portal" },
      { key: "book", label: "Book a Free Review", url: "/book-consultation" },
      { key: "quote", label: "Request a Quote", url: "/request-quote" },
      { key: "contact", label: "Contact Us", url: "/contact" },
      { key: "faq", label: "FAQs", url: "/faq" },
    ],
  },
  {
    key: "legal",
    title: "Legal",
    description: "Policies and terms.",
    links: [
      { key: "privacy", label: "Privacy Policy", url: "/privacy-policy" },
      { key: "terms", label: "Terms and Conditions", url: "/terms" },
      { key: "cookies", label: "Cookie Policy", url: "/cookie-policy" },
      { key: "data-rights", label: "Your Data Rights", url: "/privacy-request" },
      { key: "trust", label: "Trust Centre", url: "/trust" },
    ],
  },
];

type SocialItem = {
  key: string;
  platform: string;
  url: string;
  label: string;
  openInNewTab: boolean;
};

/**
 * Shown when the CMS has no social links configured, so the footer is not
 * missing its social icons entirely. These are the profiles recorded in the
 * project's own seed data — confirm or replace them in Admin → Social Links.
 */
const defaultSocialItems: SocialItem[] = [
  { key: "linkedin", platform: "LinkedIn", url: "https://linkedin.com/company/cyvrix", label: "CYVRIX on LinkedIn", openInNewTab: true },
  { key: "x", platform: "X/Twitter", url: "https://x.com/cyvrix", label: "CYVRIX on X", openInNewTab: true },
  { key: "github", platform: "GitHub", url: "https://github.com/cyvrix", label: "CYVRIX on GitHub", openInNewTab: true },
];

function toSocialItems(links: SocialLink[]): SocialItem[] {
  const visible = links.filter((link) => link.isVisible !== false);
  if (visible.length === 0) return defaultSocialItems;

  return visible
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((link) => ({
      key: link.id,
      platform: link.platform,
      url: link.url,
      label: link.label || link.platform,
      openInNewTab: link.openInNewTab ?? true,
    }));
}

function toFooterColumns(sections: FooterSectionWithLinks[]): FooterColumn[] {
  if (sections.length === 0) return defaultFooterColumns;

  return sections.map((section) => ({
    key: section.id,
    title: section.title,
    description: section.description,
    links: (section.links ?? [])
      .filter((link) => link.isVisible !== false)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((link) => ({
        key: link.id,
        label: link.label,
        url: link.url,
        openInNewTab: link.openInNewTab ?? false,
      })),
  }));
}

type FooterNavLinkProps = React.ComponentPropsWithoutRef<typeof Link> & {
  forceReload?: boolean;
};

const FooterNavLink = React.forwardRef<HTMLAnchorElement, FooterNavLinkProps>(
  ({ href, children, forceReload = false, ...props }, ref) => {
    const hrefString = href.toString();
    const isInternal =
      !hrefString.startsWith("#") &&
      !hrefString.startsWith("tel:") &&
      !hrefString.startsWith("mailto:") &&
      !hrefString.startsWith("http");

    if (forceReload && isInternal) {
      return (
        <a href={hrefString} ref={ref} {...props}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} ref={ref} {...props}>
        {children}
      </Link>
    );
  }
);
FooterNavLink.displayName = "FooterNavLink";

/* ── Newsletter form (inline, client-side) ─────────────────────────────── */
function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer", consent: consent ? "on" : "" }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Subscription failed.";
        throw new Error(message);
      }
      setState("done");
      setEmail("");
      setConsent(false);
    } catch (err: unknown) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        You&apos;re subscribed — thank you!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stay informed</p>
      <div className="flex gap-2">
        {/* honeypot */}
        <input name="_hp" type="text" className="hidden" tabIndex={-1} autoComplete="off" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2691F0] transition-colors"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 w-9 h-9 rounded-lg bg-[#2691F0] hover:bg-[#1a7ad4] flex items-center justify-center transition-colors disabled:opacity-50"
          aria-label="Subscribe"
        >
          <Send className="h-3.5 w-3.5 text-white" />
        </button>
      </div>
      <label className="flex items-start gap-2 text-[9px] leading-relaxed text-slate-400">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-3 w-3 shrink-0 accent-[#2691F0]"
        />
        <span>
          I agree to receive CYVRIX Insights and understand how my data is handled in the{" "}
          <Link href="/privacy-policy" className="text-slate-300 underline underline-offset-2 hover:text-white">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {state === "error" && <p className="text-rose-400 text-[10px] font-bold">{msg}</p>}
      <p className="text-[9px] text-slate-600 leading-relaxed">
        Every newsletter confirmation includes a signed unsubscribe link.
      </p>
    </form>
  );
}

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
  footerSections?: FooterSectionWithLinks[];
  socialLinks?: SocialLink[];
  logoUrl?: string;
  logoAlt?: string;
  companyDesc?: string;
  phone?: string;
  email?: string;
  /** Support hours from Contact Us CMS, e.g. "Mon-Fri: 8am - 6pm". */
  phoneHours?: string;
  copyright?: string;
  complianceCards?: ComplianceCard[];
  forceFullPageReload?: boolean;
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
  companyDesc = "CYVRIX helps organisations manage, secure and modernise the technology their people rely on.",
  phone,
  email,
  phoneHours,
  copyright,
  complianceCards = [],
  forceFullPageReload = false,
}: FooterProps) {
  const visibleComplianceCards = complianceCards.filter((card) => {
    const expiry = card.expiresAt ? new Date(card.expiresAt) : null;
    const hasCurrentEvidence =
      card.isVisible === true &&
      card.publicVisibility === true &&
      card.verificationStatus === "VERIFIED" &&
      Boolean(card.verificationReference && card.evidenceUrl && card.evidenceReviewedAt && card.evidenceReviewedBy) &&
      (!expiry || (!Number.isNaN(expiry.valueOf()) && expiry > new Date()));

    return hasCurrentEvidence &&
      (!card.displayLocation ||
        card.displayLocation.toLowerCase() === "all" ||
        card.displayLocation.toLowerCase().includes("footer"));
  });

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
              logoAlt={logoAlt}
              theme="dark"
              className="mb-4"
            />
            <p className="text-slate-400 text-sm leading-relaxed pr-6">
              {companyDesc}
            </p>
            
            {/* Contact Details */}
            <div className="space-y-3 pt-2 text-xs font-semibold text-slate-300">
              {/*
                Town only. The full postal address is a statutory disclosure and
                appears once at the bottom of the footer; repeating it here made
                the contact block read like a letterhead.
              */}
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[#2691F0] shrink-0" />
                <span>{companyFacts.registeredTown}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-[#2691F0] shrink-0" />
                  <FooterNavLink href={`tel:${phone.replace(/\s/g, "")}`} forceReload={forceFullPageReload} className="hover:text-white transition-colors">
                    {phone}
                  </FooterNavLink>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-[#2691F0] shrink-0" />
                  <FooterNavLink href={`mailto:${email}`} forceReload={forceFullPageReload} className="hover:text-white transition-colors">
                    {email}
                  </FooterNavLink>
                </div>
              )}
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap gap-3 pt-4">
              {toSocialItems(socialLinks).map((social) => {
                const Icon = getSocialIcon(social.platform);
                return (
                  <FooterNavLink
                    key={social.key}
                    href={social.url}
                    forceReload={forceFullPageReload}
                    target={social.openInNewTab ? "_blank" : undefined}
                    rel={social.url.startsWith("http") ? "noreferrer noopener" : undefined}
                    aria-label={social.label || social.platform}
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#2691F0] hover:border-[#2691F0] transition-all hover:scale-105"
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </FooterNavLink>
                );
              })}
            </div>
          </div>

          {/* Dynamic Footer Columns & Compliance Trust Section */}
          <div className="lg:col-span-8 space-y-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {toFooterColumns(footerSections).map((column) => (
                <div key={column.key} className="space-y-4">
                  <h4 className="font-outfit font-black text-xs uppercase tracking-widest text-white">
                    {column.title}
                  </h4>
                  {column.description && (
                    <p className="text-xs leading-5 text-slate-500 font-semibold">{column.description}</p>
                  )}
                  <ul className="space-y-2.5">
                    {column.links.map((link) => (
                      <li key={link.key}>
                        <FooterNavLink
                          href={link.url}
                          forceReload={forceFullPageReload}
                          target={link.openInNewTab ? "_blank" : undefined}
                          className="group flex items-center text-slate-300 hover:text-white transition-colors text-sm font-semibold"
                        >
                          <ArrowRight className="h-3 w-3 mr-1.5 opacity-0 -ml-4 text-[#2691F0] group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                          {link.label}
                        </FooterNavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/*
              Everything used to stack in the brand column, leaving the right
              two thirds empty below the nav links. The signup sits in the
              centre third and the support hours fill the right, so the footer
              balances instead of running down one side.
            */}
            <div className="grid grid-cols-1 gap-8 border-t border-white/5 pt-8 md:grid-cols-2">
              <NewsletterForm />

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  When we are available
                </p>
                <div className="mt-4 space-y-3 text-xs font-semibold text-slate-300">
                  {phoneHours && (
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 shrink-0 text-[#2691F0]" />
                      <span>{phoneHours}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 shrink-0 text-[#2691F0]" />
                      <FooterNavLink
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        forceReload={forceFullPageReload}
                        className="transition-colors hover:text-white"
                      >
                        {phone}
                      </FooterNavLink>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-xs font-medium leading-relaxed text-slate-500">
                  Outside these hours, existing clients should use the support route agreed for their
                  service.
                </p>
                <FooterNavLink
                  href="/support"
                  forceReload={forceFullPageReload}
                  className="mt-4 inline-flex items-center text-xs font-black uppercase tracking-wide text-[#2691F0] transition-colors hover:text-white"
                >
                  How support works
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </FooterNavLink>
              </div>
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
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
                    {visibleComplianceCards.map((card) => {
                      const CardIcon = getCardIcon(card.iconKey);

                      return (
                        <a
                          key={card.id}
                          href={card.externalUrl || "#"}
                          target={card.externalUrl ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          title={`${card.title} — ${card.description || ""}`}
                          className="group flex items-center justify-center transition-all duration-200 shrink-0"
                        >
                          {card.logoUrl ? (
                            <React.Fragment>
                              {/* CMS-managed trust logos can be served from approved remote storage. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={card.logoUrl}
                                alt={card.title}
                                className="h-11 w-auto object-contain filter brightness-75 opacity-70 group-hover:brightness-100 group-hover:opacity-100 transition-all duration-200"
                              />
                            </React.Fragment>
                          ) : (
                            <div className="flex items-center gap-2.5 bg-white/5 border border-[#2691F0]/20 rounded-xl px-3 py-2 opacity-80 group-hover:opacity-100 transition-all duration-200 shadow-sm shrink-0">
                              <CardIcon className="h-5 w-5 text-[#2691F0]" />
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-black text-slate-200 tracking-wide leading-none">
                                  {card.title}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-1">
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


        {/* Data protection statement: concrete and checkable rather than a blanket claim. */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-3xl text-xs leading-6 font-semibold text-slate-400">
              <LockKeyhole className="mr-2 inline h-3.5 w-3.5 text-[#2691F0]" />
              We handle personal data in line with UK GDPR and the Data Protection Act 2018, and are
              registered with the Information Commissioner&rsquo;s Office (ZC075683). Optional cookies
              are never set without your consent.
            </p>
            <FooterNavLink
              href="/privacy-request"
              forceReload={forceFullPageReload}
              className="shrink-0 text-xs font-black uppercase tracking-wide text-[#2691F0] transition-colors hover:text-white"
            >
              Exercise your data rights
            </FooterNavLink>
          </div>
        </div>

        {/*
          Statutory trading disclosure.

          Regulations 24 and 25 of the Company, Limited Liability Partnership and
          Business (Names and Trading Disclosures) Regulations 2015 require a UK
          company's website to state its registered name, the part of the UK it
          is registered in, its company number and its registered office address.
          "Registered in England & Wales" alone did not satisfy that.

          The registered office is residential and is withheld by the company's
          own decision, so this line carries the other particulars and states the
          trading location instead. See registeredCompanyLine.
        */}
        <div className="pt-8 border-t border-white/5">
          <p className="text-slate-500 text-xs font-medium leading-relaxed text-center md:text-left">
            {registeredCompanyLine()}
          </p>
        </div>

        {/* Footer Bottom bar */}
        <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wide text-center md:text-left">
            {(copyright || "CYVRIX Technologies Ltd.").replace(/all rights reserved\.?/gi, "").trim()}{" "}
            <span className="hidden sm:inline">All rights reserved.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
              className="text-slate-500 hover:text-[#2691F0] text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
            >
              Cookie Preferences
            </button>
            <FooterNavLink
              href="/search"
              forceReload={forceFullPageReload}
              className="text-slate-500 hover:text-[#2691F0] text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
            >
              Search
            </FooterNavLink>
            <FooterNavLink
              href="/trust"
              forceReload={forceFullPageReload}
              className="text-slate-500 hover:text-[#2691F0] text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
            >
              Trust Centre
            </FooterNavLink>
            <FooterNavLink
              href="/book-consultation"
              forceReload={forceFullPageReload}
              className="text-slate-500 hover:text-[#2691F0] text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
            >
              Book a Free Review
            </FooterNavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
