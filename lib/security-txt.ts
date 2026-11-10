/**
 * The site's security.txt (RFC 9116), which tells a researcher who found a
 * vulnerability where to report it.
 *
 * Pure, so the format can be tested without a database.
 */

/**
 * How far ahead `Expires` is set. RFC 9116 recommends less than a year. The
 * file is rebuilt at least hourly from live settings, so the date keeps moving
 * forward while the site is running and only lapses if the site stops being
 * maintained -- which is exactly when a reader should stop trusting it.
 */
export const SECURITY_TXT_LIFETIME_DAYS = 180;

const EMAIL = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]+$/;

export function buildSecurityTxt(options: {
  /** Candidate contact addresses, best first. Blank or malformed ones are skipped. */
  contacts: Array<string | null | undefined>;
  siteUrl: string;
  now: Date;
}): string | null {
  const contacts = [...new Set(
    options.contacts
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => EMAIL.test(value)),
  )];
  // A security.txt with no way to reach anyone is worse than none at all.
  if (contacts.length === 0) return null;

  const expires = new Date(options.now.getTime() + SECURITY_TXT_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
  expires.setUTCMilliseconds(0);

  const lines = [
    ...contacts.map((address) => `Contact: mailto:${address}`),
    `Expires: ${expires.toISOString().replace(".000Z", "Z")}`,
    "Preferred-Languages: en",
    `Canonical: ${options.siteUrl}/.well-known/security.txt`,
  ];
  return `${lines.join("\n")}\n`;
}
