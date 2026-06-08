"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Database,
  ShieldCheck,
  LogOut,
  Bell,
  FileText,
  MessageSquare,
  Star,
  HelpCircle,
  Globe,
  Layers,
  Building2,
  Briefcase,
  Activity,
  Mail,
  PhoneCall,
  Menu,
} from "lucide-react";
import { Logo } from "@/components/nav-main/Logo";

const adminNav = [
  { group: "Overview", items: [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  ]},
  { group: "Content", items: [
    { name: "Home Page CMS", href: "/admin/home-cms", icon: LayoutDashboard },
    { name: "Pages & Core", href: "/admin/pages-cms", icon: LayoutDashboard },
    { name: "Navigation", href: "/admin/navigation", icon: Layers },
    { name: "Footer Builder", href: "/admin/footer-builder", icon: Layers },
    { name: "Brand Assets", href: "/admin/brand-assets", icon: Settings },
    { name: "Social Links", href: "/admin/social-links", icon: Globe },
    { name: "Partner Logos", href: "/admin/partner-logos", icon: Star },
    { name: "Trusted Logos", href: "/admin/trusted-logos", icon: Users },
    { name: "Compliance Cards", href: "/admin/compliance-cards", icon: ShieldCheck },
    { name: "Services CMS", href: "/admin/services-cms", icon: Database },
    { name: "Industries CMS", href: "/admin/industries-cms", icon: Globe },
    { name: "Blog & Insights", href: "/admin/blog-and-insights", icon: FileText },
    { name: "FAQ CMS", href: "/admin/faqs", icon: HelpCircle },
    { name: "Careers CMS", href: "/admin/careers", icon: Briefcase },
    { name: "Contact Us CMS", href: "/admin/contact-cms", icon: PhoneCall },
    { name: "Testimonials", href: "/admin/testimonials", icon: Star },
  ]},
  { group: "Operations", items: [
    { name: "Leads CRM", href: "/admin/leads-crm", icon: Users },
    { name: "Ticket Queue", href: "/admin/ticket-management", icon: MessageSquare },
    { name: "Client Companies", href: "/admin/client-management", icon: Building2 },
    { name: "Satisfaction Surveys", href: "/admin/surveys", icon: Star },
    { name: "Email Broadcasts", href: "/admin/email", icon: Mail },
  ]},
  { group: "System", items: [
    { name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
    { name: "System Status", href: "/admin/status", icon: Activity },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ]},
];

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  // Load initial collapsed state on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? "w-16" : "w-60"
        } bg-[#041635] text-white flex flex-col shrink-0 overflow-y-auto transition-all duration-300 ease-in-out border-r border-white/5 scrollbar-thin`}
      >
        <div className={`p-4 border-b border-white/5 flex flex-col items-center justify-center shrink-0 transition-all duration-300 ${isCollapsed ? "h-14" : "h-20"}`}>
          <Logo variant={isCollapsed ? "icon" : "full"} className="brightness-0 invert" />
          {!isCollapsed && (
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 transition-all duration-300">
              Admin Portal
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-x-hidden">
          {adminNav.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 transition-opacity duration-300">
                  {group.group}
                </p>
              ) : (
                <div className="h-px bg-white/5 my-2 mx-1" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center ${
                        isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
                      } rounded-lg text-slate-400 hover:bg-white/8 hover:text-white transition-all font-semibold text-xs group relative ${
                        isActive ? "bg-white/5 text-white" : ""
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? "text-[#2691F0]" : "text-[#2691F0] group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate transition-all duration-300">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              title={isCollapsed ? "Logout" : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
              } rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-semibold text-xs`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#041635] transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Layers className="h-3.5 w-3.5" />
              <span>CYVRIX Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-[#041635] transition-colors relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="w-7 h-7 rounded-full bg-[#2691F0] flex items-center justify-center text-white font-black text-[10px]">
              AD
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
