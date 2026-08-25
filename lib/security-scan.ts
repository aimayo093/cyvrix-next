import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@/generated/prisma";
import { appSecManifestAge, liveAppSecChecks, staticAppSecChecks } from "@/lib/appsec-checks";
import { prisma } from "@/lib/prisma";
import { getEmailIdentity, normaliseEmailRecipients } from "@/lib/email-config";

export type SecurityCheckStatus = "pass" | "warn" | "fail";
export type SecurityCheckCategory =
  | "platform"
  | "website"
  | "security"
  | "dependencies"
  | "operations";

export interface SecurityScanCheck {
  id: string;
  label: string;
  status: SecurityCheckStatus;
  detail: string;
  category: SecurityCheckCategory;
  /**
   * False when the question could not be answered at all, rather than answered
   * badly. "No webhook endpoint exists" is not a failure to fix; counting it
   * against the score would penalise not having a feature.
   *
   * Defaults to true, so existing checks are unaffected.
   */
  assessed?: boolean;
}

export interface SecurityScanResult {
  score: number;
  overallStatus: SecurityCheckStatus;
  checks: SecurityScanCheck[];
  durationMs: number;
  timestamp: string;
  trigger: "manual" | "background";
}

export interface SecurityCenterSettings {
  automaticScanEnabled: boolean;
  emailAlertsEnabled: boolean;
  dependencyScanEnabled: boolean;
  websiteScanEnabled: boolean;
  alertOnWarnings: boolean;
  adminAlertEmail: string;
  websiteBaseUrl: string;
  monitoredRoutes: string[];
}

const DEFAULT_MONITORED_ROUTES = [
  "/",
  "/services",
  "/about",
  "/contact",
  "/industries",
  "/case-studies",
];

export const DEFAULT_SECURITY_CENTER_SETTINGS: SecurityCenterSettings = {
  automaticScanEnabled: true,
  emailAlertsEnabled: true,
  dependencyScanEnabled: true,
  websiteScanEnabled: true,
  alertOnWarnings: true,
  adminAlertEmail: "",
  websiteBaseUrl: "",
  monitoredRoutes: DEFAULT_MONITORED_ROUTES,
};

type RawSettings = Record<string, unknown>;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asBool(value: unknown, fallback: boolean) {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normaliseRoute(route: string) {
  const trimmed = route.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function parseSecurityCenterSettings(value: unknown): SecurityCenterSettings {
  const raw = (value && typeof value === "object" ? value : {}) as RawSettings;
  const routesRaw = asString(raw.monitoredRoutes, DEFAULT_MONITORED_ROUTES.join("\n"));
  const routes = routesRaw
    .split(/\r?\n|,/)
    .map(normaliseRoute)
    .filter(Boolean);

  return {
    automaticScanEnabled: asBool(raw.automaticScanEnabled, DEFAULT_SECURITY_CENTER_SETTINGS.automaticScanEnabled),
    emailAlertsEnabled: asBool(raw.emailAlertsEnabled, DEFAULT_SECURITY_CENTER_SETTINGS.emailAlertsEnabled),
    dependencyScanEnabled: asBool(raw.dependencyScanEnabled, DEFAULT_SECURITY_CENTER_SETTINGS.dependencyScanEnabled),
    websiteScanEnabled: asBool(raw.websiteScanEnabled, DEFAULT_SECURITY_CENTER_SETTINGS.websiteScanEnabled),
    alertOnWarnings: asBool(raw.alertOnWarnings, DEFAULT_SECURITY_CENTER_SETTINGS.alertOnWarnings),
    adminAlertEmail: normaliseEmailRecipients(raw.adminAlertEmail),
    websiteBaseUrl: asString(raw.websiteBaseUrl),
    monitoredRoutes: routes.length ? routes : DEFAULT_MONITORED_ROUTES,
  };
}

export async function getSecurityCenterSettings() {
  const [securitySetting, emailIdentity, companySetting] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "securityCenter" } }).catch(() => null),
    getEmailIdentity(),
    prisma.siteSetting.findUnique({ where: { key: "company" } }).catch(() => null),
  ]);

  const settings = parseSecurityCenterSettings(securitySetting?.value);
  const companyConfig = (companySetting?.value as Record<string, string> | null) ?? {};

  return {
    ...settings,
    adminAlertEmail:
      settings.adminAlertEmail ||
      emailIdentity.adminNotificationEmail ||
      "",
    websiteBaseUrl:
      settings.websiteBaseUrl ||
      companyConfig.websiteUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      "",
  };
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, done: () => clearTimeout(timeout) };
}

