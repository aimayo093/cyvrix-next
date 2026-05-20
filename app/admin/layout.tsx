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
  Search,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Logo } from "@/components/nav-main/Logo";

export const metadata: Metadata = {
  title: "Admin Dashboard | CYVRIX",
  description: "Internal management platform for CYVRIX Technologies.",
};

const adminNav = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Website CMS", href: "/admin/website-cms", icon: Database },
  { name: "Services CMS", href: "/admin/services-cms", icon: Database },
  { name: "Industries CMS", href: "/admin/industries-cms", icon: Database },
  { name: "Blog & Insights", href: "/admin/blog-and-insights", icon: Database },
  { name: "Leads CRM", href: "/admin/leads-crm", icon: Users },
  { name: "Ticket Queue", href: "/admin/ticket-management", icon: ShieldCheck },
  { name: "Client Manager", href: "/admin/client-management", icon: Users },
  { name: "System Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#041635] text-white flex flex-col shrink-0">
        <div className="p-6">
          <Logo className="brightness-0 invert" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {adminNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all font-bold text-sm group"
            >
              <item.icon className="h-5 w-5 text-[#2691F0] group-hover:scale-110 transition-transform" />
              {item.name}
              <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
            <span>Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-[#041635]">Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#2691F0] transition-all w-64"
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-[#041635] transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#2691F0] flex items-center justify-center text-white font-black text-xs">
              AD
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
