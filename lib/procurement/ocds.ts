import { londonWallTimeToUtc } from "./london-time";

/**
 * Open Contracting (OCDS) releases from the official UK feeds, turned into the
 * shape the CRM stores. Pure: no network, no database, so it is tested on
 * fixtures (npm run test:procurement-ingest).
 *
 * Checked against real responses on 18 November 2026: Find a Tender
 * (`/api/1.0/ocdsReleasePackages`, cursor paging through `links.next`) and
 * Public Contracts Scotland (`/v1/Notices`, one month per call). Both put the
 * notice in `tender`, the buyer in `buyer` + `parties`, CPV codes in
 * `tender.classification` and `items[].additionalClassifications`, and the
 * deadline in `tender.tenderPeriod.endDate`. The same tender can appear in both
 * feeds under different OCIDs, hence `crossSourceKey`.
 */

export type OcdsParty = {
  id?: string;
  name?: string;
  roles?: string[];
  contactPoint?: { name?: string; email?: string; telephone?: string; url?: string };
  address?: { region?: string; locality?: string; countryName?: string };
};

export type OcdsRelease = {
  ocid?: string;
  id?: string;
  date?: string;
  tag?: string[];
  buyer?: { id?: string; name?: string };
  parties?: OcdsParty[];
  links?: { rel?: string; href?: string }[];
  tender?: {
    title?: string;
    description?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    minValue?: { amount?: number; currency?: string };
    tenderPeriod?: { endDate?: string };
    enquiryPeriod?: { endDate?: string };
    classification?: { scheme?: string; id?: string };
    items?: { additionalClassifications?: { scheme?: string; id?: string }[]; deliveryAddresses?: { region?: string }[] }[];
  };
};

export type BuyerContact = { organisation: string; name: string | null; email: string | null; telephone: string | null; url: string | null };

export type NormalisedNotice = {
  ocid: string;
  releaseId: string;
  /** When the buyer published this release (OCDS release.date), to order releases that arrive out of order. */
  releasedAt: Date | null;
  noticeUrl: string | null;
  title: string;
  summary: string | null;
  buyerName: string | null;
  deadlineAt: Date | null;
  clarificationDeadlineAt: Date | null;
  valueMin: number | null;
  valueMax: number | null;
  currency: string;
  regions: string[];
  cpv: string[];
  status: string | null;
  contacts: BuyerContact[];
};

/**
 * CPV prefixes for the services on cyvrix.co.uk/services (23 November 2026):
 * managed IT, endpoint management, backup and recovery, cloud and Microsoft
 * 365, cybersecurity and compliance, field engineering and hardware repair,
 * VoIP, IT consultancy, network infrastructure, web and digital work, and
 * structured cabling. A notice matches on any of its codes.
 *
 * Software products (CPV 48) are not matched as a whole: CYVRIX does not sell
 * software packages such as a laboratory or timetabling system. Only the
 * security, backup and server software it deploys and supports is kept.
 */
export const RELEVANT_CPV_PREFIXES = [
  "72", // IT services: consulting, development, internet, support, data and web
  "4871", // backup and recovery software
  "4873", // security software
  "4876", // virus protection software
  "4882", // servers
  "302", // computer equipment and supplies
  "3223", // radio transmission equipment (wireless networks)
  "324", // networks: network equipment, LAN, data networks
  "3250", // telecommunications equipment
  "3252", // telecommunications cable and equipment
  "32552", // telephone and VoIP equipment
  "4531432", // installation of computer cabling
  "453143", // installation of cable infrastructure
  "4523222", // telecommunications lines and cabling works
  "50312", // maintenance and repair of computer equipment
  "50320", // repair and maintenance of personal computers
  "50323", // maintenance and repair of computer peripherals
  "50324", // support services of personal computers
  "5033", // maintenance of telecommunications equipment
  "51610", // installation of computers and office equipment
  "51611", // installation of computer equipment
  "6421", // telephone and data transmission services (including VoIP)
  "64216", // electronic message and information services
  "79417", // safety consultancy (cyber assurance is sometimes coded here)
] as const;

/**
 * Phrases that mark a CYVRIX-type opportunity even when its CPV codes are
 * generic. Whole words only (see keywordPattern), so short ones like "lan"
 * cannot match inside other words.
 */
