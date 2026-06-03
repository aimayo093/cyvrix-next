"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Headphones,
  Laptop,
  Server,
  Network,
  Cloud,
  BriefcaseBusiness,
  DatabaseBackup,
  Wrench,
  PhoneCall,
  Scale,
  Rocket,
  ShieldAlert,
  Cpu,
  MonitorSmartphone,
  Check,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Lock,
  LockKeyhole,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

interface SectionRendererProps {
  sections: any[];
  services?: any[];
  industries?: any[];
  testimonials?: any[];
  faqs?: any[];
  caseStudies?: any[];
  partners?: any[];
  trustedLogos?: any[];
  complianceCards?: any[];
  pricingPackages?: any[];
  careerJobs?: any[];
  forceFullPageReload?: boolean;
}

function resolveColor(value?: string | null, defaultClass: string = "") {
  if (!value || value === "default" || value === "") return { className: defaultClass, style: {} };
  const trimmed = value.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("rgb") || trimmed.startsWith("hsl") || trimmed.startsWith("var")) {
    return { className: "", style: { color: trimmed } };
  }
  return { className: trimmed, style: {} };
}

function normalizeSectionType(type: string): string {
  const t = type?.toLowerCase() || "";
  if (t === "hero" || t === "pricing_hero" || t === "contact_hero" || t === "support_hero" || t === "faq_hero") return "Hero";
  if (t === "text_block" || t === "text block" || t === "custom rich text" || t === "custom_rich_text") return "Text block";
  if (t === "image_and_text" || t === "image and text") return "Image and text";
  if (t === "features" || t === "feature_cards" || t === "feature cards") return "Feature cards";
  if (t === "services_grid" || t === "service_cards" || t === "service cards") return "Service cards";
  if (t === "industries" || t === "industry_cards" || t === "industry cards") return "Industry cards";
  if (t === "compliance_cards" || t === "compliance_card" || t === "compliance cards") return "Compliance cards";
  if (t === "accredited_partners" || t === "partner_logos" || t === "partner logos") return "Partner logos";
  if (t === "trusted_businesses" || t === "trusted_logos" || t === "trusted logos") return "Trusted logos";
  if (t === "testimonials" || t === "testimonial") return "Testimonials";
  if (t === "faq" || t === "faq_preview" || t === "faq preview") return "FAQ preview";
  if (t === "case_study_preview" || t === "case study preview") return "Case study preview";
  if (t === "cta_section" || t === "cta section") return "CTA section";
  if (t === "contact_form" || t === "contact_section" || t === "contact section") return "Contact section";
  if (t === "pricing" || t === "pricing_cards" || t === "pricing cards") return "Pricing cards";
  if (t === "statistics" || t === "stats") return "Statistics";
  if (t === "process/timeline" || t === "process" || t === "timeline") return "Process/timeline";
  if (t === "media_gallery" || t === "media gallery") return "Media gallery";
  if (t === "career_openings" || t === "career openings" || t === "careers" || t === "jobs") return "Career openings";
  return type; // Fall back to original
}

function getIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes("shield") || k.includes("security")) return ShieldCheck;
  if (k.includes("check") || k.includes("success")) return CheckCircle2;
  if (k.includes("support") || k.includes("headphone")) return Headphones;
  if (k.includes("laptop") || k.includes("device")) return Laptop;
  if (k.includes("server") || k.includes("infra")) return Server;
  if (k.includes("network")) return Network;
  if (k.includes("cloud")) return Cloud;
  if (k.includes("consult") || k.includes("business")) return BriefcaseBusiness;
  if (k.includes("backup") || k.includes("database")) return DatabaseBackup;
  if (k.includes("wrench") || k.includes("repair")) return Wrench;
  if (k.includes("phone")) return PhoneCall;
  if (k.includes("scale") || k.includes("compliance")) return Scale;
  if (k.includes("rocket") || k.includes("digital")) return Rocket;
  if (k.includes("alert")) return ShieldAlert;
  if (k.includes("cpu")) return Cpu;
  if (k.includes("monitor")) return MonitorSmartphone;
  if (k.includes("lock")) return Lock;
  return ShieldCheck;
}

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

