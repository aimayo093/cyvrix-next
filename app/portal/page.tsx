import * as React from "react";
import { 
  Zap, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  ExternalLink,
  Plus
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { requireUser } from "@/lib/auth";
import { getPortalStats } from "@/lib/data-fetchers";
import { redirect } from "next/navigation";

export default async function PortalOverview() {
  const session = await requireUser();
  
  const stats = await getPortalStats(session.clientCompanyId || undefined);

  return (
    <div className="space-y-10 pb-12">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#041635] to-[#0a2a5e] rounded-3xl p-10 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-outfit text-4xl font-black mb-4">
            {session.name ? `Welcome, ${session.name.split(' ')[0]}.` : "Good morning."}
          </h1>
          <p className="text-slate-300 font-medium text-lg leading-relaxed mb-8">
            Your infrastructure is currently performing at optimal levels. 
            {stats && stats.activeTickets > 0 ? ` You have ${stats.activeTickets} active support ticket${stats.activeTickets > 1 ? 's' : ''} requiring attention.` : " No critical issues have been detected in your environment."}
          </p>
          <div className="flex gap-4">
            <Button variant="premium" className="bg-white text-[#041635] hover:bg-slate-100">
              Request Support
            </Button>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              View Documents
            </Button>
          </div>
        </div>
        {/* Abstract background shape */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#2691F0] rounded-full blur-[100px] opacity-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Services */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-outfit text-xl font-black text-[#041635]">Active Subscriptions</h3>
              <button className="text-sm font-bold text-[#2691F0] flex items-center gap-1">
                Manage all <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "Managed IT Support", plan: "Enterprise 24/7", status: "Active", icon: Zap },
                { name: "Endpoint Protection", plan: "Advanced EDR", status: "Active", icon: ShieldCheck },
              ].map((service) => (
                <div key={service.name} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-[#2691F0]/30 transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-blue-50 text-[#2691F0]">
                      <service.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#041635]">{service.name}</p>
                      <p className="text-xs font-bold text-slate-400">{service.plan}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">
                      {service.status}
                    </span>
                    <button className="text-slate-400 hover:text-[#041635] transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#2691F0] hover:border-[#2691F0] hover:bg-blue-50/30 transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#2691F0] group-hover:text-white transition-all">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold">Add Service</span>
              </button>
            </div>
          </div>

          {/* Pending Tasks / Notifications */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-outfit font-black text-[#041635]">Upcoming Renewals</h3>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { name: "Service Agreement", date: "June 24, 2026", type: "Auto-renew" },
                { name: "Compliance Review", date: "July 12, 2026", type: "Scheduled" },
              ].map((item) => (
                <div key={item.name} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-[#041635]">{item.name}</p>
                    <p className="text-xs text-slate-400">Due on {item.date}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Actions (1 col) */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-50 text-[#2691F0] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h4 className="font-outfit text-lg font-black text-[#041635] mb-2">Need Help?</h4>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Our support team is available 24/7 to assist with any technical issues.
            </p>
            <Button variant="premium" className="w-full">Open Support Ticket</Button>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden">
            <h4 className="font-outfit text-lg font-bold mb-4 relative z-10">Environment State</h4>
            <div className="space-y-6 relative z-10">
              {[
                { label: "Active Tickets", value: stats?.activeTickets || 0, total: 10, pct: ((stats?.activeTickets || 0) / 10) * 100 },
                { label: "Client Documents", value: stats?.storedDocuments || 0, total: 20, pct: ((stats?.storedDocuments || 0) / 20) * 100 },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-400">{item.label}</span>
                    <span>{item.value} / {item.total}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#2691F0] transition-all duration-1000" 
                      style={{ width: `${Math.min(item.pct, 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 right-0 p-4 opacity-5">
              <Zap className="h-32 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
