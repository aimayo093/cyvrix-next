import Link from "next/link";
import { Activity, AlertCircle, ClipboardList, Radar, ShieldCheck } from "lucide-react";

const reportingAreas = [
  {
    title: "Availability monitoring",
    description: "No verified uptime or availability provider is connected to this workspace.",
    icon: Activity,
  },
  {
    title: "Incident reporting",
    description: "No incident feed is configured, so this screen does not infer service health or maintenance history.",
    icon: AlertCircle,
  },
  {
    title: "Alert delivery",
    description: "No status-alert recipient is configured from a verified monitoring source.",
    icon: ClipboardList,
  },
];

export function StatusClient() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-outfit text-lg font-black text-[#041635]">Status reporting is not connected</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-amber-900">
              CYVRIX does not publish simulated uptime, operational, SLA, or incident data. Connect a verified monitoring source before using this area for service-status reporting.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2691F0]">Reporting readiness</p>
          <h2 className="mt-1 font-outfit text-xl font-black text-[#041635]">Verified sources required</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
            Each reporting area remains deliberately unreported until it can show a timestamped result from an approved source.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {reportingAreas.map((area) => (
            <div key={area.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                <area.icon className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Not reporting</p>
              <h3 className="mt-1 text-sm font-black text-[#041635]">{area.title}</h3>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{area.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link
          href="/admin/security-center"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-[#2691F0]/40 hover:bg-blue-50/30"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2691F0]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="font-outfit text-lg font-black text-[#041635]">Security Center</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            Run a platform security scan and review persisted findings, alert events, and scan configuration.
          </p>
          <span className="mt-4 inline-flex text-sm font-black text-[#2691F0]">Open Security Center</span>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-[#2691F0]/40 hover:bg-blue-50/30"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2691F0]">
            <Radar className="h-5 w-5" />
          </div>
          <h2 className="font-outfit text-lg font-black text-[#041635]">Audit logs</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            Review recorded administrative and security events without treating the audit log as live service telemetry.
          </p>
          <span className="mt-4 inline-flex text-sm font-black text-[#2691F0]">Review audit logs</span>
        </Link>
      </section>
    </div>
  );
}
