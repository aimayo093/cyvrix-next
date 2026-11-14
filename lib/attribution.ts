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

export type Confidence = "utm" | "referrer" | "direct";

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

const CAP = { source: 80, medium: 80, campaign: 120, term: 80, content: 120, page: 200, domain: 120 };

/** Signed-in and machine routes never record a touch. */
const EXCLUDED = ["/portal", "/login", "/admin", "/api", "/security-setup"];

const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, "google"],
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

// Page-lifetime only. The first touch is kept; a later campaign link in the
// same tab replaces the last touch. Plain internal navigation changes nothing.
let memory: { first: Touch; last: Touch } | null = null;

export function recordTouch(): void {
  if (typeof window === "undefined" || isExcludedPath(window.location.pathname)) return;
  const touch = touchFrom(window.location.href, document.referrer);
  if (!memory) memory = { first: touch, last: touch };
  else if (touch.confidence === "utm") memory = { first: memory.first, last: touch };
}

/** The JSON sent in the enquiry's hidden `attribution` field, or "" if nothing could be read. */
export function attributionPayload(): string {
  recordTouch();
  if (!memory || typeof window === "undefined") return "";
  const payload = JSON.stringify({
    v: 1,
    firstTouch: memory.first,
    lastTouch: memory.last,
    formPage: cleanToken(window.location.pathname, CAP.page) || "/",
  });
  return payload.length <= ATTRIBUTION_MAX_LENGTH ? payload : "";
}
