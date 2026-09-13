/**
 * The third-party services the site may load, and nothing else.
 *
 * The request was a way to add things like analytics and verification tags
 * through the CMS instead of editing code. The obvious version of that is a box
 * that accepts a pasted script, and this deliberately is not that:
 *
 *  - A pasted script is arbitrary code running in every visitor's browser, so
 *    anyone who reaches the admin - or takes over an admin account - could skim
 *    the contact form or rewrite the page. The account security built elsewhere
 *    in this codebase would be one pasted tag away from not mattering.
 *  - It could not run anyway without opening script-src to any host, which is
 *    the part of the Content-Security-Policy doing the actual work.
 *
 * So each service is defined here, in code, and an administrator supplies only
 * the identifier the service issues - a measurement ID, a verification token.
 * Every identifier is checked against a pattern that cannot contain markup,
 * quotes or whitespace, when it is saved and again when it is read, so a value
 * edited directly in the database is dropped rather than rendered.
 *
 * This file has no imports on purpose. next.config.ts reads the script sources
 * to build the policy and the browser bundle reads the patterns, so it must not
 * pull in Prisma, server-only code or anything with side effects.
 *
 * The policy allows every service listed here, not only the enabled ones. A
 * per-request policy needs a nonce, and the Next.js docs for this version state
 * nonces are incompatible with Partial Prerendering, which every public page
 * uses. The trade: a disabled service's host is permitted, but nothing refers to
 * it unless it is enabled, and nothing enabled loads before the visitor allows
 * that consent category.
 *
 * Google Tag Manager is left out on purpose. A Tag Manager container can run
 * custom HTML tags, which makes it a pasted-script box hosted somewhere else,
 * and allowing its loader is a known way around a Content-Security-Policy.
 * Google Analytics is allowed through the gtag path only, not the whole host.
 *
 * Adding a service means adding an entry below with its pattern, its script
 * sources and the cookies it sets, then a render case in ThirdPartyScripts.
 */

export type IntegrationCategory = "verification" | "analytics";

export type IntegrationId =
  | "google-site-verification"
  | "bing-site-verification"
  | "google-analytics"
  | "microsoft-clarity"
  | "plausible";

export type IntegrationDefinition = {
  id: IntegrationId;
  name: string;
  provider: string;
  category: IntegrationCategory;
  /** What the service does, shown in the admin and on the cookie policy. */
  purpose: string;
  fieldLabel: string;
  example: string;
  /** Anchored, stateless, and unable to match markup, quotes or whitespace. */
  pattern: RegExp;
  formatHint: string;
  whereToFind: string;
  /** Script sources the Content-Security-Policy must allow. https only. */
  scriptSources: readonly string[];
  /**
   * Cookies the service sets on this domain, named for the cookie policy. A name
   * containing "<" stands for a family and matches by the prefix before it.
   */
  cookies: readonly string[];
  privacyUrl: string;
};

