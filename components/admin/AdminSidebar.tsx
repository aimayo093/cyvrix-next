"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronDown,
  CircleUserRound,
  FileText,
  Footprints,
  Globe,
  Handshake,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu as MenuIcon,
  MessageSquare,
  Newspaper,
  Palette,
  PhoneCall,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Star,
  Tags,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/nav-main/Logo";
import { ADMIN_NAV, isInMore, type AdminNavIcon, type AdminNavItem } from "@/lib/admin-nav";

const ICONS: Record<AdminNavIcon, LucideIcon> = {
  today: LayoutDashboard,
  inbox: Inbox,
  ticket: MessageSquare,
  building: Building2,
  survey: Star,
  mail: Mail,
  pages: FileText,
  home: Home,
  blog: Newspaper,
  services: Wrench,
  navigation: MenuIcon,
  footer: Footprints,
  brand: Palette,
  image: ImageIcon,
  social: Globe,
  partner: Handshake,
  trusted: Users,
  compliance: BadgeCheck,
  product: Tags,
  industry: Briefcase,
  faq: HelpCircle,
  legal: Scale,
  careers: Briefcase,
  contact: PhoneCall,
  testimonial: Star,
  shield: ShieldCheck,
  audit: ScrollText,
  status: Activity,
  profile: CircleUserRound,
  settings: Settings,
};

const MORE_KEY = "admin_nav_more_open";

function readMoreOpen(): boolean {
  try {
    return localStorage.getItem(MORE_KEY) === "true";
  } catch {
    return false;
  }
}

export type BadgeSlots = { enquiries: React.ReactNode; tickets: React.ReactNode };

/**
 * The admin navigation. Used twice by AdminLayoutClient: docked at `lg` and
 * up (collapsible to icons), and inside the off-canvas drawer below that.
 */
export function AdminSidebar({
  pathname,
  activeHref,
  collapsed,
  badges,
  firstLinkRef,
  onNavigate,
}: {
  pathname: string;
  activeHref: string | null;
  collapsed: boolean;
  badges: BadgeSlots;
  firstLinkRef?: React.Ref<HTMLAnchorElement>;
  /** Called when a link is chosen, including the page already open (closes the drawer). */
  onNavigate?: () => void;
}) {
  // null until the person toggles: then the stored preference, or open when
  // the current page lives under "More". Once they toggle, their choice wins —
  // "Fewer" used to do nothing while on a "More" page.
  const [moreOpen, setMoreOpen] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const restore = window.setTimeout(() => setMoreOpen((current) => current ?? (readMoreOpen() || null)), 0);
    return () => window.clearTimeout(restore);
  }, []);
  const showMore = moreOpen ?? (activeHref !== null && isInMore(activeHref));

  const toggleMore = () => {
    const next = !showMore;
    setMoreOpen(next);
    try {
      localStorage.setItem(MORE_KEY, String(next));
    } catch {
      // A private window can refuse storage; the toggle still works.
    }
  };

  const renderItem = (item: AdminNavItem, index: number) => {
    const Icon = ICONS[item.icon];
    const active = item.href === activeHref || (activeHref === null && item.href === pathname);
    return (
      <Link
        key={item.href}
        ref={index === 0 ? firstLinkRef : undefined}
        href={item.href}
        title={collapsed ? item.name : undefined}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={`flex min-h-11 items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9 ${
          collapsed ? "justify-center px-2" : "gap-3 px-3"
        } ${active ? "bg-[#2691F0]/10 text-[#0f5aab]" : "text-slate-600 hover:bg-slate-100 hover:text-[#041635]"}`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#2691F0]" : "text-slate-400"}`} aria-hidden="true" />
        {collapsed ? <span className="sr-only">{item.name}</span> : <span className="truncate">{item.name}</span>}
        {!collapsed && item.badge && badges[item.badge]}
      </Link>
    );
  };

  let linkIndex = 0;
  return (
    <div className="flex h-full flex-col">
      <div className={`flex shrink-0 items-center border-b border-slate-200 ${collapsed ? "h-14 justify-center" : "h-16 px-5"}`}>
        <Logo variant={collapsed ? "icon" : "full"} theme="light" />
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4">
        {ADMIN_NAV.map((group) => (
          <div key={group.group} className="space-y-0.5">
            {collapsed ? (
              <div className="mx-1 my-2 h-px bg-slate-200" aria-hidden="true" />
            ) : (
              <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{group.group}</p>
            )}
            {group.primary.map((item) => renderItem(item, linkIndex++))}
            {group.more && (
              <>
                {showMore && group.more.map((item) => renderItem(item, linkIndex++))}
                {!collapsed && (
                  <button
                    type="button"
                    onClick={toggleMore}
                    aria-expanded={showMore}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${showMore ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                    {showMore ? "Fewer" : `${group.more.length} more`}
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className={`flex min-h-11 w-full items-center rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9 ${
              collapsed ? "justify-center px-2" : "gap-3 px-3"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {collapsed ? <span className="sr-only">Sign out</span> : <span>Sign out</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
