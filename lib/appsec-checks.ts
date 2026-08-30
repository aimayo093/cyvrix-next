/**
 * The application-security checks in the Security Center.
 *
 * Two sources, because the questions differ in kind.
 *
 * Source analysis is precomputed by `npm run scan:code` into
 * `lib/generated/appsec-manifest.json`. A deployed serverless bundle cannot
 * reliably read its own `app/**` tree, so that work happens where the source
 * exists and the result ships with the build.
 *
 * Live probes run during the scan, because the only honest way to answer "is a
 * source map served" or "does /.env respond" is to ask the running site.
 *
 * Every check carries what it examined and what it cannot tell you. A security
 * dashboard that reports a bare pass invites the reader to conclude a whole
 * class of bug is absent, which none of this establishes.
 */
import manifest from "@/lib/generated/appsec-manifest.json";
import { SITE_URL } from "@/lib/structured-data";
import type { SecurityScanCheck, SecurityCheckStatus } from "@/lib/security-scan";

type ManifestFinding = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "unknown";
  method: string;
  detail: string;
  limitation: string;
  evidence: string[];
};

/** "unknown" means not assessed; the analyst surfaces it as a blind spot, not a pass. */
function toStatus(status: ManifestFinding["status"]): SecurityCheckStatus {
  if (status === "pass") return "pass";
  if (status === "fail") return "fail";
  return "warn";
}

function describe(finding: ManifestFinding): string {
  const evidence = finding.evidence.length
    ? ` Files: ${finding.evidence.slice(0, 5).join(", ")}${finding.evidence.length > 5 ? ` and ${finding.evidence.length - 5} more` : ""}.`
    : "";
  return `${finding.detail}${evidence} Method: ${finding.method} Limit: ${finding.limitation}`;
}

/** How old the precomputed analysis is, so a stale manifest is visible. */
export function appSecManifestAge(nowMs: number): { generatedAt: string; ageDays: number } {
  const generatedAt = manifest.generatedAt;
  const ageDays = Math.floor((nowMs - Date.parse(generatedAt)) / 86_400_000);
  return { generatedAt, ageDays };
}

export function staticAppSecChecks(): SecurityScanCheck[] {
  return (manifest.findings as ManifestFinding[]).map((finding) => ({
    id: finding.id,
    label: finding.label,
    status: toStatus(finding.status),
    category: "security" as const,
    // An unanswerable question is not a failing one.
    assessed: finding.status !== "unknown",
    detail:
      finding.status === "unknown"
        ? `Not assessed. ${describe(finding)}`
        : describe(finding),
  }));
}

/**
 * Hosts this probe may reach.
 *
 * The origin it is given is derived from the incoming request, which means the
 * Host header has a say in it — and a scan that can be pointed at an arbitrary
 * host by a header is a request-forgery primitive, however narrow. It needs an
 * administrator and a platform that forwards an unvalidated Host, so it is not
 * a likely attack; it is also not one worth leaving open in a file whose whole
 * purpose is finding this class of thing.
 *
 * Localhost is allowed so the scan works in development.
 */
