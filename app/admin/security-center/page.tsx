import * as React from "react";
import { connection } from "next/server";
import { AlertCircle, BellRing, CheckCircle2, Clock, LockKeyhole, Radar, Save, ShieldCheck, Siren, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSiteSetting } from "@/lib/admin-actions";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { Button } from "@/components/shared/Button";
import { SecurityScanCard } from "@/components/admin/SecurityScanCard";
import {
  DEFAULT_SECURITY_CENTER_SETTINGS,
  parseSecurityCenterSettings,
  type SecurityScanResult,
} from "@/lib/security-scan";
import { cn } from "@/lib/utils";

export const metadata = { title: "Security Center | CYVRIX Admin" };

const STATUS_META = {
  pass: { icon: CheckCircle2, label: "Secure", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  warn: { icon: AlertCircle, label: "Review", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  fail: { icon: XCircle, label: "Action", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
};

export default function SecurityCenterPage(props: any) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <SecurityCenterPageContent {...props} />
    </React.Suspense>
  );
}

async function SecurityCenterPageContent() {
  await connection();
  await requireAdmin();

  const [securitySetting, lastScan, alertEvents] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "securityCenter" } }),
    prisma.auditLog.findFirst({
      where: { action: "SECURITY_SCAN_RUN" },
      orderBy: { createdAt: "desc" },
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
  const failures = lastResult?.checks.filter((check) => check.status === "fail") ?? [];
  const warnings = lastResult?.checks.filter((check) => check.status === "warn") ?? [];

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
            Manage automatic scans, website error monitoring, dependency freshness checks, alert delivery, and the security controls protecting the CYVRIX platform.
          </p>
        </div>

        {lastResult && statusMeta && (
          <div className={cn("rounded-2xl border px-5 py-4 shadow-sm", statusMeta.bg)}>
            <div className="flex items-center gap-3">
              <statusMeta.icon className={cn("h-5 w-5", statusMeta.color)} />
              <div>
                <p className={cn("text-xs font-black uppercase tracking-widest", statusMeta.color)}>
                  Last scan: {statusMeta.label}
                </p>
                <p className="mt-0.5 text-sm font-black text-[#041635]">
                  {lastResult.score}% score - {failures.length} failures - {warnings.length} warnings
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="font-outfit font-black text-[#041635]">Automatic Protection Settings</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                The daily background scan runs through Vercel Cron and sends an admin alert when configured thresholds are met.
              </p>
            </div>

            <form action={updateSiteSetting} className="space-y-6 p-6">
              <input type="hidden" name="key" value="securityCenter" />
              <ToggleField
                name="value.automaticScanEnabled"
                label="Enable automatic background scans"
                description="Runs the Security Center scan daily in production."
                defaultChecked={settings.automaticScanEnabled}
              />
              <ToggleField
                name="value.emailAlertsEnabled"
                label="Send email alerts to admin"
                description="Emails the configured admin inbox when the background scan finds issues."
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
                <p className="mt-1 text-xs font-semibold text-slate-500">Controls and checks now managed by Security Center.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ControlCard icon={Radar} title="Website error monitor" body="Scans public pages for HTTP failures and application error screens." />
              <ControlCard icon={LockKeyhole} title="Platform hardening" body="Checks auth secret strength, RLS posture, privileged accounts, and security headers." />
              <ControlCard icon={Siren} title="Dependency watch" body="Checks direct dependencies against npm latest versions and warns when updates are available." />
              <ControlCard icon={BellRing} title="Admin alerting" body="Creates in-app notifications and emails the admin inbox when scans need attention." />
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
                  const meta = STATUS_META[check.status];
                  return (
                    <div key={check.id} className="flex items-start gap-3 px-6 py-4">
                      <meta.icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-[#041635]">{check.label}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            {check.category}
                          </span>
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
                  return (
                    <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-[#041635]">{event.action.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                        {metadata.reason || "Security alert event recorded."}
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

function readMetadata(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? value as Record<string, any> : {};
}

function readScanResult(value: unknown): SecurityScanResult | null {
  const metadata = readMetadata(value);
  return (metadata.result as SecurityScanResult | undefined) ?? null;
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
