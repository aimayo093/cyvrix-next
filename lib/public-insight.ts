import { blogPosts } from "@/lib/cyvrix-data";

export type PublicInsight = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  tags: string[];
  published: string;
  publishedAt: string;
  body: string[];
  seoTitle: string | null;
  seoDescription: string | null;
};

type InsightSource = {
  slug: string;
  title: string;
  body?: unknown;
  category?: unknown;
  tags?: unknown;
  author?: unknown;
  publishAt?: Date | null;
  createdAt?: Date | null;
  seo?: unknown;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|#160);/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .trim();
}

function readBody(value: unknown): string[] {
  return readText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 24);
}

function readTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(readText).filter(Boolean).slice(0, 8)
    : [];
}

function makeExcerpt(body: string[]): string {
  const firstParagraph = body[0] ?? "";
  return firstParagraph.length > 240
    ? `${firstParagraph.slice(0, 237).trimEnd()}…`
    : firstParagraph;
}

function formatDate(value: Date): string {
  return dateFormatter.format(value);
}

function staticPublishedDate(value: string): { published: string; publishedAt: string } {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf())
    ? { published: value, publishedAt: value }
    : { published: formatDate(date), publishedAt: date.toISOString() };
}

function readSeo(value: unknown) {
  const seo = isRecord(value) ? value : {};
  return {
    seoTitle: readText(seo.title) || null,
    seoDescription: readText(seo.description) || null,
  };
}

export function getStaticPublicInsight(slug: string): PublicInsight | null {
  const insight = blogPosts.find((post) => post.slug === slug);
  if (!insight) return null;

  const published = staticPublishedDate(insight.published);
  return {
    slug: insight.slug,
    title: insight.title,
    excerpt: insight.excerpt,
    category: insight.category,
    author: insight.author,
    tags: insight.tags,
    body: insight.body,
    seoTitle: null,
    seoDescription: null,
    ...published,
  };
}

export function getStaticPublicInsights(): PublicInsight[] {
  return blogPosts
    .map((post) => getStaticPublicInsight(post.slug))
    .filter((post): post is PublicInsight => post !== null);
}

export function toPublicInsight(source: InsightSource | null): PublicInsight | null {
  if (!source) return null;

  const fallback = getStaticPublicInsight(source.slug);
  const body = readBody(source.body);
  const publicBody = body.length > 0 ? body : fallback?.body ?? [];
  const title = readText(source.title) || fallback?.title || "";

  if (!title || publicBody.length === 0) return null;

  const publishedAt = source.publishAt ?? source.createdAt;
  const published = publishedAt
    ? { published: formatDate(publishedAt), publishedAt: publishedAt.toISOString() }
    : fallback
      ? { published: fallback.published, publishedAt: fallback.publishedAt }
      : { published: "Published insight", publishedAt: "" };

  return {
    slug: source.slug,
    title,
    excerpt: makeExcerpt(publicBody) || fallback?.excerpt || "",
    category: readText(source.category) || fallback?.category || "Insights",
    author: readText(source.author) || fallback?.author || "CYVRIX Editorial",
    tags: readTags(source.tags),
    body: publicBody,
    ...readSeo(source.seo),
    ...published,
  };
}

export function getInsightConsultationHref(insight: Pick<PublicInsight, "category" | "slug">): string {
  const subject = `${insight.category} ${insight.slug}`.toLowerCase();

  if (subject.includes("cyber") || subject.includes("microsoft-365")) {
    return "/book-consultation?service=Cybersecurity";
  }

  if (subject.includes("continuity") || subject.includes("backup") || subject.includes("cloud")) {
    return "/book-consultation?service=Cloud%20%26%20Cybersecurity";
  }

  if (subject.includes("managed") || subject.includes("msp") || subject.includes("outsourcing")) {
    return "/book-consultation?service=Managed%20Services";
  }

  return "/book-consultation";
}
