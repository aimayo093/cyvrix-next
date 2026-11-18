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
 * CPV prefixes for the work CYVRIX does (PRODUCT.md "Delivered today"): IT
 * services, software, computer and network equipment, repair and
 * installation of IT, and telecoms. A notice matches on any of its codes.
 */
export const RELEVANT_CPV_PREFIXES = [
  "72", // IT services: consulting, development, internet and support
  "48", // software packages and information systems
  "302", // computer equipment and supplies
  "3223", // radio transmission and network equipment
  "3242", // network equipment
  "3241", // local area network
  "3250", // telecommunications equipment
  "50312", // maintenance and repair of computer equipment
  "50320", // repair and maintenance of personal computers
  "50323", // maintenance and repair of computer peripherals
  "51610", // installation of computers and office equipment
  "51611", // installation of computer equipment
  "64216", // electronic message and information services
  "79417", // safety consultancy (cyber assurance is sometimes coded here)
] as const;

/** Phrases that mark an IT opportunity even when its CPV codes are generic. */
export const RELEVANT_KEYWORDS = [
  "it support",
  "managed service",
  "managed it",
  "service desk",
  "cyber",
  "network services",
  "network infrastructure",
  "network installation",
  "networking",
  "lan ",
  "wan ",
  "microsoft 365",
  "office 365",
  "azure",
  "cloud",
  "cabling",
  "wifi",
  "wi-fi",
  "laptop",
  "desktop",
  "end user device",
  "field engineer",
  "break/fix",
  "break fix",
  "hardware maintenance",
  "data backup",
  "disaster recovery",
  "penetration test",
  "firewall",
  "it infrastructure",
  "ict infrastructure",
  "ict services",
  "it services",
  "it equipment",
] as const;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function date(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
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

export function isRelevant(release: OcdsRelease): { relevant: boolean; why: string | null } {
  const codes = cpvCodes(release);
  const hit = codes.find((c) => RELEVANT_CPV_PREFIXES.some((p) => c.startsWith(p)));
  if (hit) return { relevant: true, why: `CPV ${hit}` };
  const text = `${release.tender?.title ?? ""} ${release.tender?.description ?? ""}`.toLowerCase();
  const word = RELEVANT_KEYWORDS.find((k) => text.includes(k));
  if (word) return { relevant: true, why: `keyword "${word}"` };
  return { relevant: false, why: null };
}

/** A human-readable link to the notice on the publishing portal. */
export function noticeUrl(sourceKey: string, release: OcdsRelease): string | null {
  if (sourceKey === "fts" && release.id && /^\d{6}-\d{4}$/.test(release.id)) {
    return `https://www.find-tender.service.gov.uk/Notice/${release.id}`;
  }
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
