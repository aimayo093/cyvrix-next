/**
 * What a Paperclip agent may submit, and how it is cleaned and checked.
 *
 * Pure (no Prisma, no `server-only`), so `npm run test:paperclip` covers it.
 * The database side is `lib/agent-drafts.ts`; the decision is DECISIONS
 * section 15.
 *
 * Everything is plain text. The public blog renders paragraphs as text nodes
 * (a line starting "## " is a heading, see `lib/insight-content.ts`), the
 * admin email is sent as text, and social posts are text. So any HTML an agent
 * sends is stripped rather than sanitised: there is nowhere for it to go.
 */
import { z } from "zod";
import { claimFindings, type ClaimFinding } from "@/lib/claim-rules";

/** Largest request body accepted, in bytes. */
export const MAX_DRAFT_BYTES = 100_000;

export const DRAFT_KINDS = ["blog", "email", "social", "proposal"] as const;
export type DraftKind = (typeof DRAFT_KINDS)[number];

export const DRAFT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PUBLISHED"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const SOCIAL_NETWORKS = ["linkedin", "facebook", "x", "instagram"] as const;

/** Remove markup an agent may have added. Script and style bodies go entirely. */
export function plainText(value: string): string {
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (max: number) => z.string().transform(plainText).pipe(z.string().min(1).max(max));
const optionalText = (max: number) => z.string().transform(plainText).pipe(z.string().max(max)).optional();

const source = z.object({
  agent: text(100),
  role: optionalText(100),
  issueId: optionalText(100),
});

const common = {
  idempotencyKey: z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9._:-]+$/),
  source,
};

export const draftInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("blog"),
    ...common,
    title: text(200),
    summary: optionalText(500),
    // The public page renders at most 24 paragraphs (headings included) and
    // 8 tags, and drops the rest silently. Refuse here so the agent knows.
    body: text(40_000).refine((b) => blogEntries(b).length <= MAX_BLOG_PARAGRAPHS, {
      message: `At most ${24} paragraphs, headings included, separated by blank lines`,
    }),
    category: optionalText(60),
    tags: z.array(text(40)).max(8).optional(),
  }),
  z.object({
    kind: z.literal("email"),
    ...common,
    subject: text(200),
    body: text(20_000),
  }),
  z.object({
    kind: z.literal("social"),
    ...common,
    network: z.enum(SOCIAL_NETWORKS),
    text: text(3_000),
    link: z.string().trim().url().max(500).refine((u) => u.startsWith("https://"), "Links must be https").optional(),
  }),
  z.object({
    kind: z.literal("proposal"),
    ...common,
    title: text(200),
    rationale: text(5_000),
    action: text(2_000),
    relatesTo: z
      .object({ type: z.enum(["lead", "ticket"]), id: z.string().trim().min(1).max(100) })
      .optional(),
  }),
]);

export type DraftInput = z.infer<typeof draftInputSchema>;

/** The stored shape: a title and body for listing, the rest in `payload`. */
export type NormalisedDraft = {
  kind: DraftKind;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  sourceAgent: string;
  sourceRole: string | null;
  paperclipIssueId: string | null;
};

export function normaliseDraft(input: DraftInput): NormalisedDraft {
  const base = {
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
    sourceAgent: input.source.agent,
    sourceRole: input.source.role || null,
    paperclipIssueId: input.source.issueId || null,
  };
  switch (input.kind) {
    case "blog":
      return { ...base, title: input.title, body: input.body, payload: { summary: input.summary ?? "", category: input.category ?? "", tags: input.tags ?? [] } };
    case "email":
      return { ...base, title: input.subject, body: input.body, payload: {} };
    case "social":
      return { ...base, title: `${input.network} post`, body: input.text, payload: { network: input.network, link: input.link ?? "" } };
    case "proposal":
      return { ...base, title: input.title, body: input.rationale, payload: { action: input.action, relatesTo: input.relatesTo ?? null } };
  }
}

/** All the words a draft would publish, for the claims check. */
export function draftClaimText(draft: Pick<NormalisedDraft, "title" | "body" | "payload">): string {
  const p = draft.payload;
  const extra = [p.summary, p.category, Array.isArray(p.tags) ? p.tags.join(" ") : "", p.action]
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  return [draft.title, draft.body, ...extra].join("\n");
}

export function draftFindings(draft: Pick<NormalisedDraft, "title" | "body" | "payload">): ClaimFinding[] {
  return claimFindings(draftClaimText(draft));
}

/**
 * Whether a reviewer may approve. Proposals are internal and never published,
 * so the public-claims rules do not block them; everything else must be clean.
 */
export function canApprove(kind: DraftKind, findings: ClaimFinding[]): boolean {
  return kind === "proposal" || findings.length === 0;
}

/** Mirrors `readBody` in `lib/public-insight.ts`. */
export const MAX_BLOG_PARAGRAPHS = 24;

/** Blog body text to the list of entries `lib/public-insight.ts` renders. */
export function blogEntries(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((entry) => entry.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

/** What an agent is told about a draft. Never includes reviewer identity. */
export function draftView(row: {
  id: string;
  kind: string;
  status: string;
  title: string;
  claimFindings: unknown;
  reviewNote: string | null;
  reviewedAt: Date | null;
  publishedRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    claimFindings: Array.isArray(row.claimFindings) ? row.claimFindings : [],
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    publishedRef: row.publishedRef,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
