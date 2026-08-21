import { findIndustry } from "@/lib/cyvrix-data";
import { getIndustryJourney, type IndustryJourney } from "@/lib/industry-journeys";
import { getIndustryContent, type IndustryContent } from "@/lib/industry-content";

export type PublicIndustry = {
  slug: string;
  title: string;
  summary: string;
  challenges: string[];
  solutions: string[];
  services: string[];
  journey: IndustryJourney;
  content: IndustryContent;
};

type IndustrySource = {
  slug: string;
  title: string;
  content?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function readTextList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(readText).filter(Boolean).slice(0, 8)
    : [];
}

export function getStaticPublicIndustry(slug: string, imageOverride?: string): PublicIndustry | null {
  const industry = findIndustry(slug);
  if (!industry) return null;

  return {
    slug: industry.slug,
    title: industry.title,
    summary: industry.help,
    challenges: industry.challenges,
    solutions: industry.solutions,
    services: industry.services,
    journey: getIndustryJourney(industry.slug),
    content: getIndustryContent(industry.slug, imageOverride),
  };
}

export function toPublicIndustry(source: IndustrySource, imageOverride?: string): PublicIndustry {
  const content = isRecord(source.content) ? source.content : {};
  const fallback = getStaticPublicIndustry(source.slug, imageOverride);

  return {
    slug: source.slug,
    title: readText(source.title) || fallback?.title || "Industry technology support",
    summary: readText(content.summary) || fallback?.summary || "Practical technology support shaped around the work your organisation needs to deliver.",
    challenges: readTextList(content.challenges).length > 0 ? readTextList(content.challenges) : fallback?.challenges || [],
    solutions: readTextList(content.solutions).length > 0 ? readTextList(content.solutions) : fallback?.solutions || [],
    services: readTextList(content.services).length > 0 ? readTextList(content.services) : fallback?.services || [],
    journey: getIndustryJourney(source.slug),
    content: (() => {
      const base = getIndustryContent(source.slug, imageOverride);
      const overview = readTextList(content.overview);
      const outcomes = readTextList(content.outcomes);
      return {
        ...base,
        overview: overview.length > 0 ? overview : base.overview,
        outcomes: outcomes.length > 0 ? outcomes : base.outcomes,
      };
    })(),
  };
}
