import { industries as staticIndustries, services as staticServices } from "@/lib/cyvrix-data";
import {
  getPublicCareerJobs,
  getPublicCaseStudies,
  getPublicIndustriesData,
  getPublicInsights,
  getPublicServicesData,
} from "@/lib/public-cache";
import { getStaticPublicInsights, toPublicInsight } from "@/lib/public-insight";

export const SEARCH_RESULT_TYPES = [
  "Service",
  "Industry",
  "Insight",
  "Case study",
  "Career",
] as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

export type SiteSearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  href: string;
  /** Extra terms matched against but not displayed. */
  keywords: string[];
};

export type SiteSearchOutcome = {
  query: string;
  results: SiteSearchResult[];
  totalIndexed: number;
};

/** Upper bound on an accepted query, to keep scoring work predictable. */
export const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS = 40;
const MIN_TERM_LENGTH = 2;

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimToSentence(value: string, limit = 190): string {
  const normalised = value.replace(/\s+/g, " ").trim();
  if (normalised.length <= limit) return normalised;
  const cut = normalised.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Splits a raw query into lowercase terms. Punctuation is discarded so the
 * query is only ever used for in-memory comparison, never as a data-layer filter.
 */
export function parseQueryTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .slice(0, MAX_QUERY_LENGTH)
        .toLowerCase()
        .split(/[^a-z0-9+#]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= MIN_TERM_LENGTH)
    )
  ).slice(0, 8);
}

function buildServiceEntries(
  cmsServices: Awaited<ReturnType<typeof getPublicServicesData>>
): SiteSearchResult[] {
  if (cmsServices.length > 0) {
    return cmsServices.map((service) => {
      const content = isRecord(service.content) ? service.content : {};
      return {
        id: `service:${service.slug}`,
        type: "Service" as const,
        title: service.title,
        description: trimToSentence(service.summary || textOf(content.summary)),
        href: `/services/${service.slug}`,
        keywords: [
          ...readStringArray(content.includes),
          ...readStringArray(content.features),
          textOf(content.audience),
        ].filter(Boolean),
      };
    });
  }

  return staticServices.map((service) => ({
    id: `service:${service.slug}`,
    type: "Service" as const,
    title: service.title,
    description: trimToSentence(service.summary),
    href: `/services/${service.slug}`,
    keywords: [...service.includes, ...service.features, service.audience],
  }));
}

function buildIndustryEntries(
  cmsIndustries: Awaited<ReturnType<typeof getPublicIndustriesData>>
): SiteSearchResult[] {
  if (cmsIndustries.length > 0) {
    return cmsIndustries.map((industry) => {
      const content = isRecord(industry.content) ? industry.content : {};
      return {
        id: `industry:${industry.slug}`,
        type: "Industry" as const,
        title: industry.title,
        description: trimToSentence(
          textOf(content.help) || `How CYVRIX supports organisations in ${industry.title.toLowerCase()}.`
        ),
        href: `/industries/${industry.slug}`,
        keywords: [
          ...readStringArray(content.challenges),
          ...readStringArray(content.solutions),
          ...readStringArray(content.services),
        ],
      };
    });
  }

  return staticIndustries.map((industry) => ({
    id: `industry:${industry.slug}`,
    type: "Industry" as const,
    title: industry.title,
    description: trimToSentence(industry.help),
    href: `/industries/${industry.slug}`,
    keywords: [...industry.challenges, ...industry.solutions, ...industry.services],
  }));
}

function buildInsightEntries(
  cmsInsights: Awaited<ReturnType<typeof getPublicInsights>>
): SiteSearchResult[] {
  const insights =
    cmsInsights.length > 0
      ? cmsInsights
          .map((insight) => toPublicInsight(insight))
          .filter((insight): insight is NonNullable<typeof insight> => insight !== null)
      : getStaticPublicInsights();

  return insights.map((insight) => ({
    id: `insight:${insight.slug}`,
    type: "Insight" as const,
    title: insight.title,
    description: trimToSentence(insight.excerpt || insight.body[0] || ""),
    href: `/blog/${insight.slug}`,
    keywords: [insight.category, ...insight.tags],
  }));
}

function buildCaseStudyEntries(
  caseStudies: Awaited<ReturnType<typeof getPublicCaseStudies>>
): SiteSearchResult[] {
  return caseStudies.map((caseStudy) => ({
    id: `case-study:${caseStudy.slug}`,
    type: "Case study" as const,
    title: caseStudy.title,
    description: trimToSentence(caseStudy.challenge || caseStudy.solution || caseStudy.outcome || ""),
    href: `/case-studies/${caseStudy.slug}`,
    keywords: [
      caseStudy.clientType ?? "",
      ...readStringArray(caseStudy.technologies),
      ...readStringArray(caseStudy.services),
    ].filter(Boolean),
  }));
}

function buildCareerEntries(
  jobs: Awaited<ReturnType<typeof getPublicCareerJobs>>
): SiteSearchResult[] {
  return jobs.map((job) => ({
    id: `career:${job.id}`,
    type: "Career" as const,
    title: job.title,
    description: trimToSentence(
      job.description || [job.location, job.type].filter(Boolean).join(" - ") || "Open role at CYVRIX."
    ),
    href: "/careers",
    keywords: [job.location ?? "", job.type ?? ""].filter(Boolean),
  }));
}

/**
 * Builds the public search index from published CMS content, falling back to the
 * reviewed static catalogue when the database is unavailable. Nothing withheld by
 * the publication or Trust & Credentials gates can enter the index.
 */
export async function buildSearchIndex(): Promise<SiteSearchResult[]> {
  const [cmsServices, cmsIndustries, cmsInsights, caseStudies, careerJobs] = await Promise.all([
    getPublicServicesData(),
    getPublicIndustriesData(),
    getPublicInsights(),
    getPublicCaseStudies(),
    getPublicCareerJobs(),
  ]);

  return [
    ...buildServiceEntries(cmsServices),
    ...buildIndustryEntries(cmsIndustries),
    ...buildInsightEntries(cmsInsights),
    ...buildCaseStudyEntries(caseStudies),
    ...buildCareerEntries(careerJobs),
  ];
}

function scoreEntry(entry: SiteSearchResult, terms: string[]): number {
  const title = entry.title.toLowerCase();
  const description = entry.description.toLowerCase();
  const keywords = entry.keywords.join(" ").toLowerCase();

  let score = 0;

  for (const term of terms) {
    let termScore = 0;

    if (title === term) termScore += 60;
    else if (title.startsWith(term)) termScore += 30;
    if (title.includes(term)) termScore += 20;
    if (keywords.includes(term)) termScore += 8;
    if (description.includes(term)) termScore += 5;

    // Every term must appear somewhere for the entry to qualify.
    if (termScore === 0) return 0;
    score += termScore;
  }

  return score;
}

/**
 * Ranks indexed content against a visitor query. Results are ordered by score,
 * then alphabetically so equal matches render in a stable order.
 */
export async function searchSite(rawQuery: string): Promise<SiteSearchOutcome> {
  const query = rawQuery.slice(0, MAX_QUERY_LENGTH).trim();
  const terms = parseQueryTerms(query);
  const index = await buildSearchIndex();

  if (terms.length === 0) {
    return { query, results: [], totalIndexed: index.length };
  }

  const results = index
    .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "en-GB"))
    .slice(0, MAX_RESULTS)
    .map((scored) => scored.entry);

  return { query, results, totalIndexed: index.length };
}
