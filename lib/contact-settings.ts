export const publicContactSettingKeys = [
  "salesEmail",
  "supportEmail",
  "phone",
  "phoneHours",
  "hqAddress",
  "hqDetails",
] as const;

export type PublicContactSettingKey = (typeof publicContactSettingKeys)[number];

const legacyContactDefaults = new Set([
  "sales@cyvrix.co.uk",
  "support@cyvrix.co.uk",
  "+44 (0) 20 8080 8080",
  "city of london, uk",
  "mon-fri: 8am - 6pm",
  "secure site operations",
]);

export function publicContactValue(value: unknown): string {
  if (typeof value !== "string") return "";

  const normalized = value.trim();
  if (!normalized || /set in admin|configured in admin|placeholder|example/i.test(normalized)) return "";

  return legacyContactDefaults.has(normalized.toLowerCase()) ? "" : normalized;
}

export function toPublicContactSettings(value: unknown): Record<PublicContactSettingKey, string> {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return Object.fromEntries(
    publicContactSettingKeys.map((key) => [key, publicContactValue(source[key])]),
  ) as Record<PublicContactSettingKey, string>;
}