function isOwnOrigin(url: string): boolean {
  try {
    const { host, protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return false;

    const site = new URL(SITE_URL).host;
    return host === site || host.endsWith(`.${site}`) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  } catch {
    return false;
  }
}

async function probe(url: string, signal: AbortSignal) {
  // Refused before the request is made, not filtered afterwards.
  if (!isOwnOrigin(url)) {
    return { ok: false as const, status: 0, headers: new Headers(), body: "" };
  }

  try {
    const response = await fetch(url, { signal, redirect: "manual" });
    return { ok: true as const, status: response.status, headers: response.headers, body: await response.text().catch(() => "") };
  } catch {
    return { ok: false as const, status: 0, headers: new Headers(), body: "" };
  }
}

/**
 * Checks that can only be answered by asking the running site.
 *
 * `origin` is the deployment's own base URL. Nothing here reaches a third party.
 */
export async function liveAppSecChecks(origin: string, signal: AbortSignal): Promise<SecurityScanCheck[]> {
  const checks: SecurityScanCheck[] = [];

  // ── 36. Exposed source maps ──────────────────────────────────────────────
  // A served .map hands an attacker the original source, including comments
  // and any logic the bundle would otherwise obscure.
  {
    const page = await probe(origin, signal);
    const scriptUrls = [...page.body.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]).slice(0, 3);

    let servedMaps = 0;
    for (const script of scriptUrls) {
      const map = await probe(`${origin}${script}.map`, signal);
      if (map.ok && map.status === 200 && map.body.includes('"sources"')) servedMaps += 1;
    }

    checks.push({
      id: "appsec_source_maps",
      label: "Exposed source maps",
      status: scriptUrls.length === 0 ? "warn" : servedMaps > 0 ? "fail" : "pass",
      category: "security",
      assessed: scriptUrls.length > 0,
      detail:
        scriptUrls.length === 0
          ? "Could not identify any client bundle to test. Not assessed."
          : servedMaps > 0
            ? `${servedMaps} of ${scriptUrls.length} sampled bundles serve a readable source map, which publishes the original source. Method: requested the .map beside each bundle.`
            : `None of the ${scriptUrls.length} sampled client bundles serve a source map. Method: requested the .map beside each bundle. Limit: a sample, not every asset.`,
    });
  }

  // ── 29. Exposed environment and repository files ─────────────────────────
  {
    const paths = ["/.env", "/.env.local", "/.git/config", "/package.json"];
    const exposed: string[] = [];
    for (const target of paths) {
      const response = await probe(`${origin}${target}`, signal);
      if (response.ok && response.status === 200 && response.body.trim().length > 0) exposed.push(target);
    }

    checks.push({
      id: "appsec_exposed_files",
      label: "Exposed environment and repository files",
      status: exposed.length === 0 ? "pass" : "fail",
      category: "security",
      detail:
        exposed.length === 0
          ? `None of ${paths.length} sensitive paths are served: ${paths.join(", ")}.`
          : `Served over HTTP: ${exposed.join(", ")}. Anything here is readable by anyone.`,
    });
  }

  // ── 27. Permissive CORS ──────────────────────────────────────────────────
  {
    const response = await probe(`${origin}/api/subscribe`, signal);
    const allowOrigin = response.headers.get("access-control-allow-origin");
    const credentials = response.headers.get("access-control-allow-credentials");
    const wideOpen = allowOrigin === "*";
    const worst = wideOpen && credentials === "true";

    checks.push({
      id: "appsec_cors",
      label: "Cross-origin resource sharing",
      status: worst ? "fail" : wideOpen ? "warn" : "pass",
      category: "security",
      detail: worst
        ? "A public endpoint returns Access-Control-Allow-Origin: * together with credentials, which lets any site read authenticated responses."
        : wideOpen
          ? "A public endpoint allows any origin. Acceptable for anonymous data, but worth confirming nothing authenticated is served this way."
          : `No permissive CORS header on the sampled endpoint${allowOrigin ? ` (allow-origin: ${allowOrigin})` : ""}. Limit: one endpoint sampled, not every route.`,
    });
  }

  // ── 35. Stack traces in responses ────────────────────────────────────────
  {
    const response = await probe(`${origin}/api/subscribe`, signal);
    const leaks = /at\s+\w+\s+\(|\.tsx?:\d+:\d+|node_modules[\\/]|PrismaClient|stack/i.test(response.body);

    checks.push({
      id: "appsec_error_detail",
      label: "Internal detail in error responses",
      status: leaks ? "fail" : "pass",
      category: "security",
      detail: leaks
        ? "An error response returned a stack trace or internal path. That maps the application's internals for an attacker."
        : "The sampled error response carried no stack trace or internal path. Limit: one endpoint sampled with one malformed request.",
    });
  }

  return checks;
}
