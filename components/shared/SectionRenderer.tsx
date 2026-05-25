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
}: SectionRendererProps) {
  const visibleSections = sections
    .filter((s) => s.isVisible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-0">
      {visibleSections.map((sec) => {
        const settings = (sec.settingsJson as Record<string, any>) || {};
        const bgStyle = sec.backgroundStyle || "dark";
        const layout = sec.layoutStyle || "left";

        const bgClass =
          bgStyle === "light"
            ? "bg-slate-50 text-slate-900 border-b border-slate-200"
            : bgStyle === "brand"
              ? "bg-[#041635] text-white border-b border-white/5"
              : "bg-[#020817] text-slate-300 border-b border-white/5";

        const titleClass = bgStyle === "light" ? "text-[#041635]" : "text-white";
        const subtitleClass = bgStyle === "light" ? "text-[#2691F0]" : "text-[#2691F0]";
        const descClass = bgStyle === "light" ? "text-slate-600" : "text-slate-400";

        switch (sec.sectionType) {
          // ─── 1. HERO SECTION ───────────────────────────────────────────────
          case "Hero":
            return (
              <section key={sec.id} className={cn("relative pt-24 pb-20 lg:pt-36 lg:pb-32 overflow-hidden", bgClass)}>
                {sec.mediaId ? (
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-25"
                    style={{ backgroundImage: `url(${sec.mediaId})` }}
                  />
                ) : (
                  <div className="absolute inset-0 z-0 bg-corporate-grid opacity-40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-transparent pointer-events-none z-0" />
                
                <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
                  <div className={cn("grid grid-cols-1 gap-16 items-center", layout === "center" ? "text-center" : "lg:grid-cols-2")}>
                    <div className={cn("max-w-2xl", layout === "center" && "mx-auto")}>
                      {sec.subtitle && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded glass-panel-subtle text-[#2691F0] text-xs font-bold uppercase tracking-widest mb-6">
                          <ShieldCheck className="h-4 w-4" />
                          <span>{sec.subtitle}</span>
                        </div>
                      )}
                      <h1 className="font-outfit text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 text-balance">
                        {sec.title}
                      </h1>
                      {sec.body && (
                        <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-10 text-balance">
                          {sec.body}
                        </p>
                      )}
                      <div className={cn("flex flex-col sm:flex-row gap-4", layout === "center" && "justify-center")}>
                        {sec.buttonLabel && sec.buttonUrl && (
                          <Button size="lg" className="bg-[#2691F0] text-white hover:bg-white hover:text-[#041635] px-8 h-14 rounded font-bold shadow-lg shadow-[#2691F0]/20 transition-all group" asChild>
                            <Link href={sec.buttonUrl}>
                              {sec.buttonLabel}
                              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </Button>
                        )}
                        {settings.secondaryBtnLabel && settings.secondaryBtnUrl && (
                          <Button size="lg" variant="outline" className="px-8 h-14 rounded font-bold border-white/20 text-white hover:bg-white/10 transition-colors" asChild>
                            <Link href={settings.secondaryBtnUrl}>{settings.secondaryBtnLabel}</Link>
                          </Button>
                        )}
                      </div>
                    </div>

                    {layout !== "center" && (
                      <div className="relative hidden lg:block">
                        <div className="aspect-[4/3] rounded-lg glass-panel overflow-hidden relative border border-white/10">
                          <div className="absolute inset-0 bg-[#041635]/5 mix-blend-multiply" />
                          <div className="absolute inset-0 flex items-center justify-center text-slate-300 flex-col gap-4">
                            <MonitorSmartphone className="h-24 w-24 opacity-20" />
                            <p className="font-bold text-lg opacity-40 uppercase tracking-widest text-center">
                              Premium UK <br /> Operations Center
                            </p>
                          </div>
                        </div>
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
                    <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleClass)}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className={cn("font-outfit text-3xl md:text-4xl font-black mb-6", titleClass)}>
                    {sec.title}
                  </h2>
                  {sec.body && (
                    <p className={cn("text-lg leading-relaxed", descClass)}>
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
                        <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleClass)}>
                          {sec.subtitle}
                        </p>
                      )}
                      <h2 className={cn("font-outfit text-4xl md:text-5xl font-black mb-8 leading-tight", titleClass)}>
                        {sec.title}
                      </h2>
                      {sec.body && (
                        <p className={cn("text-lg mb-8 leading-relaxed", descClass)}>
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
                          <Link href={sec.buttonUrl}>{sec.buttonLabel}</Link>
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
                      <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleClass)}>
                        {sec.subtitle}
                      </p>
                    )}
                    <h2 className={cn("font-outfit text-4xl md:text-5xl font-black mb-6", titleClass)}>
                      {sec.title}
                    </h2>
                    {sec.body && <p className={cn("text-lg", descClass)}>{sec.body}</p>}
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
                      <p className={cn("text-xs font-black uppercase tracking-widest mb-4", subtitleClass)}>
                        {sec.subtitle}
                      </p>
                    )}
                    <h2 className={cn("font-outfit text-4xl md:text-5xl font-black mb-6", titleClass)}>
                      {sec.title}
                    </h2>
                    {sec.body && <p className={cn("text-lg", descClass)}>{sec.body}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.slice(0, limitSvc).map((service) => {
                      const IconComponent = getIcon(service.icon_name || "Headphones");
                      return (
                        <div
                          key={service.slug}
                          className="glass-panel-subtle rounded-xl border-white/5 hover:border-[#2691F0]/50 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col min-h-[320px]"
                        >
                          <div className="relative p-8 flex flex-col h-full z-10">
                            <div className="w-12 h-12 rounded flex items-center justify-center mb-auto text-[#2691F0] bg-white/5 border border-white/10 group-hover:bg-[#2691F0] group-hover:text-white transition-all">
                              <IconComponent className="h-6 w-6" />
                            </div>
                            <div className="mt-8">
                              <h3 className="font-outfit text-2xl font-bold mb-4 text-white">{service.title}</h3>
                              <p className="leading-relaxed mb-6 line-clamp-3 text-slate-400">{service.summary}</p>
                              <Link href={`/services/${service.slug}`} className="inline-flex items-center text-sm font-bold text-[#2691F0] hover:text-white transition-colors">
                                Read more <ChevronRight className="h-4 w-4 ml-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {sec.buttonLabel && sec.buttonUrl && (
                    <div className="mt-12 text-center">
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                        <Link href={sec.buttonUrl}>{sec.buttonLabel}</Link>
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
                    {industries.map((ind) => (
                      <div key={ind.slug} className="glass-panel-subtle p-8 rounded-xl border-white/5 hover:border-[#2691F0]/30 transition-all flex flex-col justify-between group">
                        <div>
                          <div className="w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[#2691F0] mb-6">
                            <MonitorSmartphone className="h-6 w-6" />
                          </div>
                          <h3 className="font-outfit text-xl font-bold text-white mb-3">{ind.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
                            {(ind.content as any)?.help || "Reliable and high performing systems integration."}
                          </p>
                        </div>
                        <Link href={`/industries/${ind.slug}`} className="inline-flex items-center text-sm font-bold text-[#2691F0] hover:text-white transition-colors">
                          Learn more <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </div>
                    ))}
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
                      const CompIcon = getIcon(card.iconKey || "Shield");
                      const isIso27001 = card.title.toLowerCase().includes("27001");
                      const displayStatus = (isIso27001 && card.status === "Certified" && !card.logoUrl)
                        ? "Framework followed"
                        : card.status;

                      return (
                        <div key={card.id} className="glass-panel-subtle p-6 rounded-xl border-white/5 flex flex-col justify-between hover:border-[#2691F0]/40 transition-all group">
                          <div>
                            <div className="flex items-center justify-between mb-6">
                              <div className="w-10 h-10 rounded bg-[#2691F0]/10 border border-[#2691F0]/20 flex items-center justify-center text-[#2691F0] overflow-hidden">
                                {card.logoUrl ? (
                                  <img src={card.logoUrl} alt={card.title} className="w-full h-full object-contain p-1" />
                                ) : isIso27001 ? (
                                  <ShieldCheck className="h-5 w-5" />
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
                            <Link href={card.externalUrl} target="_blank" className="inline-flex items-center text-xs font-black uppercase tracking-wider text-[#2691F0] hover:text-white transition-colors mt-auto">
                              Verify Status <ChevronRight className="h-3 w-3 ml-0.5" />
                            </Link>
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
                              <img src={partner.logoUrl} alt={partner.name} className="h-6 w-auto object-contain" />
                            ) : (
                              <>
                                <ShieldCheck className="h-6 w-6 text-[#2691F0]" />
                                <span>{partner.name}</span>
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
                              <img src={client.logoUrl} alt={client.companyName} className="h-10 w-auto object-contain" />
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#2691F0] font-black text-sm">
                                  {client.companyName.charAt(0)}
                                </div>
                                <span className="text-xs font-black text-white mt-1">{client.companyName}</span>
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
                <div className="absolute inset-0 bg-dot-pattern opacity-30" />
                <div className="max-w-4xl mx-auto px-5 text-center relative z-10">
                  <p className="text-gradient-neon font-bold uppercase tracking-widest text-xs mb-6 inline-block">
                    {sec.title}
                  </p>
                  <h2 className="text-3xl md:text-4xl font-outfit font-black text-white leading-tight mb-10 text-balance">
                    "{testimonials[0]?.quote || "CYVRIX is an exceptional technological partner."}"
                  </h2>
                  <div className="flex flex-col items-center">
                    <p className="font-black text-white text-lg">{testimonials[0]?.clientName}</p>
                    <p className="text-sm text-slate-400 font-bold mt-1">{testimonials[0]?.company}</p>
                  </div>
                </div>
              </section>
            );

          // ─── 11. FAQ PREVIEW ───────────────────────────────────────────────
          case "FAQ preview":
            return (
              <section key={sec.id} className={cn("py-24", bgClass)}>
                <div className="max-w-4xl mx-auto px-5">
                  <div className="text-center mb-16">
                    <h2 className={cn("font-outfit text-4xl font-black", titleClass)}>{sec.title}</h2>
                    {sec.subtitle && <p className="text-slate-400 mt-2">{sec.subtitle}</p>}
                  </div>

                  <div className="space-y-4">
                    {faqs.slice(0, 5).map((faq) => (
                      <details key={faq.id} className="glass-panel-subtle p-6 rounded-xl border-white/5 group [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex items-center justify-between cursor-pointer focus:outline-none">
                          <h3 className="font-bold text-white text-base md:text-lg pr-4">{faq.question}</h3>
                          <span className="shrink-0 ml-1.5 p-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 group-open:rotate-180 transition-transform">
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </summary>
                        <p className="mt-4 text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
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
                        <Link href={`/case-studies/${study.slug}`} className="inline-flex items-center text-sm font-bold text-[#2691F0] hover:text-white transition-colors">
                          Read Case Study <ChevronRight className="h-4 w-4 ml-0.5" />
                        </Link>
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
                        <Link href={sec.buttonUrl}>{sec.buttonLabel}</Link>
                      </Button>
                    )}
                    {settings.secondaryBtnLabel && settings.secondaryBtnUrl && (
                      <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded font-bold h-14 px-8 transition-colors cursor-pointer" asChild>
                        <Link href={settings.secondaryBtnUrl}>{settings.secondaryBtnLabel}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            );

          // ─── 14. CONTACT SECTION ───────────────────────────────────────────
          case "Contact section":
            return (
              <section key={sec.id} className={cn("py-24 bg-[#020817]", bgClass)}>
                <div className="max-w-4xl mx-auto px-5">
                  <div className="text-center mb-16">
                    <h2 className="font-outfit text-4xl font-black text-white">{sec.title}</h2>
                    {sec.body && <p className="text-slate-400 mt-2">{sec.body}</p>}
                  </div>

                  <div className="glass-panel p-8 rounded-2xl border-white/10">
                    <form action="/api/submit-contact" method="POST" className="space-y-6">
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
                      <label className="block text-sm font-bold text-slate-300">
                        Message
                        <textarea required name="message" rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0] resize-none" />
                      </label>
                      <Button type="submit" className="w-full justify-center bg-[#2691F0] text-white rounded font-bold py-3.5 shadow-lg shadow-[#2691F0]/20 hover:bg-[#041635] transition-all">
                        Send Enquiry
                      </Button>
                    </form>
                  </div>
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
                          <Link href="/book-consultation">{pack.cta || "Get Started"}</Link>
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
