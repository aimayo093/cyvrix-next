/**
 * The Security Center scans the live site by requesting its own public URL.
 * Those requests go through the hosting platform's firewall like anyone else's, and bot
 * protection answers non-browser clients with a challenge (HTTP 429), before
 * the site is reached.
 *
 * A challenged response says nothing about the site: it carries none of the
 * site's headers, and its body is the firewall's page, not ours. Counting it as a
 * result produced both false failures ("headers missing", "routes erroring")
 * and false passes ("no sensitive files served"). So every scan request:
 *
 *  - sends `x-cyvrix-scan-key` when SECURITY_SCAN_BYPASS_KEY is set, which a
 *    firewall rule matches to let the scan through (DEPLOYMENT.md); and
 *  - reports a challenged response as "not assessed", never pass or fail.
 *
 * Pure: no I/O, so scripts/test-appsec-probes.mts can exercise it.
 */

export const SCAN_BYPASS_HEADER = "x-cyvrix-scan-key";

/** Shorter values are ignored: a guessable key would open the firewall to anyone. */
export const SCAN_BYPASS_MIN_LENGTH = 32;

export function scanRequestHeaders(env: Record<string, string | undefined> = process.env): Record<string, string> {
  const key = env.SECURITY_SCAN_BYPASS_KEY?.trim();
  return key && key.length >= SCAN_BYPASS_MIN_LENGTH ? { [SCAN_BYPASS_HEADER]: key } : {};
}

/** True when the hosting platform's firewall, not the site, produced this response. */
export function isFirewallChallenge(status: number, headers: Headers): boolean {
  const mitigated = headers.get("x-vercel-mitigated")?.toLowerCase();
  if (mitigated === "challenge" || mitigated === "deny") return true;
  return status === 429 && headers.has("x-vercel-challenge-token");
}

export function firewallBlockedDetail(what: string, keyConfigured: boolean): string {
  return (
    `Not assessed. The hosting platform's firewall challenged the scan's request (HTTP 429) before it reached the site, so ${what} could not be checked. ` +
    (keyConfigured
      ? "The scan sent its bypass header, so check that the firewall rule for x-cyvrix-scan-key is published and its value matches SECURITY_SCAN_BYPASS_KEY."
      : "Set SECURITY_SCAN_BYPASS_KEY and add the matching firewall rule (DEPLOYMENT.md), then re-run the scan.")
  );
}
