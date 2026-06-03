"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Mail, User, ShieldCheck, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

interface NavbarProps {
  navItems: any[];
  logoDefault?: string;
  logoWhite?: string;
  logoDark?: string;
  logoSticky?: string;
  logoAlt?: string;
  phone?: string;
  email?: string;
  forceFullPageReload?: boolean;
}

export function Navbar({
  navItems,
  logoDefault,
  logoWhite,
  logoDark,
  logoSticky,
  logoAlt,
  phone = "0800 123 4567",
  email = "support@cyvrix.co.uk",
  forceFullPageReload = true,
}: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Global safety fallback for scroll restoration and top scrolls
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
  }, []);

  // Close menus on path changes
  React.useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  const CustomLink = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof Link> & { forceReload?: boolean }>(
    ({ href, children, forceReload = forceFullPageReload, onClick, ...props }, ref) => {
      const hrefStr = href ? href.toString() : "";
      const isInternal = hrefStr && !hrefStr.startsWith("#") && !hrefStr.startsWith("tel:") && !hrefStr.startsWith("mailto:");
      if (forceReload && isInternal) {
        return (
          <a
            href={hrefStr}
            ref={ref}
            onClick={(e) => {
              setIsOpen(false);
              setActiveDropdown(null);
              if (onClick) onClick(e);
            }}
            {...props}
          >
            {children}
          </a>
        );
      }
      return (
        <Link href={href} ref={ref} onClick={onClick} {...props}>
          {children}
        </Link>
      );
    }
  );
  CustomLink.displayName = "CustomLink";

  // Build hierarchical menu items
  const menuTree = React.useMemo(() => {
    const items = navItems.filter((i) => i.isVisible !== false);
    const map = new Map();
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });
    const roots: any[] = [];
    items.forEach((item) => {
      const mapped = map.get(item.id);
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId).children.push(mapped);
      } else {
        roots.push(mapped);
      }
    });
    return roots.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [navItems]);

  // Logo & Header styling state
  const headerTheme = scrolled ? "dark" : "light";
  const headerBgClass = scrolled
    ? "bg-[#041635]/95 backdrop-blur-lg border-white/5 shadow-xl py-3"
    : "bg-white border-slate-200 py-5";
  const textClass = scrolled
    ? "text-slate-300 hover:text-white"
    : "text-slate-600 hover:text-[#041635]";
  const activeTextClass = scrolled
    ? "text-white border-[#2691F0]"
    : "text-[#041635] border-[#2691F0]";

  return (
    <>
      {/* Corporate Top Bar (Static Light Navy) */}
      <div className="hidden lg:flex bg-[#041635] text-slate-300 py-2.5 px-5 lg:px-8 text-xs font-semibold justify-between items-center relative z-50 border-b border-white/5">
        <div className="flex items-center gap-6">
          <CustomLink href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-white transition-colors">
            <Phone className="h-3.5 w-3.5 text-[#2691F0]" />
            {phone}
          </CustomLink>
          <CustomLink href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white transition-colors">
            <Mail className="h-3.5 w-3.5 text-[#2691F0]" />
            {email}
          </CustomLink>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>ISO 27001 Certified &amp; ITIL Aligned</span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <CustomLink href="/login" className="flex items-center gap-2 hover:text-white transition-colors">
            <User className="h-3.5 w-3.5" />
            Client Portal Login
          </CustomLink>
        </div>
      </div>

      {/* Main Navbar */}
      <header className={cn("sticky top-0 z-40 transition-all duration-300 border-b", headerBgClass)}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <nav className="flex items-center justify-between">
            <Logo
              logoDefault={logoDefault}
              logoWhite={logoWhite}
              logoDark={logoDark}
              logoSticky={logoSticky}
              logoAlt={logoAlt}
              theme={headerTheme}
            />

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              <div className="flex items-center gap-6">
                {menuTree.map((item) => {
                  if (item.iconKey === "button-cta") return null;

                  const hasChildren = item.children && item.children.length > 0;

                  return (
                    <div
                      key={item.id}
                      className="relative group"
                      onMouseEnter={() => hasChildren && setActiveDropdown(item.id)}
                      onMouseLeave={() => hasChildren && setActiveDropdown(null)}
                    >
                      {hasChildren ? (
                        <button
                          className={cn(
                            "flex items-center gap-1.5 text-[15px] font-bold pb-1 transition-all cursor-pointer",
                            textClass,
                            activeDropdown === item.id && "text-[#2691F0]"
                          )}
                        >
                          {item.label}
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:rotate-180" />
                        </button>
                      ) : (
                        <CustomLink
                          href={item.url}
                          target={item.openInNewTab ? "_blank" : undefined}
                          className={cn(
                            "text-[15px] font-bold transition-all pb-1 border-b-2 border-transparent",
                            textClass,
                            pathname === item.url ? activeTextClass : "hover:border-[#2691F0]/50"
                          )}
                        >
                          {item.label}
                        </CustomLink>
                      )}

                      {/* Dropdown Menu */}
                      {hasChildren && (
                        <div className={cn(
                          "absolute left-0 mt-2 w-64 rounded-xl border p-2 shadow-2xl transition-all duration-200 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 z-50",
                          scrolled ? "bg-[#041635] border-white/10" : "bg-white border-slate-100"
                        )}>
                          {item.children.map((child: any) => (
                            <CustomLink
                              key={child.id}
                              href={child.url}
                              target={child.openInNewTab ? "_blank" : undefined}
                              className={cn(
                                "block px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                                scrolled 
                                  ? "text-slate-300 hover:bg-white/5 hover:text-white" 
                                  : "text-slate-600 hover:bg-slate-50 hover:text-[#041635]"
                              )}
                            >
                              {child.label}
                            </CustomLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Header CTA Button */}
              {menuTree.find((i) => i.iconKey === "button-cta") && (
                <div className={cn("flex items-center pl-6 border-l", scrolled ? "border-white/10" : "border-slate-200")}>
                  {(() => {
                    const cta = menuTree.find((i) => i.iconKey === "button-cta");
                    return (
                      <Button
                        size="default"
                        className="bg-[#2691F0] text-white hover:bg-[#041635] hover:text-white rounded font-bold shadow-lg shadow-[#2691F0]/20 transition-all cursor-pointer"
                        asChild
                      >
                        <CustomLink href={cta.url} target={cta.openInNewTab ? "_blank" : undefined}>
                          {cta.label}
                        </CustomLink>
                      </Button>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className={cn(
                "lg:hidden p-2 rounded-xl transition-colors cursor-pointer",
                scrolled ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-[#041635] hover:bg-slate-100"
              )}
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </nav>
        </div>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#041635] border-t border-white/5 overflow-hidden"
            >
              <div className="px-5 py-6 flex flex-col gap-2">
                {menuTree.map((item) => {
                  if (item.iconKey === "button-cta") return null;

                  const hasChildren = item.children && item.children.length > 0;

                  return (
                    <div key={item.id} className="border-b border-white/5 pb-2">
                      <CustomLink
                        href={item.url}
                        target={item.openInNewTab ? "_blank" : undefined}
                        className="block py-2.5 text-lg font-bold text-white"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </CustomLink>
                      {hasChildren && (
                        <div className="pl-4 space-y-1.5 mt-1 pb-2">
                          {item.children.map((child: any) => (
                            <CustomLink
                              key={child.id}
                              href={child.url}
                              target={child.openInNewTab ? "_blank" : undefined}
                              className="block py-2 text-sm font-semibold text-slate-400 hover:text-white"
                              onClick={() => setIsOpen(false)}
                            >
                              {child.label}
                            </CustomLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pt-6 pb-2 space-y-4">
                  <CustomLink
                    href="/login"
                    className="flex items-center gap-2 text-slate-300 hover:text-white font-bold"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="h-5 w-5 text-[#2691F0]" />
                    Client Portal Login
                  </CustomLink>

                  {menuTree.find((i) => i.iconKey === "button-cta") && (
                    <Button className="w-full justify-center bg-[#2691F0] text-white rounded font-bold py-3.5" asChild>
                      {(() => {
                        const cta = menuTree.find((i) => i.iconKey === "button-cta");
                        return (
                          <CustomLink
                            href={cta.url}
                            target={cta.openInNewTab ? "_blank" : undefined}
                            onClick={() => setIsOpen(false)}
                          >
                            {cta.label}
                          </CustomLink>
                        );
                      })()}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