export const INTEGRATIONS: readonly IntegrationDefinition[] = [
  {
    id: "google-site-verification",
    name: "Google Search Console",
    provider: "Google",
    category: "verification",
    purpose:
      "Proves to Google Search Console that you control this domain, so indexing and search performance reports become available.",
    fieldLabel: "Verification token",
    example: "abc123DEF456ghi789JKL012mno345PQR678stu901v",
    pattern: /^[A-Za-z0-9_-]{20,100}$/,
    formatHint: "The content value only, not the whole meta tag.",
    whereToFind: "In Search Console, add the property and choose the HTML tag method, then copy the content value.",
    scriptSources: [],
    cookies: [],
    privacyUrl: "https://policies.google.com/privacy",
  },
  {
    id: "bing-site-verification",
    name: "Bing Webmaster Tools",
    provider: "Microsoft",
    category: "verification",
    purpose: "Proves to Bing Webmaster Tools that you control this domain.",
    fieldLabel: "Verification token",
    example: "0123456789ABCDEF0123456789ABCDEF",
    pattern: /^[A-Fa-f0-9]{32}$/,
    formatHint: "32 characters: the letters A to F and digits.",
    whereToFind: "In Bing Webmaster Tools, add the site and choose the HTML meta tag method, then copy the content value.",
    scriptSources: [],
    cookies: [],
    privacyUrl: "https://privacy.microsoft.com/privacystatement",
  },
  {
    id: "google-analytics",
    name: "Google Analytics 4",
    provider: "Google",
    category: "analytics",
    purpose: "Measures visits, the pages viewed and where visitors came from.",
    fieldLabel: "Measurement ID",
    example: "G-ABC123DEF4",
    pattern: /^G-[A-Z0-9]{6,12}$/,
    formatHint: "Starts with G- followed by capital letters and digits.",
    whereToFind: "In Google Analytics, open Admin, then Data streams, then your web stream.",
    scriptSources: ["https://www.googletagmanager.com/gtag/js"],
    cookies: ["_ga", "_ga_<measurement ID>"],
    privacyUrl: "https://policies.google.com/privacy",
  },
  {
    id: "microsoft-clarity",
    name: "Microsoft Clarity",
    provider: "Microsoft",
    category: "analytics",
    purpose: "Records how pages are used - clicks, scrolling and movement - as heatmaps and session replays.",
    fieldLabel: "Project ID",
    example: "abcde12345",
    pattern: /^[a-z0-9]{6,20}$/,
    formatHint: "Lower-case letters and digits.",
    whereToFind: "In Clarity, open your project's settings. Set masking to Strict there as well, so typed text is never recorded.",
    scriptSources: ["https://www.clarity.ms/tag/", "https://scripts.clarity.ms/"],
    cookies: ["_clck", "_clsk"],
    privacyUrl: "https://privacy.microsoft.com/privacystatement",
  },
  {
    id: "plausible",
    name: "Plausible Analytics",
    provider: "Plausible Insights",
    category: "analytics",
    purpose: "Counts visits and pages viewed without cookies or personal identifiers.",
    fieldLabel: "Site domain",
    example: "cyvrix.co.uk",
    pattern: /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    formatHint: "The domain as registered in Plausible, without https://.",
    whereToFind: "In Plausible, open the site settings. It is the domain the site was added under.",
    scriptSources: ["https://plausible.io/js/"],
    cookies: [],
    privacyUrl: "https://plausible.io/data-policy",
  },
];

export type StoredIntegration = { enabled: boolean; value: string };

/** A service that is switched on and carries a valid identifier. */
export type ActiveIntegration = { id: IntegrationId; value: string };

export function getIntegration(id: IntegrationId): IntegrationDefinition {
  const found = INTEGRATIONS.find((integration) => integration.id === id);
  if (!found) throw new Error(`Unknown integration: ${id}`);
  return found;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * The stored setting for every service, including disabled ones, for the admin
 * form. Nothing here is rendered on a public page.
 */
export function readStoredIntegrations(raw: unknown): Record<IntegrationId, StoredIntegration> {
  const stored = asRecord(raw);
  const result = {} as Record<IntegrationId, StoredIntegration>;
  for (const integration of INTEGRATIONS) {
    const entry = asRecord(stored[integration.id]);
    result[integration.id] = {
      enabled: entry.enabled === true,
      value: typeof entry.value === "string" ? entry.value : "",
    };
  }
  return result;
}

/**
 * The services that may render, validated on every read.
 *
 * Not trusted because it was checked when saved. A value that fails its pattern
 * now - edited directly in the database, written through the generic settings
 * action, or saved before a pattern was tightened - is dropped here.
 */
export function readActiveIntegrations(raw: unknown): ActiveIntegration[] {
  const stored = asRecord(raw);
  const active: ActiveIntegration[] = [];
  for (const integration of INTEGRATIONS) {
    const entry = asRecord(stored[integration.id]);
    if (entry.enabled !== true || typeof entry.value !== "string") continue;
    const value = entry.value.trim();
    if (!integration.pattern.test(value)) continue;
    active.push({ id: integration.id, value });
  }
  return active;
}

/** Every script source a listed service needs, for the Content-Security-Policy. */
export function integrationScriptSources(): string[] {
  return [...new Set(INTEGRATIONS.flatMap((integration) => integration.scriptSources))];
}