export const RELEVANT_KEYWORDS = [
  // Managed IT
  "it support",
  "ict support",
  "desktop support",
  "managed service",
  "managed it",
  "service desk",
  "it helpdesk",
  "ict helpdesk",
  "end user computing",
  "endpoint",
  "patch management",
  "device management",
  "it asset",
  // Backup and recovery
  "data backup",
  "backup service",
  "disaster recovery",
  // Cloud and Microsoft 365
  "microsoft 365",
  "office 365",
  "m365",
  "google workspace",
  "azure",
  "cloud", // title only (TITLE_ONLY_KEYWORDS)
  "cloud migration",
  "cloud services",
  "email migration",
  // Cybersecurity and compliance
  "cyber",
  "cyber essentials",
  "information security",
  "penetration test",
  "vulnerability scanning",
  "vulnerability management",
  "firewall",
  "security operations",
  // Field engineering and hardware
  "field engineer",
  "smart hands",
  "imac",
  "break/fix",
  "break fix",
  "hardware maintenance",
  "hardware refresh",
  "device refresh",
  "pc refresh",
  "laptop",
  "desktop",
  "end user device",
  "it equipment",
  "it hardware",
  // Communications
  "voip",
  "telephony",
  "unified communication",
  "teams phone",
  // Networks and cabling
  "network services",
  "network infrastructure",
  "network installation",
  "network refresh",
  // Not "networking" alone: it also means people meeting people.
  "computer networking",
  "it networking",
  "lan",
  "wan",
  "wifi",
  "wi-fi",
  "wireless network",
  "cabling",
  "structured cabling",
  "data cabling",
  "fibre optic",
  "comms room",
  "server room",
  // Consultancy and projects
  "it consultancy",
  "ict consultancy",
  "it infrastructure",
  "ict infrastructure",
  "ict services",
  "it services",
  "office relocation",
  "website development",
  "web development",
  // Contract roles and subcontracted work. Neither "IR35" nor "subcontract"
  // is a keyword on its own: IR35 also appears on non-IT roles, and building
  // work uses "subcontract" most. A role is kept by naming IT work (these
  // titles, or any phrase above); engagementType then labels it.
  // Qualified: "network engineer" and "infrastructure engineer" alone are also
  // civil, rail and utilities job titles.
  "it network engineer",
  "ict network engineer",
  "it infrastructure engineer",
  "ict infrastructure engineer",
  "cloud engineer",
  "desktop engineer",
  "it engineer",
  "ict engineer",
  "it technician",
  "service desk analyst",
  "it contractor",
  "ict contractor",
  "contract engineer",
  "subcontract engineer",
  "subcontracted engineer",
  "engineer subcontract",
  "it subcontract",
  "ict subcontract",
  "field service subcontract",
  "field service partner",
  "managed service partner",
  "supply chain partner for it",
] as const;

/**
 * How a kept notice is offered, for the founder to see at a glance: a
 * contractor role (IR35 status named) or subcontracted work from a prime
 * contractor, rather than a direct contract. Read from the title and
 * description only; null when the notice says neither.
 */