function cleanVersion(range: string) {
  const match = range.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? "";
}

function compareVersions(a: string, b: string) {
  const left = cleanVersion(a).split(".").map((part) => Number(part));
  const right = cleanVersion(b).split(".").map((part) => Number(part));
  for (let i = 0; i < 3; i++) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  return 0;
}

function registryUrl(packageName: string) {
  return `https://registry.npmjs.org/${encodeURIComponent(packageName).replace("%2F", "%2f")}`;
}

async function checkDependencyFreshness(checks: SecurityScanCheck[]) {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    const entries = Object.entries(dependencies).filter(([, range]) => cleanVersion(range));

    if (!entries.length) {
      checks.push({
        id: "dep_inventory",
        label: "Dependency Inventory",
        status: "warn",
        category: "dependencies",
        detail: "No pinned package versions were found to compare against the npm registry.",
      });
      return;
    }

    const results = await Promise.all(
      entries.map(async ([name, current]) => {
        const request = withTimeout(2500);
        try {
          const response = await fetch(registryUrl(name), { signal: request.controller.signal });
          if (!response.ok) return null;
          const data = (await response.json()) as { "dist-tags"?: { latest?: string } };
          const latest = data["dist-tags"]?.latest;
          if (!latest) return null;
          return compareVersions(current, latest) < 0 ? { name, current, latest } : null;
        } catch {
          return null;
        } finally {
          request.done();
        }
      }),
    );

    const outdated = results.filter(Boolean) as Array<{ name: string; current: string; latest: string }>;
    checks.push({
      id: "dep_outdated",
      label: "Outdated Dependencies",
      status: outdated.length ? "warn" : "pass",
      category: "dependencies",
      detail: outdated.length
        ? `${outdated.length} package${outdated.length === 1 ? "" : "s"} appear outdated: ${outdated
            .slice(0, 8)
            .map((item) => `${item.name} ${item.current} -> ${item.latest}`)
            .join(", ")}${outdated.length > 8 ? ", ..." : ""}`
        : `${entries.length} direct package${entries.length === 1 ? "" : "s"} checked against npm latest versions.`,
    });
  } catch {
    checks.push({
      id: "dep_outdated",
      label: "Outdated Dependencies",
      status: "warn",
      category: "dependencies",
      detail: "Could not inspect package.json or reach npm registry for dependency freshness.",
    });
  }
}

async function checkWebsiteRoutes(checks: SecurityScanCheck[], baseUrl: string, routes: string[]) {
  if (!baseUrl) {
    checks.push({
      id: "website_base_url",
      label: "Website Error Monitoring",
      status: "warn",
      category: "website",
      detail: "No website base URL is configured for public route monitoring.",
    });
    return;
  }

  const origin = baseUrl.startsWith("http") ? baseUrl.replace(/\/+$/, "") : `https://${baseUrl.replace(/\/+$/, "")}`;
  const failures: string[] = [];

  await Promise.all(
    routes.map(async (route) => {
      const request = withTimeout(8000);
      const url = `${origin}${normaliseRoute(route)}`;
      try {
        const response = await fetch(url, {
          redirect: "follow",
          signal: request.controller.signal,
          headers: { "User-Agent": "CYVRIX-SecurityCenter/1.0" },
        });
        const body = await response.text();
        const hasErrorText =
          body.includes("Something went wrong!") ||
          body.includes("A critical application error") ||
          body.includes("Application error");
        if (!response.ok || hasErrorText) {
          failures.push(`${normaliseRoute(route)} (${response.status}${hasErrorText ? ", error page" : ""})`);
        }
      } catch {
        failures.push(`${normaliseRoute(route)} (unreachable)`);
      } finally {
        request.done();
      }
    }),
  );

  checks.push({
    id: "website_routes",
    label: "Website Error Monitoring",
    status: failures.length ? "fail" : "pass",
    category: "website",
    detail: failures.length
      ? `Errors detected on: ${failures.slice(0, 8).join(", ")}${failures.length > 8 ? ", ..." : ""}`
      : `${routes.length} public route${routes.length === 1 ? "" : "s"} loaded without detected error pages.`,
  });
}