export function SectionRenderer({
  sections,
  services = [],
  industries = [],
  testimonials = [],
  faqs = [],
  caseStudies = [],
  partners = [],
  trustedLogos = [],
  complianceCards = [],
  pricingPackages = [],
  careerJobs = [],
  forceFullPageReload = true,
}: SectionRendererProps) {
  const visibleSections = sections
    .filter((s) => s.isVisible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const CustomLink = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof Link> & { forceReload?: boolean }>(
    ({ href, children, forceReload = forceFullPageReload, ...props }, ref) => {
      const hrefStr = href ? href.toString() : "";
      const isInternal = hrefStr && !hrefStr.startsWith("#") && !hrefStr.startsWith("tel:") && !hrefStr.startsWith("mailto:") && !hrefStr.startsWith("http");
      if (forceReload && isInternal) {
        return (
          <a href={hrefStr} ref={ref} {...props}>
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
  CustomLink.displayName = "CustomLink";

  return (
    <div className="space-y-0">
      {visibleSections.map((sec) => {
        const settings = (sec.settingsJson as Record<string, any>) || {};
        const bgStyle = sec.backgroundStyle || "dark";
        const layout = sec.layoutStyle || "left";

        const isLightTheme = bgStyle === "light" || bgStyle === "silver";

        const bgClass =
          bgStyle === "light"
            ? "bg-slate-50 text-slate-900 border-b border-slate-200"
            : bgStyle === "silver"
              ? "bg-slate-100 text-slate-900 border-b border-slate-200"
              : bgStyle === "brand"
                ? "bg-[#041635] text-white border-b border-white/5"
                : bgStyle === "azure"
                  ? "bg-[#2691F0] text-white border-b border-white/5"
                  : bgStyle === "royal"
                    ? "bg-[#1E40AF] text-white border-b border-white/5"
                    : bgStyle === "teal"
                      ? "bg-[#0D9488] text-white border-b border-white/5"
                      : bgStyle === "glassmorphic"
                        ? "bg-[#041635]/85 backdrop-blur-md text-white border-b border-white/5"
                        : "bg-[#020817] text-slate-300 border-b border-white/5";

        const titleClass = isLightTheme ? "text-[#041635]" : "text-white";
        const subtitleClass = bgStyle === "light" ? "text-[#2691F0]" : "text-[#2691F0]";
        const descClass = isLightTheme ? "text-slate-600" : "text-slate-400";

        // Dynamic custom color resolvers mapping
        const titleColorRes = resolveColor(settings.titleColor || settings.customTitleColor, titleClass);
        const subtitleColorRes = resolveColor(settings.eyebrowColor || settings.subtitleColor || settings.customSubtitleColor, subtitleClass);
        const descColorRes = resolveColor(settings.bodyColor || settings.customBodyColor, descClass);

        switch (normalizeSectionType(sec.sectionType)) {
          // ─── 1. HERO SECTION ───────────────────────────────────────────────
          case "Hero":
            const overlayOpacity = settings.overlayOpacity ?? 0.65;
            const focalPosition = settings.focalPosition ?? "center";
            const cardTitle = settings.cardTitle ?? "Premium UK Operations Center";
            const focalClass = 
              focalPosition === "top" ? "bg-top" :
              focalPosition === "bottom" ? "bg-bottom" :
              focalPosition === "left" ? "bg-left" :
              focalPosition === "right" ? "bg-right" : "bg-center";

            const maskClass = isLightTheme 
              ? (bgStyle === "silver" ? "from-slate-100" : "from-slate-50")
              : "from-[#020817]";

            return (
              <section key={sec.id} className={cn("relative pt-24 pb-20 lg:pt-36 lg:pb-32 overflow-hidden", bgClass)}>
                {sec.mediaId ? (
                  <div
                    className={cn(
                      "absolute inset-0 z-0 bg-cover transition-opacity duration-500",
                      isLightTheme ? "mix-blend-normal" : "mix-blend-multiply",
                      focalClass
                    )}
                    style={{ 
                      backgroundImage: `url(${sec.mediaId})`,
                      opacity: overlayOpacity
                    }}
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(38,145,240,0.15),_transparent_45%)]" />
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(6,182,212,0.12),_transparent_50%)]" />
                    <div className="absolute inset-0 z-0 bg-corporate-grid opacity-35" />
                  </>
                )}
                <div className={cn("absolute inset-0 bg-gradient-to-t via-transparent to-transparent pointer-events-none z-0", maskClass)} />
                
                <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
                  <div className={cn("grid grid-cols-1 gap-16 items-center", layout === "center" ? "text-center" : "lg:grid-cols-2")}>
                    <div className={cn("max-w-2xl", layout === "center" && "mx-auto")}>
                       {(settings.eyebrow || sec.subtitle) && (
                        <div
                          className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded glass-panel-subtle text-xs font-bold uppercase tracking-widest mb-6", subtitleColorRes.className)}
                          style={subtitleColorRes.style}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{settings.eyebrow || sec.subtitle}</span>
                        </div>
                      )}
                      <h1
                        className={cn("font-outfit text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 text-balance", titleColorRes.className)}
                        style={titleColorRes.style}
                      >
                        {sec.title}
                      </h1>
                      {sec.body && (
                        <p
                          className={cn("text-lg md:text-xl font-medium leading-relaxed mb-10 text-balance", descColorRes.className)}
                          style={descColorRes.style}
                        >
                          {sec.body}
                        </p>
                      )}
                      <div className={cn("flex flex-col sm:flex-row gap-4", layout === "center" && "justify-center")}>
                        {sec.buttonLabel && sec.buttonUrl && (
                          <Button size="lg" className="bg-[#2691F0] text-white hover:bg-white hover:text-[#041635] px-8 h-14 rounded font-bold shadow-lg shadow-[#2691F0]/20 transition-all group" asChild>
                            {sec.buttonUrl.startsWith("#") ? (
                              <a href={sec.buttonUrl}>
                                {sec.buttonLabel}
                                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                              </a>
                            ) : (
                              <CustomLink href={sec.buttonUrl}>
                                {sec.buttonLabel}
                                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                              </CustomLink>
                            )}
                          </Button>
                        )}
                        {((settings.secondaryCtaLabel || settings.secondaryBtnLabel) && (settings.secondaryCtaUrl || settings.secondaryBtnUrl)) && (
                          <Button size="lg" variant="outline" className="px-8 h-14 rounded font-bold border-white/20 text-white hover:bg-white/10 transition-colors" asChild>
                            {(settings.secondaryCtaUrl || settings.secondaryBtnUrl || "").startsWith("#") ? (
                              <a href={settings.secondaryCtaUrl || settings.secondaryBtnUrl}>{settings.secondaryCtaLabel || settings.secondaryBtnLabel}</a>
                            ) : (
                              <CustomLink href={settings.secondaryCtaUrl || settings.secondaryBtnUrl}>{settings.secondaryCtaLabel || settings.secondaryBtnLabel}</CustomLink>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {layout !== "center" && (
                      <div className="relative hidden lg:block">
                        <div className="aspect-[4/3] rounded-lg glass-panel overflow-hidden relative border border-white/10">
                          {settings.cardImage ? (
                            <img
                              src={settings.cardImage}
                              alt={cardTitle || "Hero panel image"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[#041635]/5 mix-blend-multiply" />
                              <div className="absolute inset-0 flex items-center justify-center text-slate-300 flex-col gap-4">
                                <MonitorSmartphone className="h-24 w-24 opacity-20" />
                                <p className="font-bold text-lg opacity-40 uppercase tracking-widest text-center">
                                  {cardTitle.split('\n').map((line: string, i: number) => (
                                    <React.Fragment key={i}>
                                      {line}
                                      <br />
                                    </React.Fragment>
                                  ))}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Floating Response Stat Card */}
                        {settings.showStatCard !== false && (
                          <div className="absolute -bottom-6 -left-6 glass-panel p-6 rounded-lg border border-white/10 w-64 animate-float">
                            <p className="text-sm font-bold text-slate-400 mb-1">
                              {settings.statLabel || "Average Response Time"}
                            </p>
                            <p className="text-4xl font-black text-white flex items-end gap-2">
                              {settings.statValue || "12"}{" "}
                              <span className="text-lg text-slate-500 font-bold mb-1">
                                {settings.statUnit || "Mins"}
                              </span>
                            </p>
                            {(settings.statBadge || "SLA Exceeded") && (
                              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#06b6d4] bg-[#06b6d4]/10 px-2 py-1 rounded w-fit border border-[#06b6d4]/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
                                {settings.statBadge || "SLA Exceeded"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );

          // ─── 2. TEXT BLOCK ─────────────────────────────────────────────────
          case "Text block":
            return (
              <section key={sec.id} className={cn("py-20", bgClass)}>
                <div className="max-w-4xl mx-auto px-5 text-center">
                  {sec.subtitle && (
                    <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleColorRes.className)} style={subtitleColorRes.style}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className={cn("font-outfit text-3xl md:text-4xl font-black mb-6", titleColorRes.className)} style={titleColorRes.style}>
                    {sec.title}
                  </h2>
                  {sec.body && (
                    <p className={cn("text-lg leading-relaxed", descColorRes.className)} style={descColorRes.style}>
                      {sec.body}
                    </p>
                  )}
                </div>
              </section>
            );

          // ─── 3. IMAGE AND TEXT ─────────────────────────────────────────────
          case "Image and text":
            return (
              <section key={sec.id} className={cn("py-24 overflow-hidden", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-16 items-center", layout === "right" && "lg:flex-row-reverse")}>
                    <div className={cn(layout === "right" && "lg:order-2")}>
                      {sec.subtitle && (
                        <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleColorRes.className)} style={subtitleColorRes.style}>
                          {sec.subtitle}
                        </p>
                      )}
                      <h2 className={cn("font-outfit text-4xl md:text-5xl font-black mb-8 leading-tight", titleColorRes.className)} style={titleColorRes.style}>
                        {sec.title}
                      </h2>
                      {sec.body && (
                        <p className={cn("text-lg mb-8 leading-relaxed", descColorRes.className)} style={descColorRes.style}>
                          {sec.body}
                        </p>
                      )}
                      {settings.points && (
                        <div className="space-y-4">
                          {settings.points.map((point: string, i: number) => (
                            <div key={i} className="flex gap-3">
                              <div className="shrink-0 w-6 h-6 rounded bg-[#2691F0]/20 flex items-center justify-center text-[#2691F0]">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                              <p className="font-semibold text-slate-200">{point}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {sec.buttonLabel && sec.buttonUrl && (
                        <Button size="lg" className="mt-10 bg-[#2691F0] hover:bg-white hover:text-[#041635] transition-all font-bold" asChild>
                          {sec.buttonUrl.startsWith("#") ? (
                            <a href={sec.buttonUrl}>{sec.buttonLabel}</a>
                          ) : (
                            <CustomLink href={sec.buttonUrl}>{sec.buttonLabel}</CustomLink>
                          )}
                        </Button>
                      )}
                    </div>

                    <div className={cn("relative", layout === "right" && "lg:order-1")}>
                      <div className="aspect-square rounded-lg glass-panel overflow-hidden relative border border-white/10">
                        {sec.mediaId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sec.mediaId} alt={sec.title || "Image block"} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-400 flex-col gap-4 p-8 text-center">
                            <MonitorSmartphone className="h-20 w-20 opacity-20" />
                            <p className="font-bold text-lg opacity-40 uppercase tracking-widest">Team Photo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );

          // ─── 4. FEATURE CARDS ──────────────────────────────────────────────
          case "Feature cards":
            const features = settings.features || [];
            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    {sec.subtitle && (
                      <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleColorRes.className)} style={subtitleColorRes.style}>
                        {sec.subtitle}
                      </p>
                    )}
                    <h2 className={cn("font-outfit text-4xl md:text-5xl font-black mb-6", titleColorRes.className)} style={titleColorRes.style}>
                      {sec.title}
                    </h2>
                    {sec.body && <p className={cn("text-lg", descColorRes.className)} style={descColorRes.style}>{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feat: any, idx: number) => {
                      const FeatIcon = getIcon(feat.icon || "Shield");
                      return (
                        <div key={idx} className="glass-panel-subtle p-8 rounded-xl border-white/5 flex flex-col hover:border-[#2691F0]/30 transition-all group">
                          <div className="w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[#2691F0] mb-6 group-hover:bg-[#2691F0] group-hover:text-white transition-colors">
                            <FeatIcon className="h-6 w-6" />
                          </div>
                          <h3 className="font-outfit text-xl font-bold text-white mb-3">{feat.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed">{feat.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );

          // ─── 5. SERVICE CARDS ──────────────────────────────────────────────
          case "Service cards":
            const limitSvc = settings.limit || 6;
            return (
              <section key={sec.id} className={cn("py-24 relative", bgClass)}>
                <div className="absolute inset-0 bg-dot-pattern opacity-30" />
                <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    {sec.subtitle && (
                      <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleColorRes.className)} style={subtitleColorRes.style}>
                        {sec.subtitle}
                      </p>
                    )}
                    <h2 className={cn("font-outfit text-4xl md:text-5xl font-black mb-6", titleColorRes.className)} style={titleColorRes.style}>
                      {sec.title}
                    </h2>
                    {sec.body && <p className={cn("text-lg", descColorRes.className)} style={descColorRes.style}>{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.slice(0, limitSvc).map((service) => {
                      const IconComponent = getIcon(service.icon_name || "Headphones");
                      const imageUrl = (service.content as any)?.image;
                      return (
                        <div
                          key={service.slug}
                          className="glass-panel-subtle rounded-xl border-white/5 hover:border-[#2691F0]/50 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col min-h-[320px]"
                        >
                          {imageUrl && (
                            <div className="absolute inset-0 z-0 overflow-hidden">
                              <img
                                src={imageUrl}
                                alt=""
                                className="w-full h-full object-cover opacity-10 group-hover:opacity-25 transition-all duration-500 scale-100 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#041635] via-[#041635]/90 to-transparent" />
                            </div>
                          )}
                          <div className="relative p-8 flex flex-col h-full z-10 flex-1 justify-between">
                            <div className="w-12 h-12 rounded flex items-center justify-center mb-auto text-[#2691F0] bg-white/5 border border-white/10 group-hover:bg-[#2691F0] group-hover:text-white transition-all shrink-0">
                              <IconComponent className="h-6 w-6" />
                            </div>
                            <div className="mt-8">
                              <h3 className="font-outfit text-2xl font-bold mb-4 text-white">{service.title}</h3>
                              <p className="leading-relaxed mb-6 line-clamp-3 text-slate-400">{service.summary}</p>
                              <CustomLink href={`/services/${service.slug}`} className="inline-flex items-center text-sm font-bold text-[#2691F0] hover:text-white transition-colors">
                                Read more <ChevronRight className="h-4 w-4 ml-1" />
                              </CustomLink>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {sec.buttonLabel && sec.buttonUrl && (
                    <div className="mt-12 text-center">
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                        {sec.buttonUrl.startsWith("#") ? (
                          <a href={sec.buttonUrl}>{sec.buttonLabel}</a>
                        ) : (
                          <CustomLink href={sec.buttonUrl}>{sec.buttonLabel}</CustomLink>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            );

          // ─── 6. INDUSTRY CARDS ─────────────────────────────────────────────
          case "Industry cards":
            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className={cn("font-outfit text-4xl md:text-5xl font-black mb-6", titleClass)}>
                      {sec.title}
                    </h2>
                    {sec.body && <p className={cn("text-lg", descClass)}>{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {industries.map((ind) => {
                      const imageUrl = (ind.content as any)?.image;
                      return (
                        <div
                          key={ind.slug}
                          className="glass-panel-subtle p-8 rounded-xl border-white/5 hover:border-[#2691F0]/30 transition-all flex flex-col justify-between group relative overflow-hidden min-h-[320px]"
                        >
                          {imageUrl && (
                            <div className="absolute inset-0 z-0 overflow-hidden">
                              <img
                                src={imageUrl}
                                alt=""
                                className="w-full h-full object-cover opacity-10 group-hover:opacity-25 transition-all duration-500 scale-100 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#041635] via-[#041635]/90 to-transparent" />
                            </div>
                          )}
                          <div className="relative z-10 flex flex-col h-full justify-between flex-1">
                            <div>
                              <div className="w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[#2691F0] mb-6 group-hover:bg-[#2691F0] group-hover:text-white transition-all shrink-0">
                                <MonitorSmartphone className="h-6 w-6" />
                              </div>
                              <h3 className="font-outfit text-xl font-bold text-white mb-3">{ind.title}</h3>
                              <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
                                {(ind.content as any)?.help || "Reliable and high performing systems integration."}
                              </p>
                            </div>
                            <CustomLink href={`/industries/${ind.slug}`} className="inline-flex items-center text-sm font-bold text-[#2691F0] hover:text-white transition-colors mt-4">
                              Learn more <ChevronRight className="h-4 w-4 ml-1" />
                            </CustomLink>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );

          // ─── 7. COMPLIANCE CARDS ───────────────────────────────────────────
          case "Compliance cards":
            return (
              <section key={sec.id} className={cn("py-24 bg-[#020817]", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="font-outfit text-4xl md:text-5xl font-black text-white mb-6">{sec.title}</h2>
                    {sec.body && <p className="text-lg text-slate-400">{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {complianceCards.map((card) => {
                      const CompIcon = getCardIcon(card.iconKey);
                      const displayStatus = getSafeDisplayStatus(card);

                      return (
                        <div key={card.id} className="glass-panel-subtle p-6 rounded-xl border-white/5 flex flex-col justify-between hover:border-[#2691F0]/40 transition-all group">
                          <div>
                            <div className="flex items-center justify-between mb-6">
                              <div className="w-10 h-10 rounded bg-[#2691F0]/10 border border-[#2691F0]/20 flex items-center justify-center text-[#2691F0] overflow-hidden">
                                {card.logoUrl ? (
                                  <img src={card.logoUrl} alt={card.title} className="w-full h-full object-contain p-1" />
                                ) : (
                                  <CompIcon className="h-5 w-5" />
                                )}
                              </div>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                displayStatus === "Certified" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                displayStatus === "In progress" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                "bg-blue-500/10 border-blue-500/20 text-blue-400"
                              )}>
                                {displayStatus}
                              </span>
                            </div>
                            <h3 className="font-outfit text-lg font-bold text-white mb-2">{card.title}</h3>
                            <p className="text-slate-400 text-xs leading-relaxed mb-6">{card.description}</p>
                          </div>
                          {card.externalUrl && (
                            <CustomLink href={card.externalUrl} target="_blank" className="inline-flex items-center text-xs font-black uppercase tracking-wider text-[#2691F0] hover:text-white transition-colors mt-auto">
                              Verify Status <ChevronRight className="h-3 w-3 ml-0.5" />
                            </CustomLink>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );

          // ─── 8. PARTNER LOGOS ──────────────────────────────────────────────
          case "Partner logos":
            if (partners.length === 0) return null;
            return (
              <section key={sec.id} className="bg-[#020817] border-b border-white/5 py-8 overflow-hidden">
                <div className="max-w-7xl mx-auto px-5 lg:px-8 mb-6 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{sec.title}</p>
                </div>
                <div className="relative w-full flex overflow-hidden">
                  <div className="flex w-max animate-marquee whitespace-nowrap opacity-50 hover:opacity-100 transition-all duration-500">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex gap-16 md:gap-24 px-6 md:px-10 items-center">
                        {partners.map((partner) => (
                          <div key={`${partner.id}-${i}`} className="flex items-center gap-2 font-bold text-white text-lg group">
                            {partner.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={partner.logoUrl} alt={partner.name} className="h-10 md:h-12 w-auto object-contain" />
                            ) : (
                              <>
                                <ShieldCheck className="h-8 w-8 text-[#2691F0]" />
                                <span className="text-xl">{partner.name}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          // ─── 9. TRUSTED LOGOS ──────────────────────────────────────────────
          case "Trusted logos":
            if (trustedLogos.length === 0) return null;
            return (
              <section key={sec.id} className="bg-[#020817] border-b border-white/5 py-10 overflow-hidden">
                <div className="max-w-7xl mx-auto px-5 lg:px-8 mb-6 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{sec.title}</p>
                </div>
                <div className="relative w-full flex overflow-hidden group">
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-20 z-10 bg-gradient-to-r from-[#020817] to-transparent" />
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-20 z-10 bg-gradient-to-l from-[#020817] to-transparent" />

                  <div className="flex w-max animate-marquee whitespace-nowrap gap-0">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex gap-12 md:gap-20 items-center">
                        {trustedLogos.map((client) => (
                          <div key={`${client.id}-${i}`} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity duration-300">
                            {client.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={client.logoUrl} alt={client.companyName} className="h-12 md:h-14 w-auto object-contain" />
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#2691F0] font-black text-sm">
                                  {client.companyName.charAt(0)}
                                </div>
                                <span className="text-xs font-black text-white mt-1.5">{client.companyName}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          // ─── 10. TESTIMONIALS ──────────────────────────────────────────────
          case "Testimonials":
            if (testimonials.length === 0) return null;
            return (
              <section key={sec.id} className={cn("py-24 border-y border-white/5 relative overflow-hidden", bgClass)}>
                <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
                <div className="max-w-5xl mx-auto px-5 text-center relative z-10">
                  <p className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#2691F0]/10 text-[#2691F0] text-[10px] font-black uppercase tracking-widest mb-6 border border-[#2691F0]/20">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{sec.title || "Client Testimonials"}</span>
                  </p>
                  <TestimonialsSlider testimonials={testimonials} />
                </div>
              </section>
            );

          // ─── 11. FAQ PREVIEW ───────────────────────────────────────────────
          case "FAQ preview":
            // Group FAQs by category
            const groupedFaqs: Record<string, typeof faqs> = {};
            faqs.forEach((faq) => {
              const cat = faq.category || "General";
              if (!groupedFaqs[cat]) {
                groupedFaqs[cat] = [];
              }
              groupedFaqs[cat].push(faq);
            });

            const categories = Object.keys(groupedFaqs).sort();

            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className={cn("font-outfit text-4xl md:text-5xl font-black", titleClass)}>{sec.title}</h2>
                    {sec.subtitle && <p className="text-slate-400 mt-3 text-lg">{sec.subtitle}</p>}
                  </div>

                  {settings.limit ? (
                    // Homepage Preview style (un-grouped grid)
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start max-w-6xl mx-auto">
                      {faqs.slice(0, settings.limit).map((faq) => (
                        <details key={faq.id} className="glass-panel-subtle p-6 rounded-xl border-white/5 group [&_summary::-webkit-details-marker]:hidden transition-all duration-300 hover:border-[#2691F0]/20">
                          <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                            <h3 className="font-bold text-white text-base md:text-lg pr-4 group-hover:text-[#2691F0] transition-colors">{faq.question}</h3>
                            <span className="shrink-0 ml-1.5 p-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 group-open:rotate-180 group-open:text-[#2691F0] group-open:border-[#2691F0]/20 group-open:bg-[#2691F0]/10 transition-all">
                              <ChevronDown className="h-4 w-4" />
                            </span>
                          </summary>
                          <p className="mt-4 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">{faq.answer}</p>
                        </details>
                      ))}
                    </div>
                  ) : (
                    // Full FAQ page style (grouped by category)
                    <div className="space-y-16">
                      {categories.map((category) => (
                        <div key={category} className="space-y-6">
                          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <span className="w-3 h-3 rounded-full bg-[#2691F0] animate-pulse" />
                            <h3 className="font-outfit text-2xl font-black text-white tracking-tight">{category}</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                            {groupedFaqs[category].map((faq) => (
                              <details key={faq.id} className="glass-panel-subtle p-6 rounded-xl border-white/5 group [&_summary::-webkit-details-marker]:hidden transition-all duration-300 hover:border-[#2691F0]/20">
                                <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                                  <h3 className="font-bold text-white text-base md:text-lg pr-4 group-hover:text-[#2691F0] transition-colors">{faq.question}</h3>
                                  <span className="shrink-0 ml-1.5 p-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 group-open:rotate-180 group-open:text-[#2691F0] group-open:border-[#2691F0]/20 group-open:bg-[#2691F0]/10 transition-all">
                                    <ChevronDown className="h-4 w-4" />
                                  </span>
                                </summary>
                                <p className="mt-4 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">{faq.answer}</p>
                              </details>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );

          // ─── 12. CASE STUDY PREVIEW ────────────────────────────────────────
          case "Case study preview":
            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className={cn("font-outfit text-4xl font-black", titleClass)}>{sec.title}</h2>
                    {sec.subtitle && <p className="text-slate-400 mt-2">{sec.subtitle}</p>}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {caseStudies.slice(0, 3).map((study) => (
                      <div key={study.slug} className="glass-panel-subtle rounded-xl border-white/5 p-8 flex flex-col justify-between hover:border-[#2691F0]/30 transition-all group">
                        <div>
                          <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-widest">{study.clientType || "Case Study"}</span>
                          <h3 className="font-outfit text-xl font-bold text-white mt-2 mb-4 leading-tight">{study.title}</h3>
                          <p className="text-slate-400 text-xs leading-relaxed mb-6 line-clamp-3">{study.challenge}</p>
                        </div>
                        <CustomLink href={`/case-studies/${study.slug}`} className="inline-flex items-center text-sm font-bold text-[#2691F0] hover:text-white transition-colors">
                          Read Case Study <ChevronRight className="h-4 w-4 ml-0.5" />
                        </CustomLink>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          // ─── 13. CTA SECTION ───────────────────────────────────────────────
          case "CTA section":
            return (
              <section key={sec.id} className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#041635] z-0" />
                <div className="absolute inset-0 bg-corporate-grid opacity-30 z-0" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#2691F0]/20 rounded-[100%] blur-[100px] z-0 pointer-events-none" />

                <div className="max-w-4xl mx-auto px-5 text-center relative z-10">
                  <h2 className="font-outfit text-4xl md:text-5xl font-black mb-6 text-white">
                    {sec.title}
                  </h2>
                  {sec.body && (
                    <p className="text-slate-400 text-lg mb-10 text-balance">
                      {sec.body}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {sec.buttonLabel && sec.buttonUrl && (
                      <Button size="lg" className="bg-[#2691F0] text-white hover:bg-white hover:text-[#041635] rounded font-bold h-14 px-8 shadow-lg shadow-[#2691F0]/20 transition-all cursor-pointer" asChild>
                        {sec.buttonUrl.startsWith("#") ? (
                          <a href={sec.buttonUrl}>{sec.buttonLabel}</a>
                        ) : (
                          <CustomLink href={sec.buttonUrl}>{sec.buttonLabel}</CustomLink>
                        )}
                      </Button>
                    )}
                    {settings.secondaryBtnLabel && settings.secondaryBtnUrl && (
                      <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded font-bold h-14 px-8 transition-colors cursor-pointer" asChild>
                        {settings.secondaryBtnUrl.startsWith("#") ? (
                          <a href={settings.secondaryBtnUrl}>{settings.secondaryBtnLabel}</a>
                        ) : (
                          <CustomLink href={settings.secondaryBtnUrl}>{settings.secondaryBtnLabel}</CustomLink>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            );

          // ─── 14. CONTACT SECTION ───────────────────────────────────────────
          case "Contact section":
            const isCareersForm = sec.title?.toLowerCase().includes("opening") || sec.title?.toLowerCase().includes("career") || sec.title?.toLowerCase().includes("job");
            return (
              <section 
                key={sec.id} 
                id={isCareersForm ? "apply-form" : undefined}
                className={cn("py-24 bg-[#020817]", bgClass)}
              >
                <div className="max-w-4xl mx-auto px-5">
                  <div className="text-center mb-16">
                    <h2 className="font-outfit text-4xl font-black text-white">{sec.title}</h2>
                    {sec.body && <p className="text-slate-400 mt-2">{sec.body}</p>}
                  </div>

                  <div className="glass-panel p-8 rounded-2xl border-white/10">
                    <form action="/api/submit-contact" method="POST" encType="multipart/form-data" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="block text-sm font-bold text-slate-300">
                          Your Name
                          <input required name="name" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
                        </label>
                        <label className="block text-sm font-bold text-slate-300">
                          Work Email
                          <input required type="email" name="email" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
                        </label>
                      </div>

                      {isCareersForm && (
                        <label className="block text-sm font-bold text-slate-300">
                          Select the Role / Opening you are applying for
                          <select 
                            name="role" 
                            required 
                            className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
                          >
                            <option value="Future opening / General application" className="bg-[#020817] text-white">General Application / Future opening</option>
                            {(careerJobs || []).map((job: any) => (
                              <option key={job.id} value={job.title} className="bg-[#020817] text-white">
                                {job.title} ({job.location || "Remote"})
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <label className="block text-sm font-bold text-slate-300">
                        Message
                        <textarea required name="message" rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0] resize-none" />
                      </label>
                      
                      {/* Optional File Attachment field */}
                      <label className="block text-sm font-bold text-slate-300">
                        {isCareersForm ? "Attach CV (Optional, PDF/DOC/DOCX up to 10MB)" : "Attach Specifications or Document (Optional, PDF/DOC/DOCX up to 10MB)"}
                        <input 
                          type="file" 
                          name="cv" 
                          accept=".pdf,.doc,.docx"
                          className="mt-2 block w-full text-xs text-slate-400
                            file:mr-4 file:py-2.5 file:px-4
                            file:rounded-xl file:border-0
                            file:text-xs file:font-semibold
                            file:bg-white/10 file:text-white
                            hover:file:bg-white/20
                            focus:outline-none cursor-pointer"
                        />
                      </label>

                      <Button type="submit" className="w-full justify-center bg-[#2691F0] text-white rounded font-bold py-3.5 shadow-lg shadow-[#2691F0]/20 hover:bg-[#041635] transition-all">
                        {isCareersForm ? "Submit Application" : "Send Enquiry"}
                      </Button>
                    </form>
                  </div>
                </div>
              </section>
            );

          // ─── 14.5 CAREER OPENINGS ───────────────────────────────────────────
          case "Career openings":
            const activeJobs = careerJobs || [];
            return (
              <section key={sec.id} id="openings" className={cn("py-24 bg-[#020817]", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="font-outfit text-4xl font-black text-white">{sec.title || "Active Opportunities"}</h2>
                    {sec.body && <p className="text-slate-400 mt-2">{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {activeJobs.map((job: any) => (
                      <div key={job.id} className="glass-panel p-8 rounded-2xl border-white/10 flex flex-col justify-between hover:border-[#2691F0]/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <h3 className="font-outfit text-2xl font-bold text-white leading-tight">{job.title}</h3>
                            <span className="shrink-0 inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#2691F0]/10 text-[#2691F0] border border-[#2691F0]/20">
                              {job.type || "Full-time"}
                            </span>
                          </div>
                          <p className="text-xs text-[#2691F0] font-bold flex items-center gap-1 mb-6">
                            <MapPin className="h-4 w-4" /> {job.location || "Remote, UK"}
                          </p>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-8">
                            {job.description}
                          </p>
                        </div>
                        <Button 
                          className="w-full justify-center bg-white/5 border border-white/10 text-white hover:bg-[#2691F0] hover:text-white hover:border-[#2691F0] font-bold py-3.5 transition-all cursor-pointer animate-pulse-subtle"
                          onClick={() => {
                            const selectElement = document.querySelector('select[name="role"]') as HTMLSelectElement;
                            if (selectElement) {
                              selectElement.value = job.title;
                              const event = new Event('change', { bubbles: true });
                              selectElement.dispatchEvent(event);
                            }
                            const formSection = document.getElementById('apply-form');
                            if (formSection) {
                              formSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          Apply For This Role
                        </Button>
                      </div>
                    ))}
                  </div>

                  {activeJobs.length === 0 && (
                    <div className="glass-panel p-12 rounded-2xl border-white/10 text-center max-w-xl mx-auto">
                      <p className="text-slate-400 font-semibold mb-2">No active job openings at the moment.</p>
                      <p className="text-xs text-slate-500">You can still submit a speculative application below and our recruitment desk will keep your details on file.</p>
                    </div>
                  )}
                </div>
              </section>
            );

          // ─── 15. PRICING CARDS ─────────────────────────────────────────────
          case "Pricing cards":
            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className={cn("font-outfit text-4xl font-black", titleClass)}>{sec.title}</h2>
                    {sec.body && <p className="text-slate-400 mt-2">{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {pricingPackages.map((pack) => (
                      <div key={pack.name} className="glass-panel-subtle p-8 rounded-xl border-white/5 flex flex-col justify-between hover:border-[#2691F0]/30 transition-all">
                        <div>
                          <h3 className="font-outfit text-2xl font-bold text-white mb-2">{pack.name}</h3>
                          <p className="text-xs text-slate-400 font-bold mb-6">{pack.cadence}</p>
                          <p className="text-slate-300 text-sm leading-relaxed mb-6">{pack.summary}</p>
                          <ul className="space-y-3 mb-8">
                            {(pack.features as string[]).map((feature) => (
                              <li key={feature} className="flex items-center gap-2.5 text-xs text-slate-300 font-semibold">
                                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button className="w-full justify-center bg-[#2691F0] text-white font-bold" asChild>
                          <CustomLink href="/book-consultation">{pack.cta || "Get Started"}</CustomLink>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          // ─── 16. STATISTICS ────────────────────────────────────────────────
          case "Statistics":
            const stats = settings.stats || [];
            return (
              <section key={sec.id} className={cn("py-20 bg-[#041635] text-white", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                    {stats.map((stat: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <p className="text-4xl md:text-5xl font-black text-white">{stat.value}</p>
                        <p className="text-xs font-black uppercase tracking-widest text-[#2691F0]">{stat.label}</p>
                        <p className="text-slate-400 text-[11px] leading-snug pr-4 pl-4">{stat.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          // ─── 17. PROCESS / TIMELINE ────────────────────────────────────────
          case "Process/timeline":
            const steps = settings.steps || [];
            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className={cn("font-outfit text-4xl font-black", titleClass)}>{sec.title}</h2>
                    {sec.body && <p className="text-slate-400 mt-2">{sec.body}</p>}
                  </div>

                  <div className="relative border-l border-white/10 max-w-3xl mx-auto pl-8 space-y-12">
                    {steps.map((step: any, idx: number) => (
                      <div key={idx} className="relative group">
                        <span className="absolute -left-12 top-0.5 w-8 h-8 rounded-full bg-[#2691F0] text-white font-black text-sm flex items-center justify-center shadow-lg">
                          {idx + 1}
                        </span>
                        <h3 className="font-outfit text-xl font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          // ─── 18. MEDIA GALLERY ─────────────────────────────────────────────
          case "Media gallery":
            const gallery = settings.gallery || [];
            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-7xl mx-auto px-5 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className={cn("font-outfit text-4xl font-black", titleClass)}>{sec.title}</h2>
                    {sec.body && <p className="text-slate-400 mt-2">{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {gallery.map((image: any, idx: number) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden glass-panel-subtle border-white/5 relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.alt || "Gallery image"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          // ─── 19. CUSTOM RICH TEXT ──────────────────────────────────────────
          case "Custom rich text":
            return (
              <section key={sec.id} className={cn("py-20", bgClass)}>
                <div className="max-w-4xl mx-auto px-5 prose prose-invert">
                  <h2 className={cn("font-outfit text-3xl font-black text-center mb-10", titleClass)}>{sec.title}</h2>
                  <div
                    className={cn("text-base leading-relaxed space-y-6", descClass)}
                    dangerouslySetInnerHTML={{ __html: sec.body || "" }}
                  />
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── Helper client-side testimonials slider ─────────────────────────────────
function TestimonialsSlider({ testimonials }: { testimonials: any[] }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const active = testimonials[index];
  if (!active) return null;

  return (
    <div className="relative">
      <div className="transition-all duration-700 ease-in-out transform opacity-100 scale-100">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-outfit font-black text-white leading-relaxed mb-8 max-w-3xl mx-auto italic">
          "{active.quote || "CYVRIX is an exceptional technological partner."}"
        </h2>
        <div className="flex flex-col items-center">
          <p className="font-black text-white text-lg">{active.clientName || "Client Specialist"}</p>
          <p className="text-xs text-[#2691F0] font-black uppercase tracking-widest mt-1.5">{active.company || "CYVRIX Partner"}</p>
        </div>
      </div>

      {testimonials.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === index ? "bg-[#2691F0] w-6" : "bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper chevron down icon ──────────────────────────────────────────────
function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
