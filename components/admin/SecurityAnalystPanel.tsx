import { AlertCircle, CheckCircle2, Clock, Radar } from "lucide-react";
import {
  SEVERITY_ORDER,
  type AnalystFinding,
  type AnalystReport,
  type Severity,
} from "@/lib/security-analyst";
import { cn } from "@/lib/utils";

const SEVERITY_META: Record<Severity, { label: string; chip: string; dot: string }> = {
  critical: { label: "Critical", chip: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-600" },
  high: { label: "High", chip: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  medium: { label: "Medium", chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  low: { label: "Low", chip: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  info: { label: "Clear", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

const BAND_META = {
  healthy: { label: "No open findings", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  attention: { label: "Needs attention", tone: "border-amber-200 bg-amber-50 text-amber-900" },
  "at-risk": { label: "Action required", tone: "border-rose-200 bg-rose-50 text-rose-900" },
  unknown: { label: "Incomplete picture", tone: "border-slate-200 bg-slate-50 text-slate-700" },
} as const;

export function SecurityAnalystEmptyState() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Radar className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <h2 className="font-outfit font-black text-[#041635]">Security analyst</h2>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            No completed scan is recorded yet. Run a scan below and the analyst will classify every
            finding by severity, explain what it means, and set out what to fix first.
          </p>
        </div>
      </div>
    </section>
  );
}

export function SecurityAnalystPanel({ report }: { report: AnalystReport }) {
  const band = BAND_META[report.band];
  const assessedAt = new Date(report.generatedAt).toLocaleString("en-GB");

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#2691F0]/20 bg-[#2691F0]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#0f5aab]">
            <Radar className="h-3.5 w-3.5" />
            Security analyst
          </div>
          <h2 className="font-outfit text-xl font-black text-[#041635]">
            {report.triage.length === 0
              ? "Nothing outstanding from the last scan."
              : `${report.triage.length} finding${report.triage.length === 1 ? "" : "s"} to work through.`}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Assessed {assessedAt} ({report.freshness.label}) &middot; {report.passing} check
            {report.passing === 1 ? "" : "s"} clear
          </p>

          {report.freshness.stale && (
            <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              These findings are {report.freshness.label} and may no longer reflect the current state.
              Re-run the scan below.
            </p>
          )}
        </div>

        <div className={cn("rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-widest", band.tone)}>
          {band.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-5">
        {SEVERITY_ORDER.map((severity) => (
          <div key={severity} className="bg-white px-5 py-4">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", SEVERITY_META[severity].dot)} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {SEVERITY_META[severity].label}
              </span>
            </div>
            <p className="mt-2 font-outfit text-2xl font-black tabular-nums text-[#041635]">
              {report.counts[severity]}
            </p>
          </div>
        ))}
      </div>

      {report.blindSpots.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Could not be assessed
          </p>
          <ul className="mt-2 space-y-1.5">
            {report.blindSpots.map((spot) => (
              <li key={spot} className="flex gap-2 text-xs font-semibold leading-5 text-slate-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                {spot}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-6">
        {report.triage.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold leading-relaxed text-emerald-900">
              Every configured check passed on the last run. This covers the listed checks only. It is
              not continuous monitoring and it is not a security certification.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Work through in this order
            </p>
            <ol className="space-y-3">
              {report.triage.map((finding, index) => (
                <FindingRow key={finding.id} finding={finding} position={index + 1} />
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}

function FindingRow({ finding, position }: { finding: AnalystFinding; position: number }) {
  const meta = SEVERITY_META[finding.severity];

  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs font-black tabular-nums text-slate-400">
          {String(position).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
            meta.chip
          )}
        >
          {meta.label}
        </span>
        <h3 className="font-outfit text-sm font-black text-[#041635]">{finding.title}</h3>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {finding.category}
        </span>
        {finding.unknown && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Not assessed
          </span>
        )}
      </div>

      <dl className="mt-3 space-y-2 text-xs leading-5">
        <div>
          <dt className="inline font-black uppercase tracking-wider text-slate-400">Observed </dt>
          <dd className="inline font-semibold text-slate-700">{finding.observation}</dd>
        </div>
        <div>
          <dt className="inline font-black uppercase tracking-wider text-slate-400">Why it matters </dt>
          <dd className="inline font-medium text-slate-600">{finding.impact}</dd>
        </div>
        <div>
          <dt className="inline font-black uppercase tracking-wider text-[#0f5aab]">Next step </dt>
          <dd className="inline font-semibold text-slate-700">{finding.remediation}</dd>
        </div>
      </dl>
    </li>
  );
}
