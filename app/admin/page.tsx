import Link from "next/link";
import { 
  Users, 
  Shield, 
  Server, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { getAdminStats, getRecentActivities } from "@/lib/data-fetchers";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboard() {
  const [statsData, activities] = await Promise.all([
    getAdminStats(),
    getRecentActivities(6)
  ]);

  const stats = [
    { name: "Active Clients", value: statsData.totalClients.toString(), change: "+2%", trend: "up", icon: Users },
    { name: "Newsletter", value: statsData.totalSubscribers.toString(), change: "Live", trend: "neutral", icon: Shield },
    { name: "Security Score", value: `${statsData.securityScore}%`, change: "High", trend: "up", icon: Activity },
    { name: "Support Tickets", value: statsData.activeTickets.toString(), change: "Active", trend: "down", icon: Server },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635] mb-2">Systems Overview</h1>
        <p className="text-slate-500 font-medium">Welcome back, Administrator. Everything is running smoothly.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-slate-50 text-[#2691F0]">
                <stat.icon className="h-6 w-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black ${
                stat.trend === "up" ? "text-emerald-500" : stat.trend === "down" ? "text-rose-500" : "text-slate-400"
              }`}>
                {stat.change}
                {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : stat.trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
              </div>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.name}</p>
            <p className="text-3xl font-black text-[#041635] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-outfit font-black text-[#041635]">Recent Operations</h3>
            <button className="text-xs font-bold text-[#2691F0] hover:underline">View all</button>
          </div>
          <div className="divide-y divide-slate-50">
            {activities.length > 0 ? (
              activities.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#041635]">{item.action}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : "Recent"}
                      <span className="mx-1">•</span>
                      <span className="capitalize">{item.type.toLowerCase()}</span>
                    </p>
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-slate-400">
                <p className="text-sm font-medium">No recent operations logged.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-[#041635] text-white p-8 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Shield className="h-24 w-24" />
            </div>
            <h3 className="font-outfit text-xl font-bold mb-4 relative z-10">Security Scan</h3>
            <p className="text-slate-400 text-sm mb-6 relative z-10">Initialize a full environment security audit and compliance check.</p>
            <Button variant="premium" size="sm" className="w-full relative z-10">Run Scan Now</Button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-outfit font-black text-[#041635] mb-4">Quick Links</h3>
            <div className="space-y-3">
              {[
                { name: "Client Portal Settings", href: "/admin/settings" },
                { name: "Service CMS", href: "/admin/services-cms" },
                { name: "Infrastructure Logs", href: "/admin/audit-logs" },
                { name: "Support Queue", href: "/admin/ticket-management" },
              ].map((link) => (
                <Link key={link.name} href={link.href} className="w-full text-left text-sm font-bold text-slate-600 hover:text-[#2691F0] py-2 transition-colors flex items-center justify-between group">
                  {link.name}
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

