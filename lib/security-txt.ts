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

/**
 * A deliberately strict mailbox, because the value is published as a mailto:
 * URI: letters, digits and . _ + - before the @ (no leading, trailing or double
 * dot), and a real hostname after it. Characters that mean something in a URI
 * (? # % & / and the like) are refused rather than escaped, so a bad CMS value
 * can never publish an ambiguous contact.
 */
const LOCAL = /^[A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*$/;
const LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function isPublishableMailbox(value: string): boolean {
  if (value.length > 254) return false;
  const at = value.lastIndexOf("@");
  if (at <= 0 || at !== value.indexOf("@")) return false;
  const local = value.slice(0, at);
  const labels = value.slice(at + 1).split(".");
  return (
    local.length <= 64 &&
    LOCAL.test(local) &&
    labels.length >= 2 &&
    labels.every((label) => LABEL.test(label)) &&
    /^[A-Za-z]{2,63}$/.test(labels[labels.length - 1])
  );
}

export function buildSecurityTxt(options: {
  /** Candidate contact addresses, best first. Blank or malformed ones are skipped. */
  contacts: Array<string | null | undefined>;
  siteUrl: string;
  now: Date;
}): string | null {
  const contacts = [...new Set(
    options.contacts
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(isPublishableMailbox),
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
