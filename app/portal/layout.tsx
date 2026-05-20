import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { 
  Home, 
  FileText, 
  MessageSquare, 
  ShieldCheck, 
  User,
  LogOut,
  Bell,
  HelpCircle,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Logo } from "@/components/nav-main/Logo";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Client Portal | CYVRIX",
  description: "Manage your IT services and security with CYVRIX.",
};

const portalNav = [
  { name: "Overview", href: "/portal", icon: Home },
  { name: "Support Tickets", href: "/portal/support-tickets", icon: MessageSquare },
  { name: "Proposals & Quotes", href: "/portal/quotes-and-proposals", icon: FileText },
  { name: "Active Services", href: "/portal/services", icon: ShieldCheck },
  { name: "Documents", href: "/portal/documents", icon: FolderOpen },
  { name: "Profile & Company", href: "/portal/profile-and-company", icon: User },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  
  let companyName = "Independent Client";
  if (user.clientCompanyId) {
    const company = await prisma.clientCompany.findUnique({
      where: { id: user.clientCompanyId },
      select: { name: true }
    });
    if (company) {
      companyName = company.name;
    }
  }

  // Get user initials
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-[#041635] text-white flex flex-col shrink-0 transition-all">
        <div className="p-6 bg-[#020d20]">
          <Logo variant="icon" className="lg:hidden brightness-200" />
          <div className="hidden lg:block text-[#2691F0]">
            <Logo variant="full" />
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {portalNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-[#0a234f] hover:text-[#2691F0] transition-all font-bold text-sm group"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/logout" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-[#ef4444]/10 hover:text-red-400 transition-all font-bold text-sm w-full group">
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block">Log Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="font-outfit text-xl font-black text-[#041635]">Client Workspace</h2>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Environment Secure
            </div>
            
            <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
              <Link href="/portal/notifications" className="p-2 text-slate-400 hover:text-[#041635] transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-[#041635]">{user.name || user.email}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{companyName}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#041635] border border-blue-100 flex items-center justify-center font-black text-sm">
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
