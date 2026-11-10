import "server-only";
import { botProtectionUpdate, parseBotProtection, type BotProtectionState } from "@/lib/bot-protection-parse";

/**
 * The hosting firewall's bot-protection ruleset, switched from the Security
 * Center. Server-side only: the token never reaches the browser and is never
 * logged. The destination is fixed here, never taken from a request.
 *
 * Needs FIREWALL_API_TOKEN (falls back to VERCEL_FIREWALL_TOKEN) with access
 * to the project; the project and team come from the same settings as the
 * dashboard's traffic figures. DEPLOYMENT.md#bot-protection.
 */

const API = "https://api.vercel.com/v1/security/firewall/config";
const TIMEOUT_MS = 8_000;

function config() {
  const token = (process.env.FIREWALL_API_TOKEN || process.env.VERCEL_FIREWALL_TOKEN)?.trim();
  const projectId = (process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID)?.trim();
  if (!token || !projectId) return null;
  const teamId = (process.env.VERCEL_FIREWALL_TEAM_ID || process.env.VERCEL_ANALYTICS_TEAM_ID)?.trim() || undefined;
  return { token, projectId, teamId };
}

function query(settings: { projectId: string; teamId?: string }) {
  const search = new URLSearchParams({ projectId: settings.projectId });
  if (settings.teamId) search.set("teamId", settings.teamId);
  return search.toString();
}

export function botProtectionConfigured() {
  return config() !== null;
}

export async function readBotProtection(): Promise<BotProtectionState> {
  const settings = config();
  if (!settings) return { state: "not_configured" };
  try {
    const response = await fetch(`${API}/active?${query(settings)}`, {
      headers: { Authorization: `Bearer ${settings.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Unparseable JSON is passed on as itself, not as null, so it reads as
    // "could not be read" rather than as "off".
    const body: unknown = await response.json().catch(() => "unreadable");
    return parseBotProtection(response.status, body);
  } catch (error) {
    console.error("[bot-protection] Could not read the firewall.", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return { state: "unavailable", reason: "The firewall could not be reached." };
  }
}

export type BotProtectionChange =
  | { outcome: "applied" }
  | { outcome: "refused"; message: string }
  /** The request may have reached the firewall; the state shown is the truth. */
  | { outcome: "unconfirmed"; message: string };

/** Turns the ruleset on (challenge) or off. */
export async function setBotProtection(enabled: boolean): Promise<BotProtectionChange> {
  const settings = config();
  if (!settings) return { outcome: "refused", message: "Bot protection is not connected. Add the firewall token first." };
  try {
    const response = await fetch(`${API}?${query(settings)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${settings.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(botProtectionUpdate(enabled)),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return { outcome: "applied" };
    console.error("[bot-protection] Update refused.", { status: response.status });
    if (response.status === 401 || response.status === 403) {
      return { outcome: "refused", message: "The firewall refused the access token." };
    }
    return { outcome: "refused", message: `The firewall refused the change (${response.status}).` };
  } catch (error) {
    console.error("[bot-protection] Update unconfirmed.", { reason: error instanceof Error ? error.name : "unknown" });
    return {
      outcome: "unconfirmed",
      message: "No answer from the firewall, so the change may or may not have applied. Check the state shown before trying again.",
    };
  }
}
