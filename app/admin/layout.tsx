import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
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
} from "lucide-react";
import { Logo } from "@/components/nav-main/Logo";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Dashboard | CYVRIX",
  description: "Internal management platform for CYVRIX Technologies.",
};

const adminNav = [
  { group: "Overview", items: [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  ]},
  { group: "Content", items: [
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-[#041635] text-white flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-white/5">
          <Logo className="brightness-0 invert" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Admin Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5">
          {adminNav.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600">{group.group}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-white/8 hover:text-white transition-all font-semibold text-xs group"
                  >
                    <item.icon className="h-4 w-4 text-[#2691F0] shrink-0" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-semibold text-xs">
              <LogOut className="h-4 w-4 shrink-0" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Layers className="h-3.5 w-3.5" />
            <span>CYVRIX Admin</span>
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
