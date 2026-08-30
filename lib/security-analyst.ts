import "server-only";

import { prisma } from "@/lib/prisma";
import { companyFacts, daysUntilIcoExpiry } from "@/lib/company-facts";
import { getAuthActivity, type AuthActivitySummary } from "@/lib/security-events";
import type { SecurityScanCheck, SecurityScanResult } from "@/lib/security-scan";

/**
 * The analyst layer over the raw security scan.
 *
 * The scan answers "did this check pass?". This layer answers the questions an
 * analyst actually needs: how serious is it, what does it mean, what should be
 * done, and what should be done first.
 *
 * Every finding here is derived from a real check or real audit data. Nothing
 * is simulated, and an unavailable signal is reported as unknown rather than
 * as a pass.
 */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export type AnalystFinding = {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  /** What the check actually observed. */
  observation: string;
  /** Why it matters, in terms a non-specialist can act on. */
  impact: string;
  /** The concrete next step. */
  remediation: string;
  /** True when the underlying signal could not be read at all. */
  unknown?: boolean;
};

export type PostureBand = "healthy" | "attention" | "at-risk" | "unknown";

/** How old the underlying scan is, so stale data is never read as current. */
export type ScanFreshness = {
  ageHours: number;
  /** True once the scan is old enough that findings may no longer reflect reality. */
  stale: boolean;
  /** Human phrase such as "14 minutes ago". */
  label: string;
};

export type AnalystReport = {
  generatedAt: string;
  freshness: ScanFreshness;
  /** Highest severity present among open findings. */
  highestSeverity: Severity | null;
  band: PostureBand;
  counts: Record<Severity, number>;
  findings: AnalystFinding[];
  /** Findings that need action, most serious first. */
  triage: AnalystFinding[];
  passing: number;
  authActivity: AuthActivitySummary;
  /** Signals the analyst could not read on this run. */
  blindSpots: string[];
};

/**
 * Severity and guidance for each known scan check. A check absent from this map
 * still produces a finding, but at a conservative default severity.
 */
const CHECK_GUIDANCE: Record<
  string,
  { failSeverity: Severity; warnSeverity: Severity; impact: string; remediation: string }
> = {
  db: {
    failSeverity: "critical",
    warnSeverity: "high",
    impact: "Public pages fall back to static content and no CMS change can be saved while the database is unreachable.",
    remediation: "Check the database host, credentials and connection pool limits, then re-run the scan.",
  },
  env: {
    failSeverity: "critical",
    warnSeverity: "high",
    impact: "A missing environment variable can disable authentication, database access or integrations without an obvious error.",
    remediation: "Set the missing variables in the server environment and redeploy. Never commit them to the repository.",
  },
  sec_auth_secret: {
    failSeverity: "critical",
    warnSeverity: "high",
    impact: "Session tokens are signed with this secret. A weak or default value would let an attacker forge an administrator session.",
    remediation: "Generate a random secret of at least 32 characters, set AUTH_SECRET in the server environment and redeploy. Existing sessions will be invalidated.",
  },
  sec_headers: {
    failSeverity: "high",
    warnSeverity: "medium",
    impact: "Security headers are the browser-side defence against clickjacking, content-type confusion and injected scripts.",
    remediation: "Review the securityHeaders array in next.config.ts and confirm the deployment platform is not stripping them.",
  },
  sec_rls: {
    failSeverity: "high",
    warnSeverity: "high",
    impact: "Without row-level security a table is protected only by application code. Any direct API access bypasses those checks.",
    remediation: "Enable RLS on the listed tables and add policies that match the application's access rules.",
  },
  sec_privilege: {
    failSeverity: "high",
    warnSeverity: "medium",
    impact: "Every additional Super Admin is another account that can change anything, including audit settings.",
    remediation: "Review the Super Admin list and downgrade anyone who does not need full control.",
  },
  dep_outdated: {
    failSeverity: "medium",
    warnSeverity: "low",
    impact: "Outdated dependencies are the most common route to a known, published vulnerability.",
    remediation: "Review the outdated packages, upgrade in a branch and run the build and tests before deploying.",
  },
  dep_inventory: {
    failSeverity: "low",
    warnSeverity: "low",
    impact: "The dependency inventory could not be read, so package risk cannot be assessed.",
    remediation: "Confirm package.json is readable by the running process.",
  },
  website_routes: {
    failSeverity: "high",
    warnSeverity: "medium",
    impact: "A monitored public route that does not respond is either broken for visitors or misconfigured.",
    remediation: "Open the failing routes directly and check the server logs for the corresponding request.",
  },
  website_base_url: {
    failSeverity: "low",
    warnSeverity: "low",
    impact: "Without a canonical site URL the scan cannot check public routes, and signed links may be generated incorrectly.",
    remediation: "Set the site URL in Security Centre settings, and NEXT_PUBLIC_SITE_URL in the environment.",
  },
  audit: {
    failSeverity: "high",
    warnSeverity: "medium",
    impact: "The audit log is the record of who changed what. Without it, administrative activity cannot be reconstructed.",
    remediation: "Confirm the audit_log table is present and writable by the application role.",
  },
  tickets: {
    failSeverity: "low",
    warnSeverity: "info",
    impact: "A growing ticket queue is an operational signal rather than a security weakness.",
    remediation: "Review the open queue in Ticket Management and reassign or close where appropriate.",
  },
};