export function engagementType(release: OcdsRelease): "ir35_role" | "subcontract" | null {
  const text = `${release.tender?.title ?? ""} ${release.tender?.description ?? ""}`.toLowerCase();
  if (/\bir\s?35\b/.test(text)) return "ir35_role";
  // A notice that forbids or limits subcontracting is a direct contract:
  // remove those phrases before looking for subcontracted work.
  const SUB = "sub-?contract\\w*";
  const negated = new RegExp(
    `\\b(?:no|not|nor|without|prohibit\\w*|forbid\\w*|may not|must not|cannot|will not)\\W+(?:\\w+\\W+){0,3}${SUB}|\\b${SUB}\\W+(?:\\w+\\W+){0,3}(?:is |are |will be )?(?:not (?:permitted|allowed|accepted)|prohibited|forbidden)`,
    "g"
  );
  const rest = text.replace(negated, " ");
  if (/\bsub-?contract(?:s|ed|ing|or|ors)?\b/.test(rest)) return "subcontract";
  return null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * A notice date. With an offset or "Z" it is exact. Without one it is a UK
 * notice's local time, so it is read as London wall time (BST in summer), not
 * as the server's time zone; a date alone is London midnight. Only the
 * repeated hour when the clocks go back cannot be placed, and is read as GMT.
 */
export function noticeDate(v: unknown): Date | null {
  return date(v);
}

function date(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const local = s.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?)?$/);
  if (local) {
    const london = londonWallTimeToUtc(`${local[1]}T${local[2] ?? "00:00"}`);
    if (london.ok) return london.date;
    const gmt = new Date(`${local[1]}T${local[2] ?? "00:00"}:00Z`);
    return Number.isNaN(gmt.getTime()) ? null : gmt;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function money(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
}

export function cpvCodes(release: OcdsRelease): string[] {
  const codes = new Set<string>();
  const main = release.tender?.classification;
  if (main?.id && (!main.scheme || main.scheme === "CPV")) codes.add(main.id);
  for (const item of release.tender?.items ?? []) {
    for (const c of item.additionalClassifications ?? []) {
      if (c.id && (!c.scheme || c.scheme === "CPV")) codes.add(c.id);
    }
  }
  return [...codes].filter((c) => /^\d{8}$/.test(c));
}

/**
 * A keyword matches only as whole words, so "it services" does not match
 * "audit services" and "lan" does not match "plan" or "clean".
 */
const patterns = new Map<string, RegExp>();
function keywordPattern(keyword: string): RegExp {
  let re = patterns.get(keyword);
  if (!re) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&").replace(/\s+/g, "\\s+");
    // Whole words, with plurals ("managed services", "laptops", "firewalls").
    // "cyber" also starts compounds ("cybersecurity").
    const tail = keyword === "cyber" ? "" : "(?:s|es)?(?![a-z0-9])";
    re = new RegExp(`(?<![a-z0-9])${escaped}${tail}`, "i");
    patterns.set(keyword, re);
  }
  return re;
}

/**
 * Broad single words that count only in a notice's title. In a description
 * they are too often a passing mention: "cyber" in a recruitment or building
 * services notice, "managed service" in a car salary-sacrifice scheme,
 * "telephony" in a revenues contract (seen on real notices, November 2026).
 */
export const TITLE_ONLY_KEYWORDS: ReadonlySet<string> = new Set([
  "cyber",
  "cloud",
  "managed service",
  "telephony",
  "lan",
  "wan",
  "laptop",
  "desktop",
  "endpoint",
  "firewall",
  "cabling",
  "azure",
  // In a description these are usually what a supplier must hold, not the work.
  "cyber essentials",
  "information security",
]);

/**
 * A title that buys business software for a function (a finance, HR,
 * timetabling or laboratory system), which is a software vendor's sale, not
 * CYVRIX's work, even when it carries an IT-services code. Kept only if the
 * title also names infrastructure, devices or support.
 */
const BUSINESS_FUNCTION =
  "finance|financial|payroll|hr|human resources?|timetabling|timetable|laboratory information|case management|housing management|revenues?|benefits|crm|erp|booking|library management|student records?|document management|electronic patient|patient records?|epr|ehr";
const SOFTWARE_PRODUCT = "systems?|software|solutions?|platforms?";
/** Either order: "finance system" or "system for case management". */
const BUSINESS_SOFTWARE = new RegExp(
  `\\b(?:${BUSINESS_FUNCTION})\\b[^.;]{0,30}?\\b(?:${SOFTWARE_PRODUCT})\\b|\\b(?:${SOFTWARE_PRODUCT})\\b[^.;]{0,20}?\\b(?:for|of|to support)\\b[^.;]{0,15}?\\b(?:${BUSINESS_FUNCTION})\\b|\\blims\\b`,
  "i"
);
/** What CYVRIX does around such a system: infrastructure, devices, support, managed service or security work. */
const INFRASTRUCTURE_IN_TITLE =
  /\b(?:network|infrastructure|hardware|devices?|laptops?|desktops?|support|helpdesk|service desk|hosting|servers?|cabling|wi-?fi|managed services?|cyber\w*|security|penetration|backup|disaster recovery)\b/i;

export function isRelevant(release: OcdsRelease): { relevant: boolean; why: string | null } {
  const title = (release.tender?.title ?? "").toLowerCase();
  if (BUSINESS_SOFTWARE.test(title) && !INFRASTRUCTURE_IN_TITLE.test(title)) return { relevant: false, why: null };
  const codes = cpvCodes(release);
  const hit = codes.find((c) => RELEVANT_CPV_PREFIXES.some((p) => c.startsWith(p)));
  if (hit) return { relevant: true, why: `CPV ${hit}` };
  const text = `${title} ${release.tender?.description ?? ""}`.toLowerCase();
  const word = RELEVANT_KEYWORDS.find((k) => keywordPattern(k).test(TITLE_ONLY_KEYWORDS.has(k) ? title : text));
  if (word) return { relevant: true, why: `keyword "${word}"` };
  return { relevant: false, why: null };
}

