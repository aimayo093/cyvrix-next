/**
 * Reading and writing the hosting firewall's bot-protection ruleset, without
 * the network, so the shapes are tested (npm run test:appsec).
 *
 * The ruleset challenges suspicious traffic with a JavaScript check: browsers
 * pass it without noticing, scripts and automated attacks do not.
 */

export type BotProtectionState =
  | { state: "on" | "off"; mode: "challenge" | "deny" | "log" | null; updatedAt: string | null }
  | { state: "not_configured" }
  /** The firewall has no configuration for this project yet (or the ids are wrong). */
  | { state: "no_firewall_config" }
  | { state: "unavailable"; reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The active firewall configuration's `managedRules.bot_protection`.
 * Logging alone is reported as off: it records bots but stops none.
 */
export function parseBotProtection(status: number, json: unknown): BotProtectionState {
  // A 404 can mean "no configuration yet" or a wrong project or team id. It is
  // not shown as "off"; the card says which it might be, and still lets a new
  // project be switched on (the first change creates the configuration).
  if (status === 404) return { state: "no_firewall_config" };
  if (status === 401 || status === 403) return { state: "unavailable", reason: "The access token was refused." };
  if (status < 200 || status >= 300) return { state: "unavailable", reason: `The firewall answered ${status}.` };
  if (!isRecord(json)) return { state: "unavailable", reason: "The firewall's answer could not be read." };

  if (json.managedRules !== undefined && !isRecord(json.managedRules)) {
    return { state: "unavailable", reason: "The firewall's managed rules could not be read." };
  }
  const rule = isRecord(json.managedRules) ? json.managedRules.bot_protection : undefined;
  // A readable configuration with no bot ruleset in it: the ruleset is off.
  if (rule === undefined) return { state: "off", mode: null, updatedAt: null };
  if (!isRecord(rule)) return { state: "unavailable", reason: "The bot-protection setting could not be read." };

  const mode = rule.action === "challenge" || rule.action === "deny" || rule.action === "log" ? rule.action : null;
  if (rule.active === true && mode === null) {
    return { state: "unavailable", reason: "Bot protection is active in a mode this page does not recognise." };
  }
  const updatedAt = typeof rule.updatedAt === "string" && !Number.isNaN(Date.parse(rule.updatedAt)) ? rule.updatedAt : null;
  const active = rule.active === true && mode !== "log";
  return { state: active ? "on" : "off", mode, updatedAt };
}

/** The PATCH body that turns the ruleset on (challenge) or off. */
export function botProtectionUpdate(enabled: boolean) {
  return {
    action: "managedRules.update",
    id: "bot_protection",
    value: { active: enabled, action: "challenge" },
  } as const;
}
