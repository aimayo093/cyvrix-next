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
// Phone numbers: international (+ and 9-14 more digits) or UK national (0 and
// 9-10 more digits), allowing spaces, brackets and dashes. Dates and money
// ("2026-12-15", "250000") do not start with + or 0, so they are not matched.
const PHONE = /(?<![\w+])(?:\+\d[\d\s().-]{8,17}\d|0\d[\d\s().-]{8,12}\d)(?!\w)/g;
const HAS_PHONE = /(?<![\w+])(?:\+\d[\d\s().-]{8,17}\d|0\d[\d\s().-]{8,12}\d)(?!\w)/;
const PERSONAL_HOSTS = [/(^|\.)linkedin\.com$/i, /(^|\.)facebook\.com$/i, /(^|\.)instagram\.com$/i, /(^|\.)twitter\.com$/i, /(^|\.)x\.com$/i, /(^|\.)tiktok\.com$/i];

/** True when text holds an email address, a phone number or a personal-profile link. */
export function containsPersonalData(text: string): boolean {
  if (HAS_EMAIL.test(text) || HAS_PHONE.test(text)) return true;
  if (/mailto:|tel:/i.test(text)) return true;
  for (const m of text.match(/https?:\/\/[^\s<>"')]+/gi) ?? []) if (!isPublicLink(m)) return true;
  return false;
}

/** Removes email addresses and phone numbers from a short text such as a title. */
export function scrub(text: string): string {
  return text
    .replace(EMAIL, "[email removed]")
    .replace(PHONE, "[phone removed]")
    .trim();
}

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
    title: scrub(o.title),
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
