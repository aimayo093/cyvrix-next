/**
 * What Paperclip agents may see and send (founder decision D4, 18 Nov 2026:
 * organisations and roles only). Agents run on DeepSeek, which processes data
 * in China, and there is no UK GDPR transfer basis for personal data
 * (DECISIONS section 15), so nothing personal crosses this boundary.
 *
 * Built as an allow-list: each field an agent receives is named here. Free text
 * that can carry a person's name (notice descriptions, report quotes, notes) is
 * never sent; the public notice link is, and an agent can read it there.
 * Pure, so it is tested without a database (npm run test:procurement-ingest).
 */

export type AgentOpportunity = {
  id: string;
  kind: string;
  status: string;
  title: string;
  buyer: string | null;
  origin: string;
  confirmedBuying: boolean;
  deadlineAt: string | null;
  clarificationDeadlineAt: string | null;
  valueMin: number | null;
  valueMax: number | null;
  currency: string;
  region: string | null;
  cpv: string[];
  links: string[];
  updatedAt: string;
};

export type AgentOrganisation = { id: string; name: string; categories: string[]; priority: number; isResearchTarget: boolean; website: string | null };

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const HAS_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Phone candidates: international (+ or 00, then 9-14 more digits) or UK
// national (0 and 9-10 more digits), with spaces, brackets, dots or dashes.
// Dates and money ("2026-12-15", "250000") do not start with + or 0. A
// candidate holding a real calendar date ("01-12-2026", or a range of them) is
// not a phone number; digit groups that only look date-shaped ("020-79-46-0000",
// where 79 and 46 cannot be a day and month) are still a phone.
const PHONE = /(?<![\w+])(?:(?:\+|00)\d[\d\s().-]{7,17}\d|0\d[\d\s().-]{8,12}\d)(?!\w)/g;
const DATE_SHAPED = /(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?!\d)/g;

function holdsRealDate(candidate: string): boolean {
  for (const [, a, b] of candidate.matchAll(DATE_SHAPED)) {
    const x = Number(a);
    const y = Number(b);
    // Day-month (UK) or month-day order.
    if ((x >= 1 && x <= 31 && y >= 1 && y <= 12) || (x >= 1 && x <= 12 && y >= 1 && y <= 31)) return true;
  }
  return false;
}
const LINK = /https?:\/\/[^\s<>"')]+/gi;
const PERSONAL_HOSTS = [/(^|\.)linkedin\.com$/i, /(^|\.)facebook\.com$/i, /(^|\.)instagram\.com$/i, /(^|\.)twitter\.com$/i, /(^|\.)x\.com$/i, /(^|\.)tiktok\.com$/i];

function isPhone(candidate: string): boolean {
  if (holdsRealDate(candidate)) return false;
  const digits = candidate.replace(/\D/g, "").length;
  return candidate.startsWith("0") && !candidate.startsWith("00") ? digits >= 10 && digits <= 11 : digits >= 10 && digits <= 16;
}

/**
 * True when a link carries personal data: an email address anywhere, a
 * mailto/tel scheme, or a phone number in its query. A notice number in the
 * path (Notice/012345-2026) is not a phone number.
 */
export function linkHoldsPersonalData(url: string): boolean {
  if (HAS_EMAIL.test(url) || /^(?:mailto|tel):/i.test(url)) return true;
  try {
    const query = decodeURIComponent(new URL(url).search.replace(/\+/g, " "));
    return (query.match(PHONE) ?? []).some(isPhone);
  } catch {
    return true;
  }
}

/** True when text holds an email address, a phone number or a personal-profile link. */
export function containsPersonalData(text: string): boolean {
  if (HAS_EMAIL.test(text)) return true;
  if ((text.match(PHONE) ?? []).some(isPhone)) return true;
  if (/mailto:|tel:/i.test(text)) return true;
  for (const m of text.match(LINK) ?? []) if (!isPublicLink(m)) return true;
  return false;
}

/** Removes email addresses, phone numbers and personal links from a short text such as a title. */
export function scrub(text: string): string {
  return text
    .replace(LINK, (m) => (isPublicLink(m) ? m : "[link removed]"))
    .replace(EMAIL, "[email removed]")
    .replace(PHONE, (m) => (isPhone(m) ? "[phone removed]" : m))
    .trim();
}

/**
 * Titles typed or pasted by people (the ChatGPT report) are free text that can
 * name a person, and no pattern reliably spots a name. They are withheld;
 * the agent gets the lead's public link instead. Official notice titles and
 * agents' own research titles (checked on the way in) are passed on.
 */
export const WITHHELD_TITLE_ORIGINS = ["chatgpt_task", "manual", "website"] as const;
export const WITHHELD_TITLE = "Title withheld (it may name a person); see the link";

/** A link an agent may receive: https, and not a personal social-media profile. */
export function isPublicLink(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    return !PERSONAL_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

type OpportunityRow = {
  id: string;
  kind: string;
  status: string;
  title: string;
  origin: string;
  confirmedBuying: boolean;
  deadlineAt: Date | null;
  clarificationDeadlineAt: Date | null;
  valueMin: { toString(): string } | null;
  valueMax: { toString(): string } | null;
  currency: string;
  region: string | null;
  cpv: string[];
  updatedAt: Date;
  Buyer?: { name: string } | null;
  Evidence?: { url: string | null }[];
};

const num = (v: { toString(): string } | null) => (v === null ? null : Number(v.toString()));

export function agentOpportunity(o: OpportunityRow): AgentOpportunity {
  return {
    id: o.id,
    kind: o.kind,
    status: o.status,
    title: (WITHHELD_TITLE_ORIGINS as readonly string[]).includes(o.origin) ? WITHHELD_TITLE : scrub(o.title),
    buyer: o.Buyer?.name ? scrub(o.Buyer.name) : null,
    origin: o.origin,
    confirmedBuying: o.confirmedBuying,
    deadlineAt: o.deadlineAt?.toISOString() ?? null,
    clarificationDeadlineAt: o.clarificationDeadlineAt?.toISOString() ?? null,
    valueMin: num(o.valueMin),
    valueMax: num(o.valueMax),
    currency: o.currency,
    region: o.region,
    cpv: o.cpv,
    links: [...new Set((o.Evidence ?? []).map((e) => e.url).filter((u): u is string => !!u && isPublicLink(u)))].slice(0, 10),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function agentOrganisation(o: { id: string; name: string; categories: string[]; priority: number; isResearchTarget: boolean; website: string | null }): AgentOrganisation {
  return {
    id: o.id,
    name: scrub(o.name),
    categories: o.categories,
    priority: o.priority,
    isResearchTarget: o.isResearchTarget,
    website: o.website && isPublicLink(o.website) ? o.website : null,
  };
}