const DEFAULT_GUIDANCE = {
  failSeverity: "medium" as Severity,
  warnSeverity: "low" as Severity,
  impact: "This check did not pass. Its effect on the platform has not been individually classified.",
  remediation: "Review the check detail and confirm whether the underlying configuration is intentional.",
};

/**
 * What to say about a question that was never answered.
 *
 * A check carrying assessed: false reaches here with warn as its nearest
 * status, so it was picking up DEFAULT_GUIDANCE and being told to the reader as
 * "this check did not pass", ranked among the things to work through, with a
 * next step asking them to confirm the configuration was intentional. There is
 * nothing to confirm. "No inbound webhook endpoint exists" is not a fault, and
 * putting it in a numbered queue of work spends the reader's attention on the
 * items that are not real and buries the one that is.
 */
/*
 * Deliberately not added to blindSpots. bandFor degrades the posture band to
 * "Incomplete picture" whenever a blind spot exists, and these two conditions -
 * no self-service password reset, no inbound webhook - cannot ever clear. A
 * banner that can never go green is one people stop reading, which is the same
 * failure that had overallStatus pinned at warn. They stay visible as findings
 * carrying a Not assessed badge, which is where a reader would look for them.
 */
const NOT_ASSESSED_GUIDANCE = {
  impact:
    "This question could not be answered, so it is a gap in what the scan can tell you rather than a fault to fix.",
  remediation:
    "Nothing to action. If the underlying feature is added later, re-run the scan so the question becomes answerable.",
};

function severityForCheck(check: SecurityScanCheck): Severity {
  // Not assessed is not a finding. It leaves the triage queue and is carried
  // as a blind spot instead, where the reader can see what went unexamined.
  if (check.assessed === false) return "info";

  const guidance = CHECK_GUIDANCE[check.id] ?? DEFAULT_GUIDANCE;
  if (check.status === "fail") return guidance.failSeverity;
  if (check.status === "warn") return guidance.warnSeverity;
  return "info";
}

function toFinding(check: SecurityScanCheck): AnalystFinding {
  const unknown = check.assessed === false;
  const guidance = unknown ? NOT_ASSESSED_GUIDANCE : CHECK_GUIDANCE[check.id] ?? DEFAULT_GUIDANCE;
  return {
    id: check.id,
    title: check.label,
    severity: severityForCheck(check),
    category: check.category,
    observation: check.detail,
    impact: guidance.impact,
    remediation: guidance.remediation,
    unknown,
  };
}