async function checkSecurityHeaders(checks: SecurityScanCheck[], requestOrigin: string) {
  try {
    const request = withTimeout(5000);
    const response = await fetch(`${requestOrigin}/api/health`, {
      method: "GET",
      signal: request.controller.signal,
      headers: { "X-Loopback": "true" },
    });
    request.done();
    const csp = response.headers.get("Content-Security-Policy");
    const hsts = response.headers.get("Strict-Transport-Security");
    const frameOptions = response.headers.get("X-Frame-Options");
    checks.push({
      id: "sec_headers",
      label: "HTTP Security Headers",
      status: csp && hsts && frameOptions ? "pass" : "fail",
      category: "security",
      detail: csp && hsts && frameOptions
        ? "CSP, HSTS, and clickjacking protection headers are active."
        : "Missing one or more critical headers: CSP, HSTS, X-Frame-Options.",
    });
  } catch {
    checks.push({
      id: "sec_headers",
      label: "HTTP Security Headers",
      status: "warn",
      category: "security",
      detail: "Could not verify security headers through the health endpoint.",
    });
  }
}

export async function runSecurityScan(options: {
  requestOrigin: string;
  trigger: "manual" | "background";
  settings?: SecurityCenterSettings;
}) {
  const startTime = Date.now();
  const settings = options.settings ?? await getSecurityCenterSettings();
  const checks: SecurityScanCheck[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ id: "db", label: "Database Connectivity", status: "pass", category: "platform", detail: "Supabase/Postgres is reachable." });
  } catch {
    checks.push({ id: "db", label: "Database Connectivity", status: "fail", category: "platform", detail: "Cannot reach the database." });
  }

  try {
    const logCount = await prisma.auditLog.count();
    checks.push({
      id: "audit",
      label: "Audit Logging",
      status: "pass",
      category: "platform",
      detail: `Audit log active with ${logCount.toLocaleString()} entries recorded.`,
    });
  } catch {
    checks.push({ id: "audit", label: "Audit Logging", status: "warn", category: "platform", detail: "Unable to query audit log." });
  }

  try {
    const openTickets = await prisma.ticket.count({ where: { status: { not: "CLOSED" } } });
    checks.push({
      id: "tickets",
      label: "Open Support Tickets",
      status: openTickets > 20 ? "warn" : "pass",
      category: "operations",
      detail: openTickets === 0 ? "No open tickets." : `${openTickets} open ticket${openTickets > 1 ? "s" : ""} in the queue.`,
    });
  } catch {
    checks.push({ id: "tickets", label: "Open Support Tickets", status: "warn", category: "operations", detail: "Could not fetch ticket data." });
  }

  const requiredEnv = ["DATABASE_URL", "AUTH_SECRET", "NEXT_PUBLIC_SUPABASE_URL"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  checks.push({
    id: "env",
    label: "Environment Variables",
    status: missingEnv.length === 0 ? "pass" : "fail",
    category: "platform",
    detail: missingEnv.length === 0 ? "All required environment variables are set." : `Missing: ${missingEnv.join(", ")}`,
  });

  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (!authSecret || authSecret === "development-only-change-me") {
    checks.push({ id: "sec_auth_secret", label: "Auth Secret Strength", status: "fail", category: "security", detail: "Authentication secret is missing or using a default insecure value." });
  } else if (authSecret.length < 32) {
    checks.push({ id: "sec_auth_secret", label: "Auth Secret Strength", status: "warn", category: "security", detail: "Authentication secret is shorter than 32 characters." });
  } else {
    checks.push({ id: "sec_auth_secret", label: "Auth Secret Strength", status: "pass", category: "security", detail: "Strong authentication secret detected." });
  }

  try {
    const rlsDisabledTables: { relname: string }[] = await prisma.$queryRaw`
      SELECT relname FROM pg_class
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE nspname = 'public' AND relkind = 'r' AND relrowsecurity = false;
    `;
    checks.push({
      id: "sec_rls",
      label: "Row-Level Security",
      status: rlsDisabledTables.length ? "warn" : "pass",
      category: "security",
      detail: rlsDisabledTables.length
        ? `RLS is disabled on ${rlsDisabledTables.length} public table(s): ${rlsDisabledTables.map((table) => table.relname).slice(0, 8).join(", ")}${rlsDisabledTables.length > 8 ? ", ..." : ""}`
        : "All public tables have RLS enabled.",
    });
  } catch {
    checks.push({ id: "sec_rls", label: "Row-Level Security", status: "warn", category: "security", detail: "Could not verify RLS policies." });
  }

  await checkSecurityHeaders(checks, options.requestOrigin);

  try {
    const superAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", active: true } });
    checks.push({
      id: "sec_privilege",
      label: "Privileged Account Audit",
      status: superAdmins > 3 ? "warn" : "pass",
      category: "security",
      detail: `Active SUPER_ADMIN accounts: ${superAdmins}.`,
    });
  } catch {
    checks.push({ id: "sec_privilege", label: "Privileged Account Audit", status: "warn", category: "security", detail: "Could not audit privileged accounts." });
  }

  if (settings.websiteScanEnabled) {
    await checkWebsiteRoutes(checks, settings.websiteBaseUrl || options.requestOrigin, settings.monitoredRoutes);
  }

  if (settings.dependencyScanEnabled) {
    await checkDependencyFreshness(checks);
  }

  // Application-security checks. The source analysis is precomputed by
  // `npm run scan:code`; the probes ask the running site directly.
  checks.push(...staticAppSecChecks());

  const appSecRequest = withTimeout(12_000);
  try {
    checks.push(...(await liveAppSecChecks(options.requestOrigin, appSecRequest.controller.signal)));
  } catch {
    checks.push({
      id: "appsec_live",
      label: "Live application-security probes",
      status: "warn",
      category: "security",
      detail: "The live probes could not complete, so exposed source maps, exposed files, CORS and error detail were not assessed on this run.",
    });
  } finally {
    appSecRequest.done();
  }

  // A stale manifest describes code that may have moved on.
  const manifestAge = appSecManifestAge(Date.now());
  if (manifestAge.ageDays > 30) {
    checks.push({
      id: "appsec_manifest_age",
      label: "Application-security analysis freshness",
      status: "warn",
      category: "security",
      detail: `The source analysis behind the checks above was generated ${manifestAge.ageDays} days ago and may not describe the current code. Run npm run scan:code.`,
    });
  }

  const passCount = checks.filter((check) => check.status === "pass").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;

  /*
   * Scored over the checks that could actually be answered, with a warning
   * worth half a pass.
   *
   * The previous rule was passes divided by total checks. That had two faults
   * which only became visible once the scan grew: a question nobody could
   * answer, such as "are webhooks signed" when no webhook exists, counted the
   * same as a real failure; and adding checks lowered the score even when
   * nothing about the site had changed, which punishes measuring more. A
   * dashboard that drops when you look harder teaches people not to look.
   *
   * A warning is "worth reading", not "broken", so it earns partial credit.
   * A failure earns none.
   */
  const assessed = checks.filter((check) => check.assessed !== false);
  const earned = assessed.reduce(
    (total, check) => total + (check.status === "pass" ? 1 : check.status === "warn" ? 0.5 : 0),
    0
  );
  const score = assessed.length === 0 ? 0 : Math.round((earned / assessed.length) * 100);
  const overallStatus: SecurityCheckStatus = failCount > 0 ? "fail" : warnCount > 0 || score < 85 ? "warn" : "pass";

  const result: SecurityScanResult = {
    score,
    overallStatus,
    checks,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    trigger: options.trigger,
  };

  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: "SECURITY_SCAN_RUN",
        entityType: "SecurityCenter",
        entityId: options.trigger,
        metadata: toJsonValue({
          score,
          checks: checks.length,
          passCount,
          warnCount,
          failCount,
          overallStatus,
          trigger: options.trigger,
          result,
        }),
      },
    });
  } catch {
    /* Audit logging must not block scan delivery. */
  }

  return result;
}

export function shouldNotifyForScan(result: SecurityScanResult, settings: SecurityCenterSettings) {
  if (!settings.emailAlertsEnabled) return false;
  if (result.overallStatus === "fail") return true;
  return settings.alertOnWarnings && result.overallStatus === "warn";
}
