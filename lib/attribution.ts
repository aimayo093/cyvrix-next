/**
 * Where an enquiry came from: enquiry data, not analytics.
 *
 * Read in the browser from the address bar and document.referrer, held in a
 * page-lifetime variable, and sent only inside the enquiry the visitor chooses
 * to submit. No cookie, no localStorage or sessionStorage, no request of its
 * own, so it needs no consent gate and no cookie-policy entry. Closing or
 * reloading the tab loses it; the enquiry then records what the new page can
 * see, and never reconstructs a campaign it can no longer observe.
 *
 * `touchFrom` is pure so scripts/test-enquiry-source.mts can exercise it; the
 * functions below it touch `window` only when called.
 */

export type Confidence = (typeof CONFIDENCES)[number];

export type Touch = {
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
  landingPage: string;
  referrerDomain: string | null;
  confidence: Confidence;
};

export const ATTRIBUTION_MAX_LENGTH = 2000;

/** Length limits for every captured value. The server imports these, so both sides agree. */
export const ATTRIBUTION_CAPS = {
  source: 80,
  medium: 80,
  campaign: 120,
  term: 80,
  content: 120,
  landingPage: 200,
  referrerDomain: 120,
} as const;

export const CONFIDENCES = ["utm", "referrer", "direct"] as const;

const CAP = {
  source: ATTRIBUTION_CAPS.source,
  medium: ATTRIBUTION_CAPS.medium,
  campaign: ATTRIBUTION_CAPS.campaign,
  term: ATTRIBUTION_CAPS.term,
  content: ATTRIBUTION_CAPS.content,
  page: ATTRIBUTION_CAPS.landingPage,
  domain: ATTRIBUTION_CAPS.referrerDomain,
};

/** Signed-in and machine routes never record a touch. */
const EXCLUDED = ["/portal", "/login", "/admin", "/api", "/security-setup"];

const SEARCH: [RegExp, string][] = [
  // Google's own search hosts only (google.com, www.google.co.uk, google.de,
  // google.com.au): not Gmail, Docs or any host that merely contains "google.".
  [/^(www\.)?google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)search\.yahoo\.com$/, "yahoo"],
  [/(^|\.)ecosia\.org$/, "ecosia"],
];

const SOCIAL: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "linkedin"],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$|(^|\.)t\.co$/, "x"],
  [/(^|\.)facebook\.com$|(^|\.)instagram\.com$/, "meta"],
];

export function cleanToken(value: string | null | undefined, max: number): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f<>"'`]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, max);
}

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

export function isExcludedPath(pathname: string): boolean {
  return EXCLUDED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** One page view's source. Pure: the inputs are the page URL and its referrer. */
export function touchFrom(href: string, referrer: string | null | undefined): Touch {
  const url = new URL(href);
  const query = url.searchParams;

  let referrerDomain: string | null = null;
  try {
    if (referrer) {
      const from = new URL(referrer);
      // Internal navigation is never a source.
      if (bareHost(from.hostname) !== bareHost(url.hostname)) {
        referrerDomain = cleanToken(bareHost(from.hostname), CAP.domain) || null;
      }
    }
  } catch {
    referrerDomain = null;
  }

  const base = {
    landingPage: cleanToken(url.pathname, CAP.page) || "/",
    referrerDomain,
  };

  const utmSource = cleanToken(query.get("utm_source"), CAP.source);
  if (utmSource) {
    const optional = (key: string, max: number) => cleanToken(query.get(key), max) || undefined;
    return {
      ...base,
      source: utmSource,
      medium: cleanToken(query.get("utm_medium"), CAP.medium) || "referral",
      campaign: optional("utm_campaign", CAP.campaign),
      term: optional("utm_term", CAP.term),
      content: optional("utm_content", CAP.content),
      confidence: "utm",
    };
  }

  if (referrerDomain) {
    for (const [pattern, source] of SEARCH) {
      if (pattern.test(referrerDomain)) return { ...base, source, medium: "organic", confidence: "referrer" };
    }
    for (const [pattern, source] of SOCIAL) {
      if (pattern.test(referrerDomain)) return { ...base, source, medium: "social", confidence: "referrer" };
    }
    return { ...base, source: referrerDomain, medium: "referral", confidence: "referrer" };
  }

  return { ...base, source: "direct", medium: "none", confidence: "direct" };
}

export type TouchMemory = { first: Touch; last: Touch } | null;

/**
 * The rule for what the tab remembers, pure so it can be tested: the first
 * touch is kept for good; a later campaign (utm) link replaces the last touch;
 * a referrer or direct page view after the first changes nothing.
 */
export function nextMemory(memory: TouchMemory, touch: Touch): TouchMemory {
  if (!memory) return { first: touch, last: touch };
  if (touch.confidence === "utm") return { first: memory.first, last: touch };
  return memory;
}

/**
 * The hidden field's JSON for a memory and form page. If the caps still let it
 * run past ATTRIBUTION_MAX_LENGTH, the first touch is trimmed to its essentials
 * rather than the whole source being dropped. Pure.
 */
export function payloadFor(memory: TouchMemory, formPage: string): string {
  if (!memory) return "";
  const build = (first: Partial<Touch>) =>
    JSON.stringify({ v: 1, firstTouch: first, lastTouch: memory.last, formPage: cleanToken(formPage, CAP.page) || "/" });
  const full = build(memory.first);
  if (full.length <= ATTRIBUTION_MAX_LENGTH) return full;
  const { source, medium, confidence, landingPage } = memory.first;
  const trimmed = build({ source, medium, confidence, landingPage });
  return trimmed.length <= ATTRIBUTION_MAX_LENGTH ? trimmed : "";
}

// Page-lifetime only: no cookie, no storage. A full page load starts again.
// The public header and footer links force full page loads (app/(public)/
// layout.tsx, FORCE_FULL_PAGE_RELOAD), so a campaign is kept only when the
// visitor reaches a form without using them. Founder decision, 14 November
// 2026 (DECISIONS §16): accept that rather than store anything on the device;
// "How did you hear about us?" and aggregate analytics cover the rest.
let memory: TouchMemory = null;

export function recordTouch(): void {
  if (typeof window === "undefined" || isExcludedPath(window.location.pathname)) return;
  memory = nextMemory(memory, touchFrom(window.location.href, document.referrer));
}

/** The JSON sent in the enquiry's hidden `attribution` field, or "" if nothing could be read. */
export function attributionPayload(): string {
  recordTouch();
  if (typeof window === "undefined") return "";
  return payloadFor(memory, window.location.pathname);
}