/** Account-hygiene checks that the raw scan does not cover. */
async function accountHygieneFindings(): Promise<{ findings: AnalystFinding[]; blindSpots: string[] }> {
  const findings: AnalystFinding[] = [];
  const blindSpots: string[] = [];

  const adminRoles = ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT", "SALES_CRM_USER", "CONTENT_MANAGER", "FINANCE_VIEWER"] as const;

  try {
    const [withoutMfa, unverified] = await Promise.all([
      prisma.user.count({ where: { active: true, role: { in: [...adminRoles] }, twoFactorReady: false } }),
      prisma.user.count({ where: { active: true, role: { in: [...adminRoles] }, emailVerified: null } }),
    ]);

    findings.push({
      id: "acct_mfa",
      title: "Multi-factor readiness on staff accounts",
      severity: withoutMfa > 0 ? "high" : "info",
      category: "security",
      observation:
        withoutMfa > 0
          ? `${withoutMfa} active staff account${withoutMfa > 1 ? "s are" : " is"} not marked ready for multi-factor authentication.`
          : "All active staff accounts are marked ready for multi-factor authentication.",
      impact: "A password alone is the single control protecting an administrative account from a credential-stuffing attempt.",
      remediation: "Enrol the remaining staff accounts in multi-factor authentication and set twoFactorReady once enrolment is confirmed.",
    });

    findings.push({
      id: "acct_verified",
      title: "Email verification on staff accounts",
      severity: unverified > 0 ? "medium" : "info",
      category: "security",
      observation:
        unverified > 0
          ? `${unverified} active staff account${unverified > 1 ? "s have" : " has"} no verified email address on record.`
          : "All active staff accounts have a verified email address.",
      impact: "Password reset and security notifications depend on a mailbox that is known to belong to the account holder.",
      remediation: "Complete email verification for the affected accounts, or deactivate any that are no longer in use.",
    });
  } catch {
    blindSpots.push("Staff account hygiene (multi-factor readiness and email verification) could not be read from the database.");
  }

  return { findings, blindSpots };
}

/** Authentication pressure derived from real audit-log events. */
function authFindings(activity: AuthActivitySummary): { findings: AnalystFinding[]; blindSpots: string[] } {
  if (!activity.available) {
    return {
      findings: [
        {
          id: "auth_activity",
          title: "Authentication activity",
          severity: "medium",
          category: "security",
          observation: "Authentication events could not be read from the audit log.",
          impact: "Without sign-in telemetry, a brute-force or credential-stuffing attempt would not be visible here.",
          remediation: "Confirm the audit log is readable, then re-run the scan.",
          unknown: true,
        },
      ],
      blindSpots: ["Authentication activity could not be read from the audit log."],
    };
  }

  const { failedSignIns, throttledSignIns, topSourceFailures, distinctFailureSources, windowHours } = activity;

  let severity: Severity = "info";
  if (throttledSignIns > 0 || topSourceFailures >= 10) severity = "high";
  else if (failedSignIns >= 20 || topSourceFailures >= 5) severity = "medium";
  else if (failedSignIns > 0) severity = "low";

  const observation =
    failedSignIns === 0 && throttledSignIns === 0
      ? `No failed or throttled sign-in attempts recorded in the last ${windowHours} hours.`
      : `${failedSignIns} failed sign-in attempt${failedSignIns === 1 ? "" : "s"} from ${distinctFailureSources} source address${distinctFailureSources === 1 ? "" : "es"} in the last ${windowHours} hours` +
        (throttledSignIns > 0 ? `, and ${throttledSignIns} attempt${throttledSignIns === 1 ? " was" : "s were"} rate-limited.` : ".") +
        (topSourceFailures >= 5 ? ` The most active source accounted for ${topSourceFailures} of them.` : "");

  return {
    findings: [
      {
        id: "auth_activity",
        title: "Authentication activity",
        severity,
        category: "security",
        observation,
        impact: "Repeated failures from one source, or attempts that hit the rate limiter, indicate someone is trying to guess credentials.",
        remediation:
          severity === "info"
            ? "No action needed. Keep sign-in telemetry enabled so a change in pattern is visible."
            : "Review the audit log for the source addresses involved, confirm the targeted accounts are legitimate, and consider blocking the source at the edge if attempts continue.",
      },
    ],
    blindSpots: [],
  };
}

