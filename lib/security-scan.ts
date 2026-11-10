import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@/generated/prisma";
import { appSecManifestAge, liveAppSecChecks, staticAppSecChecks } from "@/lib/appsec-checks";
import { prisma } from "@/lib/prisma";
import { cleanVersion, heldBackBy, upgradeTarget, type DependencyHold } from "@/lib/dependency-freshness";
import dependencyHolds from "@/lib/generated/dependency-holds.json";
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
  /**
   * True when the scan looked and the feature does not exist, so there is
   * nothing to test. Always with `assessed: false`; shown as "Not applicable",
   * not as a blind spot. `status` is then meaningless and ignored.
   */
  notApplicable?: boolean;
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

/**
 * The `latest` document only, a few kilobytes. The full packument runs to
 * megabytes for packages like Prisma and timed out, and a timed-out package
 * used to drop out of the count silently.
 */
function registryUrl(packageName: string) {
  return `https://registry.npmjs.org/${encodeURIComponent(packageName).replaceAll("%2F", "%2f")}/latest`;
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

    const nodeMajor = Number(process.versions.node.split(".")[0]);
    type Outcome = { name: string; current: string; target: string } | "current" | "unreachable";
    const results: Outcome[] = await Promise.all(
      entries.map(async ([name, current]): Promise<Outcome> => {
        const request = withTimeout(4000);
        try {
          const response = await fetch(registryUrl(name), { signal: request.controller.signal });
          if (!response.ok) return "unreachable";
          const data = (await response.json()) as { version?: string };
          if (!data.version) return "unreachable";
          const target = upgradeTarget(name, current, data.version, nodeMajor);
          return target ? { name, current, target } : "current";
        } catch {
          return "unreachable";
        } finally {
          request.done();
        }
      }),
    );

    const behind = results.filter((result): result is Exclude<Outcome, string> => typeof result === "object");
    // A newer major that an installed package's peer range does not admit
    // cannot be adopted yet. It is listed with what holds it, not counted as
    // outdated: there is no action to take, and npm audit in CI still blocks
    // any package with a known vulnerability.
    const holdsFor = (dependencyHolds as { holds: Record<string, DependencyHold[]> }).holds;
    const heldBack = behind
      .map((item) => ({ ...item, holders: heldBackBy(item.target, holdsFor[item.name]) }))
      .filter((item) => item.holders.length > 0);
    const outdated = behind.filter((item) => !heldBack.some((held) => held.name === item.name));
    const held = heldBack.length
      ? ` Held back, not yet adoptable: ${heldBack
          .map((item) => {
            // Each holder with its own ceiling, so one package's limit is not
            // attributed to another.
            const ceilingFor = new Map<string, number>();
            for (const hold of item.holders) ceilingFor.set(hold.by, Math.min(ceilingFor.get(hold.by) ?? Infinity, hold.maxMajor));
            const named = [...ceilingFor].map(([by, max]) => `${by} up to ${max}.x`);
            const ceiling = Math.min(...ceilingFor.values());
            return `${item.name} ${item.target} (${named.slice(0, 2).join(", ")}${named.length > 2 ? ` and ${named.length - 2} more` : ""}; newer ${ceiling}.x releases are not checked)`;
          })
          .join("; ")}.`
      : "";
    // A package the registry did not answer for is unknown, not up to date.
    const unreachable = entries.filter((_, index) => results[index] === "unreachable").map(([name]) => name);
    const unknown = unreachable.length
      ? ` ${unreachable.length} could not be checked (the registry did not answer): ${unreachable.slice(0, 5).join(", ")}${unreachable.length > 5 ? ", ..." : ""}.`
      : "";
    checks.push({
      id: "dep_outdated",
      label: "Outdated Dependencies",
      status: outdated.length || unreachable.length ? "warn" : "pass",
      category: "dependencies",
      assessed: unreachable.length < entries.length,
      detail:
        (unreachable.length === entries.length
          ? "No package could be checked."
          : outdated.length
          ? `${outdated.length} package${outdated.length === 1 ? "" : "s"} appear outdated: ${outdated
              .slice(0, 8)
              .map((item) => `${item.name} ${item.current} -> ${item.target}`)
              .join(", ")}${outdated.length > 8 ? ", ..." : ""}.`
          : `${entries.length - unreachable.length - heldBack.length} of ${entries.length} direct packages are on their latest release.`) +
        held +
        unknown +
        " Method: compared each declared version with the npm registry's latest release, and with the peer ranges installed packages declare (recorded at build). Limit: pre-releases are ignored, and @types/node is compared with the Node.js runtime, not the newest Node.",
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
      assessed: false,
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

  const passCount = checks.filter((check) => check.assessed !== false && check.status === "pass").length;
  // Only answered questions count. An unanswered check used to be stored as a
  // warning and counted here, so a site with nothing wrong still reported
  // "found warnings" and raised a notification on every scheduled scan.
  const failCount = checks.filter((check) => check.assessed !== false && check.status === "fail").length;
  const warnCount = checks.filter((check) => check.assessed !== false && check.status === "warn").length;

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

function isScanRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStoredCheck(value: unknown): boolean {
  if (!isScanRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.detail === "string" &&
    typeof value.category === "string" &&
    (value.status === "pass" || value.status === "warn" || value.status === "fail") &&
    (value.assessed === undefined || typeof value.assessed === "boolean") &&
    (value.notApplicable === undefined || typeof value.notApplicable === "boolean")
  );
}

/**
 * The scan result stored in a SECURITY_SCAN_RUN audit entry's metadata, or
 * null when the entry is missing, malformed or from an older format. Shared
 * by the Security Centre and the admin Today dashboard.
 */
export function readScanResult(metadata: unknown): SecurityScanResult | null {
  let value: unknown = metadata;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const result = isScanRecord(value) ? value.result : undefined;
  if (!isScanRecord(result) || !Array.isArray(result.checks)) return null;
  if (typeof result.score !== "number" || typeof result.durationMs !== "number" || typeof result.timestamp !== "string") return null;
  if (result.overallStatus !== "pass" && result.overallStatus !== "warn" && result.overallStatus !== "fail") return null;
  if (result.trigger !== "manual" && result.trigger !== "background") return null;
  // Every check is validated too: one malformed element in a stored scan would
  // otherwise reach the analyst and the dashboard as if it were well formed.
  if (!result.checks.every(isStoredCheck)) return null;
  return result as unknown as SecurityScanResult;
}