/** A human-readable link to the notice on the publishing portal. */
export function noticeUrl(sourceKey: string, release: OcdsRelease): string | null {
  if (sourceKey === "fts" && release.id && /^\d{6}-\d{4}$/.test(release.id)) {
    return `https://www.find-tender.service.gov.uk/Notice/${release.id}`;
  }
  // Contracts Finder release ids carry the notice id (a UUID), as
  // "<uuid>-922226" or "ocds-b5fd17-<uuid>-ra155102". The first UUID is the notice.
  const cf = sourceKey === "cf" && release.id ? /(?:^|-)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-|$)/i.exec(release.id) : null;
  if (cf) return `https://www.contractsfinder.service.gov.uk/Notice/${cf[1].toLowerCase()}`;
  const canonical = release.links?.find((l) => l.rel === "canonical" && l.href?.startsWith("https://"))?.href;
  return canonical ?? null;
}

/** Buyer contact points. Personal data: stored per D12, never sent to agents. */
export function buyerContacts(release: OcdsRelease): BuyerContact[] {
  const out: BuyerContact[] = [];
  for (const p of release.parties ?? []) {
    if (!p.roles?.includes("buyer") || !p.contactPoint) continue;
    const c = p.contactPoint;
    const contact = {
      organisation: str(p.name) ?? str(release.buyer?.name) ?? "Unknown buyer",
      name: str(c.name),
      email: str(c.email)?.toLowerCase() ?? null,
      telephone: str(c.telephone),
      url: str(c.url),
    };
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) contact.email = null;
    if (contact.name || contact.email || contact.telephone) out.push(contact);
  }
  return out;
}

/** The release with every contact point removed, for the stored raw copy. */
export function withoutContactPoints(release: OcdsRelease): OcdsRelease {
  const copy = JSON.parse(JSON.stringify(release)) as OcdsRelease & Record<string, unknown>;
  for (const p of copy.parties ?? []) delete p.contactPoint;
  return copy;
}

export function normalise(sourceKey: string, release: OcdsRelease): NormalisedNotice | null {
  const ocid = str(release.ocid);
  const releaseId = str(release.id);
  const title = str(release.tender?.title);
  if (!ocid || !releaseId || !title) return null;
  const t = release.tender ?? {};
  const max = money(t.value?.amount);
  const min = money(t.minValue?.amount);
  const regions = new Set<string>();
  for (const item of t.items ?? []) for (const a of item.deliveryAddresses ?? []) if (str(a.region)) regions.add(a.region!.trim());
  return {
    ocid,
    releaseId,
    releasedAt: date(release.date),
    noticeUrl: noticeUrl(sourceKey, release),
    title: title.slice(0, 300),
    summary: str(t.description)?.slice(0, 8000) ?? null,
    buyerName: str(release.buyer?.name)?.slice(0, 200) ?? null,
    deadlineAt: date(t.tenderPeriod?.endDate),
    clarificationDeadlineAt: date(t.enquiryPeriod?.endDate),
    valueMin: min !== null && max !== null && min > max ? null : min,
    valueMax: max,
    currency: str(t.value?.currency) ?? "GBP",
    regions: [...regions].slice(0, 10),
    cpv: cpvCodes(release).slice(0, 30),
    status: str(t.status),
    contacts: buyerContacts(release),
  };
}

/**
 * The same tender published on two portals gets two OCIDs. This key (buyer,
 * title, deadline day) spots it so the second copy is added as evidence on the
 * first, not stored as a separate opportunity.
 */
export function crossSourceKey(n: { buyerName: string | null; title: string; deadlineAt: Date | null }): string | null {
  if (!n.buyerName || !n.deadlineAt) return null;
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w && !["the", "of", "for", "and", "a", "an", "to", "in", "ltd", "limited"].includes(w))
      .join(" ");
  return `${words(n.buyerName)}|${words(n.title)}|${n.deadlineAt.toISOString().slice(0, 10)}`;
}