/**
 * The ICO data protection fee registration must be renewed annually. A lapsed
 * registration is a compliance breach and would also force the reference to be
 * withdrawn from the privacy policy and Trust Centre, so it is worth surfacing
 * well before the date.
 */
function icoRegistrationFinding(): AnalystFinding {
  const days = daysUntilIcoExpiry();
  const expires = companyFacts.icoRegistrationExpires;

  let severity: Severity = "info";
  if (days < 0) severity = "high";
  else if (days <= 30) severity = "medium";
  else if (days <= 60) severity = "low";

  return {
    id: "ico_registration",
    title: "ICO data protection fee registration",
    severity,
    category: "compliance",
    observation:
      days < 0
        ? `The registration (${companyFacts.icoRegistrationNumber}) lapsed on ${expires}.`
        : `Registration ${companyFacts.icoRegistrationNumber} is current and renews by ${expires}, ${days} day${days === 1 ? "" : "s"} from now.`,
    impact:
      "Paying the data protection fee is a legal requirement for organisations processing personal data. A lapsed registration is a compliance breach, and the reference must be withdrawn from the privacy policy and Trust Centre until it is renewed.",
    remediation:
      days < 0
        ? "Renew the registration with the ICO immediately, then confirm the reference and new expiry in lib/company-facts.ts."
        : `Renew before ${expires} and update icoRegistrationExpiresIso in lib/company-facts.ts once the new period is confirmed.`,
  };
}

/** A scan older than this may no longer describe the current state. */
const STALE_AFTER_HOURS = 24;

function describeFreshness(generatedAt: string, now: Date): ScanFreshness {
  const ageMs = now.getTime() - new Date(generatedAt).getTime();
  const ageHours = ageMs / (60 * 60 * 1000);

  const minutes = Math.round(ageMs / 60000);
  let label: string;
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  else if (ageHours < 48) {
    const hours = Math.round(ageHours);
    label = `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else {
    const days = Math.round(ageHours / 24);
    label = `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return { ageHours, stale: ageHours >= STALE_AFTER_HOURS, label };
}

function bandFor(highest: Severity | null, blindSpots: number): PostureBand {
  if (highest === "critical" || highest === "high") return "at-risk";
  if (highest === "medium") return "attention";
  if (blindSpots > 0) return "unknown";
  return "healthy";
}

/**
 * Produces the analyst report from a completed scan. The scan supplies the
 * technical checks; this adds account hygiene and authentication activity,
 * classifies everything by severity and orders it for triage.
 */
export async function buildAnalystReport(scan: SecurityScanResult): Promise<AnalystReport> {
  const scanFindings = scan.checks.map(toFinding);
  const [hygiene, activity] = await Promise.all([accountHygieneFindings(), getAuthActivity(24)]);
  const auth = authFindings(activity);

  const findings = [...scanFindings, ...hygiene.findings, ...auth.findings, icoRegistrationFinding()];
  const blindSpots = [...hygiene.blindSpots, ...auth.blindSpots];


  const counts = SEVERITY_ORDER.reduce(
    (acc, severity) => ({ ...acc, [severity]: findings.filter((f) => f.severity === severity).length }),
    {} as Record<Severity, number>
  );

  const triage = findings
    .filter((finding) => finding.severity !== "info")
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  const highestSeverity = triage.length > 0 ? triage[0].severity : null;

  const freshness = describeFreshness(scan.timestamp, new Date());
  if (freshness.stale) {
    blindSpots.push(
      `These findings come from a scan run ${freshness.label}. Re-run the scan to confirm they still reflect the current state.`
    );
  }

  return {
    generatedAt: scan.timestamp,
    freshness,
    highestSeverity,
    band: bandFor(highestSeverity, blindSpots.length),
    counts,
    findings,
    triage,
    passing: findings.filter((finding) => finding.severity === "info" && !finding.unknown).length,
    authActivity: activity,
    blindSpots,
  };
}
