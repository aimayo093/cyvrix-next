export type PublicLegalDocument = {
  title: string;
  paragraphs: string[];
  reviewNotice: string | null;
};

type LegalSource = {
  title: string;
  body?: unknown;
  reviewNotice?: unknown;
};

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

function readParagraphs(value: unknown): string[] {
  return readText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 80);
}

export function toPublicLegalDocument(source: LegalSource | null): PublicLegalDocument | null {
  if (!source) return null;

  const title = readText(source.title);
  const paragraphs = readParagraphs(source.body);
  const contentLength = paragraphs.reduce((total, paragraph) => total + paragraph.length, 0);
  const hasSubstantiveParagraph = paragraphs.some((paragraph) => paragraph.length >= 80);

  // A title list or CMS placeholder must not be represented as an approved legal policy.
  if (!title || contentLength < 240 || !hasSubstantiveParagraph) return null;

  return {
    title,
    paragraphs,
    reviewNotice: readText(source.reviewNotice) || null,
  };
}
