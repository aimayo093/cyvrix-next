export const publicContactSettingKeys = [
  "salesEmail",
  "supportEmail",
  "phone",
  "phoneHours",
  "hqAddress",
  "hqDetails",
] as const;

export type PublicContactSettingKey = (typeof publicContactSettingKeys)[number];

/**
 * Values the site once shipped as invented defaults, and must not republish.
 *
 * Each of these was a claim nobody could evidence: a London telephone number
 * that rings nowhere, a "City of London" location for a company registered in
 * Neath, opening hours nobody committed to, and a line of filler.
 *
 * **The two email addresses that used to be on this list are not here.**
 * `sales@` and `support@` at the company's own domain are a different kind of
 * thing: an address either routes or it does not, it is the administrator's to
 * set, and blocking them made the correct value impossible to enter. Trying to
 * save `support@cyvrix.co.uk` threw, and a thrown server action is an error
 * page — so the field could not be filled in and nothing said why.
 *
 * The test that an address is real is that mail to it arrives, which no
 * deny-list can determine. That judgement belongs to whoever types it.
 */
const fabricatedContactDefaults = new Set([
  "+44 (0) 20 8080 8080",
  "city of london, uk",
  "mon-fri: 8am - 6pm",
  "secure site operations",
]);

export function publicContactValue(value: unknown): string {
  if (typeof value !== "string") return "";

  const normalized = value.trim();
  if (!normalized || /set in admin|configured in admin|placeholder|example/i.test(normalized)) return "";

  return fabricatedContactDefaults.has(normalized.toLowerCase()) ? "" : normalized;
}

/**
 * Why a value was rejected, in words an administrator can act on.
 *
 * Returns null when the value is fine. The save path uses this to explain the
 * refusal rather than throwing, because a rejected contact detail is an
 * ordinary thing to get wrong and should not look like a crash.
 */
export function contactValueProblem(key: string, value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (/set in admin|configured in admin|placeholder|example/i.test(normalized)) {
    return `The ${key} still contains placeholder text. Enter the real value or leave it blank.`;
  }
  if (fabricatedContactDefaults.has(normalized.toLowerCase())) {
    return (
      `"${normalized}" is one of the invented defaults this site used to publish — ` +
      `it was never a real contact detail. Enter the genuine one or leave the field blank.`
    );
  }
  return null;
}

export function toPublicContactSettings(value: unknown): Record<PublicContactSettingKey, string> {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return Object.fromEntries(
    publicContactSettingKeys.map((key) => [key, publicContactValue(source[key])]),
  ) as Record<PublicContactSettingKey, string>;
}
