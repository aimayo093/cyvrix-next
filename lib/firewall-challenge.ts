/**
 * The Security Center scans the live site by requesting its own public URL.
 * Those requests go through the hosting platform's firewall like anyone else's,
 * and bot protection answers non-browser clients with a challenge (HTTP 429)
 * before the site is reached.
 *
 * A challenged response says nothing about the site: it carries none of the
 * site's headers, and its body is the firewall's page, not ours. Counting it as
 * a result produced both false failures ("headers missing", "routes erroring")
 * and false passes ("no sensitive files served"). So every scan request:
 *
 *  - sends `x-cyvrix-scan-key` when SECURITY_SCAN_BYPASS_KEY is set, but only
 *    to this deployment's own configured origin, and never across a redirect
 *    to anywhere else (`scanFetch`). A matching firewall rule then bypasses
 *    the firewall for that request (DEPLOYMENT.md);
 *  - reports a challenged response as "not assessed", never pass or fail.
 *
 * The pure parts are exercised by scripts/test-appsec-probes.mts.
 */

export const SCAN_BYPASS_HEADER = "x-cyvrix-scan-key";

/** Shorter values are ignored: a guessable key would open the firewall to anyone. */
export const SCAN_BYPASS_MIN_LENGTH = 32;

type Env = Record<string, string | undefined>;

/** The bypass header, or nothing when no usable key is configured. */
export function scanRequestHeaders(env: Env = process.env): Record<string, string> {
  const key = env.SECURITY_SCAN_BYPASS_KEY?.trim();
  return key && key.length >= SCAN_BYPASS_MIN_LENGTH ? { [SCAN_BYPASS_HEADER]: key } : {};
}

/**
 * The only origins the key may be sent to: this deployment's own, from
 * configuration (never from the request or the CMS), with its www and bare
 * twins. An admin-entered website URL elsewhere never receives the key.
 */
export function trustedScanOrigins(env: Env = process.env): Set<string> {
  const origins = new Set<string>();
  for (const raw of [env.NEXT_PUBLIC_SITE_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const url = new URL(value.startsWith("http") ? value : `https://${value}`);
      if (url.protocol !== "https:") continue;
      const bare = url.hostname.replace(/^www\./, "");
      origins.add(`https://${bare}`);
      origins.add(`https://www.${bare}`);
    } catch {
      // Not a URL: trust nothing from it.
    }
  }
  return origins;
}

/** The bypass header for this exact URL, or nothing if its origin is not trusted. */
export function bypassHeadersFor(url: string, env: Env = process.env): Record<string, string> {
  try {
    return trustedScanOrigins(env).has(new URL(url).origin) ? scanRequestHeaders(env) : {};
  } catch {
    return {};
  }
}

/**
 * fetch for scan requests. The bypass header is added per hop, only for a
 * trusted origin, so a redirect to another host never carries the key.
 * `follow: false` returns the first response, as `redirect: "manual"` would.
 */
export async function scanFetch(
  url: string,
  init: { signal?: AbortSignal; headers?: Record<string, string>; follow?: boolean },
  env: Env = process.env,
): Promise<Response> {
  let current = url;
  for (let hop = 0; ; hop += 1) {
    const response = await fetch(current, {
      signal: init.signal,
      redirect: "manual",
      headers: { ...(init.headers ?? {}), ...bypassHeadersFor(current, env) },
    });
    const location = response.headers.get("location");
    if (!init.follow || response.status < 300 || response.status >= 400 || !location || hop >= 5) return response;
    await response.body?.cancel();
    current = new URL(location, current).toString();
  }
}

/** True when the hosting platform's firewall, not the site, produced this response. */
export function isFirewallChallenge(status: number, headers: Headers): boolean {
  const mitigated = headers.get("x-vercel-mitigated")?.toLowerCase();
  if (mitigated === "challenge" || mitigated === "deny") return true;
  return status === 429 && headers.has("x-vercel-challenge-token");
}

export function firewallBlockedDetail(what: string, keyConfigured: boolean, status?: number): string {
  const code = status ? ` (HTTP ${status})` : "";
  return (
    `Not assessed. The hosting platform's firewall stopped the scan's request${code} before it reached the site, so ${what} could not be checked. ` +
    (keyConfigured
      ? "The scan sent its bypass header, so check that the firewall rule for x-cyvrix-scan-key is published, its value matches SECURITY_SCAN_BYPASS_KEY, and NEXT_PUBLIC_SITE_URL names this site."
      : "Set SECURITY_SCAN_BYPASS_KEY and add the matching firewall rule (DEPLOYMENT.md), then re-run the scan.")
  );
}
