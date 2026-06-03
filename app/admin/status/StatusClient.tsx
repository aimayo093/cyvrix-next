"use client";

import * as React from "react";
import { 
  CheckCircle2, 
  Activity, 
  Database, 
  Mail, 
  ShieldCheck, 
  Server, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  Bell,
  Save,
  Check
} from "lucide-react";
import { Button } from "@/components/shared/Button";

interface SystemStatusItem {
  id: string;
  name: string;
  description: string;
  status: "operational" | "degraded" | "outage";
  uptime: string;
  icon: React.ComponentType<any>;
}

export function StatusClient() {
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [alertEmail, setAlertEmail] = React.useState("admin@cyvrix.co.uk");
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");

  const systems: SystemStatusItem[] = [
    {
      id: "helpdesk",
      name: "IT Service Desk & Dispatch Queue",
      description: "Inbound ticketing, remote helpdesk session orchestration, and engineer dispatching.",
      status: "operational",
      uptime: "100% SLA",
      icon: Activity,
    },
    {
      id: "database",
      name: "Supabase Cloud Database Cluster",
      description: "Primary transactional databases, secure client portal storage, and real-time syncing.",
      status: "operational",
      uptime: "99.99%",
      icon: Database,
    },
    {
      id: "email",
      name: "Resend Mail Delivery Service",
      description: "Automated ticket alerts, OTP codes, client notifications, and satisfaction survey emails.",
      status: "operational",
      uptime: "100.00%",
      icon: Mail,
    },
    {
      id: "edge",
      name: "Managed Firewall & Edge WAF",
      description: "Edge protection, DDoS mitigation, SSL certification handling, and global routing rules.",
      status: "operational",
      uptime: "100.00%",
      icon: ShieldCheck,
    },
    {
      id: "portal",
      name: "Client Portal Gateway & Admin CMS",
      description: "Client-facing job controls, support hub dashboard, and internal staff workflows.",
      status: "operational",
      uptime: "99.98%",
      icon: Server,
    },
  ];

  React.useEffect(() => {
    setLastUpdated(new Date());
    const timer = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 800);
  };

  const handleSaveAlertSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveState("saving");
    setTimeout(() => {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    }, 800);
  };

  // Generate 30 days of mock uptime bars (all operational green)
  const renderUptimeGrid = () => {
    return Array.from({ length: 30 }).map((_, idx) => (
      <div 
        key={idx}
        className="h-8 w-1.5 sm:w-2 md:w-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-sm group relative cursor-pointer"
      >
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-28 bg-[#041635] text-white rounded-lg p-1.5 text-[9px] font-bold text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl">
          {30 - idx} days ago
          <div className="text-emerald-400 mt-0.5">100% Uptime</div>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-[#041635]">All Core Services Operational</span>
        </div>
        <div className="flex items-center gap-3 justify-between sm:justify-start">
          <span className="text-xs font-semibold text-slate-400">
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Loading..."}
          </span>
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#2691F0] hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
            aria-label="Refresh Status"
            id="admin-btn-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[#2691F0]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Services Uptime List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="h-4 w-4 text-[#2691F0]" />
              <h2 className="font-outfit font-black text-[#041635] text-sm uppercase tracking-wider">Active Services Status</h2>
            </div>
            
            <div className="space-y-4">
              {systems.map((sys) => (
                <div key={sys.id} className="flex items-start justify-between gap-4 border-b border-slate-50 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[#2691F0] shrink-0 self-start">
                      <sys.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-outfit font-bold text-sm text-[#041635] flex flex-wrap items-center gap-2">
                        {sys.name}
                        <span className="text-[10px] font-bold text-slate-500 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                          {sys.uptime} Uptime
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        {sys.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 border border-emerald-100">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    Active
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Timeline Uptime */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#2691F0]" />
                Operational Uptime History
              </span>
              <span>Last 30 Days</span>
            </div>
            <div className="flex justify-between items-center gap-1.5 py-2">
              {renderUptimeGrid()}
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>30 days ago</span>
              <span className="w-px h-3 bg-slate-200" />
              <span>15 days ago</span>
              <span className="w-px h-3 bg-slate-200" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Sidebar Controls Panel (Alert configurations + Log) */}
        <div className="space-y-6">
          
          {/* Notifications Alert Dispatch settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bell className="h-4 w-4 text-[#2691F0]" />
              <h2 className="font-outfit font-black text-[#041635] text-sm uppercase tracking-wider">Alert Dispatch</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Enter the IT Operations email where critical service degradation alerts or outage warning logs will be sent:
            </p>
            <form onSubmit={handleSaveAlertSettings} className="space-y-3" id="admin-status-email-form">
              <label className="block text-xs font-bold text-slate-600">
                Notification Recipient
                <input 
                  type="email"
                  required
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="mt-1.5 w-full text-xs font-semibold rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-colors"
                />
              </label>
              <Button
                type="submit"
                disabled={saveState === "saving"}
                className="w-full text-xs font-bold bg-[#041635] hover:bg-[#2691F0] text-white py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                id="admin-btn-save-alerts"
              >
                {saveState === "saving" ? (
                  "Saving..."
                ) : saveState === "saved" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save Recipient
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Uptime incident timeline summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertCircle className="h-4 w-4 text-[#2691F0]" />
              <h2 className="font-outfit font-black text-[#041635] text-sm uppercase tracking-wider">Maintenance Log</h2>
            </div>
            <div className="space-y-4">
              <div className="border-l-2 border-slate-200 pl-4 py-0.5 space-y-1 relative">
                <span className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white" />
                <div className="text-[10px] font-bold text-slate-400">May 28, 2026</div>
                <div className="text-xs font-bold text-[#041635]">Database optimization</div>
                <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                  Analytics indexes rebuilt on primary node. Operation finished in 4m with no service downtime.
                </p>
              </div>
              <div className="border-l-2 border-slate-200 pl-4 py-0.5 space-y-1 relative">
                <span className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white" />
                <div className="text-[10px] font-bold text-slate-400">May 14, 2026</div>
                <div className="text-xs font-bold text-[#041635]">SSL Gateway Updates</div>
                <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                  Updated Edge routing rules and renewed certificates. Finished at 02:00 BST.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
