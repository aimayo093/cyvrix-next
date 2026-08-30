import * as React from "react";
import { connection } from "next/server";
import { AlertCircle, BellRing, CheckCircle2, Clock, HelpCircle, LockKeyhole, Radar, Save, ShieldCheck, Siren, XCircle } from "lucide-react";
import { canManageSecurityCenter, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSiteSetting } from "@/lib/admin-actions";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { Button } from "@/components/shared/Button";
import { SecurityScanCard } from "@/components/admin/SecurityScanCard";
import {
  SecurityAnalystEmptyState,
  SecurityAnalystPanel,
} from "@/components/admin/SecurityAnalystPanel";
import { buildAnalystReport } from "@/lib/security-analyst";
import {
  DEFAULT_SECURITY_CENTER_SETTINGS,
  parseSecurityCenterSettings,
  type SecurityScanResult,
} from "@/lib/security-scan";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata = { title: "Security Center" };

/** Drawn in grey: a question nobody answered is not a fault to fix. */
const NOT_ASSESSED_META = { icon: HelpCircle, label: "Not assessed", color: "text-slate-400", bg: "bg-slate-50 border-slate-200" };

function formatScanAge(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes ago`;
  if (hours < 48) return `${Math.round(hours)} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const STATUS_META = {
  pass: { icon: CheckCircle2, label: "Checks passed", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  warn: { icon: AlertCircle, label: "Review", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  fail: { icon: XCircle, label: "Action", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
};

export default function SecurityCenterPage() {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <SecurityCenterPageContent />
    </React.Suspense>
  );
}

async function SecurityCenterPageContent() {
  await connection();
  const administrator = await requireAdmin();
  if (!canManageSecurityCenter(administrator.role)) redirect("/admin");

  const [securitySetting, lastScan, lastBackgroundScan, alertEvents] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "securityCenter" } }),
    prisma.auditLog.findFirst({
      where: { action: "SECURITY_SCAN_RUN" },
      orderBy: { createdAt: "desc" },
    }),
    // Whether the daily schedule has ever actually produced a result. The
    // toggle below defaults to on, which is a statement about intent, not
    // about anything having run.
    prisma.auditLog.findFirst({
      where: { action: "SECURITY_SCAN_RUN", metadata: { path: ["trigger"], equals: "background" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: ["SECURITY_SCAN_ALERT_SENT", "SECURITY_SCAN_ALERT_SKIPPED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const settings = parseSecurityCenterSettings(securitySetting?.value);
  const lastResult = readScanResult(lastScan?.metadata);
  const statusMeta = lastResult ? STATUS_META[lastResult.overallStatus] : null;
  /*
   * "Not assessed" is neither a pass nor a warning.
   *
   * A question that could not be answered - "no webhook endpoint exists, so
   * there is no unsigned webhook to exploit" - was being counted in the
   * warning total. That inflates the number of things apparently wrong and
   * buries the findings that are real: this page reported nine warnings when
   * two of them were "there is nothing here to attack".
   *
   * It must not become a pass either. A blind spot shown as green is the one
   * mistake a security dashboard cannot make. So it gets its own count and its
   * own group, and the score goes on ignoring it.
   */
  const failures = lastResult?.checks.filter((check) => check.status === "fail") ?? [];
  const warnings = lastResult?.checks.filter((check) => check.status === "warn" && check.assessed !== false) ?? [];
  const notAssessed = lastResult?.checks.filter((check) => check.assessed === false) ?? [];

  /*
   * How old the displayed result is.
   *
   * Everything on this page is a snapshot of whenever a scan last ran. The
   * headline score used to be printed with no date on it, so a result from
   * three days ago read as the current state of the site - and did, for three
   * days, while the findings it listed were being fixed.
   */
  const scanAgeHours = lastResult ? (Date.now() - Date.parse(lastResult.timestamp)) / 3_600_000 : null;
  // The schedule is daily, so past a day and a half it has missed one.
  const scanIsStale = scanAgeHours !== null && scanAgeHours > 36;
  const analyst = lastResult ? await buildAnalystReport(lastResult) : null;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2691F0]/20 bg-[#2691F0]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#0f5aab]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform Security
          </div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Security Center</h1>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
            Review configured platform checks, public-route monitoring, dependency freshness, and alert delivery. Results cover these checks only; they are not a security certification or continuous monitoring service.
          </p>
        </div>

        {lastResult && statusMeta && (
          <div className={cn("rounded-2xl border px-5 py-4 shadow-sm", statusMeta.bg)}>
            <div className="flex items-center gap-3">
              <statusMeta.icon className={cn("h-5 w-5", statusMeta.color)} />
              <div>
                <p className={cn("text-xs font-black uppercase tracking-widest", statusMeta.color)}>
                  Last configured scan: {statusMeta.label}
                </p>
                <p className="mt-0.5 text-sm font-black text-[#041635]">
                  {lastResult.score}% check score - {failures.length} failures - {warnings.length} warnings
                  {notAssessed.length > 0 && ` - ${notAssessed.length} not assessed`}
                </p>
                <p className={cn("mt-1 text-[11px] font-bold", scanIsStale ? "text-rose-600" : "text-slate-500")}>
                  {scanIsStale ? "This result is " : "Scanned "}
                  {formatScanAge(scanAgeHours ?? 0)}
                  {scanIsStale ? " and describes the site as it was then, not as it is now." : "."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/*
        * Automatic scanning is on by default, which describes an intention. It
        * says nothing about whether the schedule has ever run - and it had not,
        * because the cron route refuses the request when CRON_SECRET is unset,
        * which is also its behaviour when the variable was simply never added.
        * A dashboard that implies monitoring it is not doing is worse than one
        * that admits it, so this states the position either way.
        */}
      {settings.automaticScanEnabled && !lastBackgroundScan && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-800">
            Automatic scans are enabled but have never run
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-amber-900">
            Every result on this page was produced by someone pressing Run Scan. The daily schedule
            calls <code className="font-mono text-xs">/api/cron/security-scan</code> with a bearer token
            and is refused whenever <code className="font-mono text-xs">CRON_SECRET</code> is missing, so
            nothing is being checked between manual runs. Set that variable in Vercel to turn the
            schedule on, or switch the toggle off so this page stops implying cover it does not have.
          </p>
        </div>
      )}

      {analyst ? <SecurityAnalystPanel report={analyst} /> : <SecurityAnalystEmptyState />}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="font-outfit font-black text-[#041635]">Automatic Protection Settings</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                The Vercel daily schedule needs `CRON_SECRET`; alert email also needs a recipient and working email transport. Treat these settings as configuration until a completed scan is recorded below.
              </p>
            </div>

            <form action={updateSiteSetting} className="space-y-6 p-6">
              <input type="hidden" name="key" value="securityCenter" />
              <ToggleField
                name="value.automaticScanEnabled"
                label="Enable automatic background scans"
                description="Allows the deployed daily Vercel Cron request to run the configured scan."
                defaultChecked={settings.automaticScanEnabled}
              />
              <ToggleField
                name="value.emailAlertsEnabled"
                label="Send email alerts to admin"
                description="Attempts email delivery for background findings when a recipient and transport are configured."
                defaultChecked={settings.emailAlertsEnabled}
              />
              <ToggleField
                name="value.alertOnWarnings"
                label="Alert on warnings as well as failures"
                description="Send notifications for warning-level findings, not only hard failures."
                defaultChecked={settings.alertOnWarnings}
              />
              <ToggleField
                name="value.websiteScanEnabled"
                label="Monitor website routes for errors"
                description="Checks key public pages for HTTP failures and critical application error pages."
                defaultChecked={settings.websiteScanEnabled}
              />
              <ToggleField
                name="value.dependencyScanEnabled"
                label="Check for outdated dependencies"
                description="Compares direct package versions against npm registry latest versions when reachable."
                defaultChecked={settings.dependencyScanEnabled}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700">
                  Admin alert email
                  <input
                    type="email"
                    name="value.adminAlertEmail"
                    defaultValue={settings.adminAlertEmail}
                    placeholder="alerts@cyvrix.co.uk"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Website base URL
                  <input
                    name="value.websiteBaseUrl"
                    defaultValue={settings.websiteBaseUrl}
                    placeholder="https://cyvrix.co.uk"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
                  />
                </label>
              </div>

              <label className="block text-sm font-bold text-slate-700">
                Monitored routes
                <textarea
                  name="value.monitoredRoutes"
                  rows={6}
                  defaultValue={(settings.monitoredRoutes.length ? settings.monitoredRoutes : DEFAULT_SECURITY_CENTER_SETTINGS.monitoredRoutes).join("\n")}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-xs text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
                />
              </label>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800">
                Set `CRON_SECRET` in Vercel environment variables. Vercel Cron calls `/api/cron/security-scan` daily with `Authorization: Bearer CRON_SECRET`.
              </div>

              <Button type="submit" className="flex items-center gap-2 rounded-xl bg-[#041635] px-6 py-2.5 font-bold text-white hover:bg-[#2691F0]">
                <Save className="h-4 w-4" />
                Save Security Settings
              </Button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-outfit font-black text-[#041635]">Security Control Areas</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">The current scan covers these specific technical checks.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ControlCard icon={Radar} title="Website route checks" body="Requests configured public routes and flags HTTP failures or recognised error pages." />
              <ControlCard icon={LockKeyhole} title="Platform checks" body="Tests database access, environment presence, auth-secret length, RLS state, privileged-account count, and headers." />
              <ControlCard icon={Siren} title="Dependency freshness" body="Compares direct package versions with npm's latest metadata when the registry is reachable." />
              <ControlCard icon={BellRing} title="Background alerting" body="Background findings create internal notifications; email delivery also requires a recipient and configured transport." />
            </div>
          </section>

          {lastResult && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="font-outfit font-black text-[#041635]">Latest Scan Findings</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Completed {new Date(lastResult.timestamp).toLocaleString()} in {lastResult.durationMs}ms.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {lastResult.checks.map((check) => {
                  // An unanswered question is drawn as a blind spot, not as a
                  // fault, so the eye goes to the findings that are real.
                  const unanswered = check.assessed === false;
                  const meta = unanswered ? NOT_ASSESSED_META : STATUS_META[check.status];
                  return (
                    <div key={check.id} className="flex items-start gap-3 px-6 py-4">
                      <meta.icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-[#041635]">{check.label}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            {check.category}
                          </span>
                          {unanswered && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
                              Not assessed
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{check.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <SecurityScanCard />

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#2691F0]" />
              <h3 className="font-outfit font-black text-[#041635]">Alert Delivery</h3>
            </div>
            <div className="space-y-3">
              {alertEvents.length ? (
                alertEvents.map((event) => {
                  const metadata = readMetadata(event.metadata);
                  const reason = typeof metadata.reason === "string" && metadata.reason.trim()
                    ? metadata.reason
                    : "Security alert event recorded.";
                  return (
                    <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-[#041635]">{event.action.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                        {reason}
                      </p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {event.createdAt.toLocaleString()}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm font-semibold text-slate-500">No alert delivery events have been recorded yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value : {};
}

function readScanResult(value: unknown): SecurityScanResult | null {
  const result = readMetadata(value).result;
  if (!isRecord(result) || !Array.isArray(result.checks)) return null;
  if (typeof result.score !== "number" || typeof result.durationMs !== "number" || typeof result.timestamp !== "string") return null;
  if (result.overallStatus !== "pass" && result.overallStatus !== "warn" && result.overallStatus !== "fail") return null;
  if (result.trigger !== "manual" && result.trigger !== "background") return null;
  return result as unknown as SecurityScanResult;
}

function ToggleField({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <input type="hidden" name={name} value="false" />
      <div>
        <span className="block text-sm font-black text-[#041635]">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">{description}</span>
      </div>
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0]"
      />
    </label>
  );
}

function ControlCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2691F0]/10 text-[#2691F0]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-black text-[#041635]">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}
