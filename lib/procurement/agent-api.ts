import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { agentOpportunity, agentOrganisation, containsPersonalData, isPublicLink, type AgentOpportunity } from "./agent-view";
import { initialStatus } from "./lifecycle";
import { audit, transitionOpportunity } from "./service";

/**
 * What the procurement token can do (D4: organisations and roles only).
 * Reads go through agent-view's allow-list; writes are refused if they carry
 * personal data, and land in the CRM's first status for a person to review.
 */

export const MAX_AGENT_BODY_BYTES = 20_000;

/**
 * Paging position: the last row's updatedAt and id, as "ISO|id". Ordering by
 * both means rows that share a timestamp are never skipped between pages.
 */
export type PageCursor = { at: Date; id: string | null };

export function parseCursor(cursor: string | null, since: string | null): PageCursor | null {
  if (cursor) {
    const [iso, id] = cursor.split("|");
    if (iso && !Number.isNaN(Date.parse(iso)) && (!id || /^[0-9a-f-]{36}$/i.test(id))) return { at: new Date(iso), id: id ?? null };
  }
  if (since && !Number.isNaN(Date.parse(since))) return { at: new Date(since), id: null };
  return null;
}

export async function listOpportunitiesForAgents(params: { after: PageCursor | null; kind: string | null; status: string | null; limit: number }) {
  const take = Math.min(Math.max(Math.floor(params.limit) || 100, 1), 200);
  const after = params.after;
  const rows = await prisma.opportunity.findMany({
    where: {
      ...(after
        ? after.id
          ? { OR: [{ updatedAt: { gt: after.at } }, { updatedAt: after.at, id: { gt: after.id } }] }
          : { updatedAt: { gt: after.at } }
        : {}),
      ...(params.kind ? { kind: params.kind } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    // One row beyond the page tells whether another page exists.
    take: take + 1,
    // Only the columns the agent view uses: no summary, no notes, no contacts.
    select: {
      id: true,
      kind: true,
      status: true,
      title: true,
      origin: true,
      confirmedBuying: true,
      deadlineAt: true,
      clarificationDeadlineAt: true,
      valueMin: true,
      valueMax: true,
      currency: true,
      region: true,
      cpv: true,
      updatedAt: true,
      Buyer: { select: { name: true } },
      Evidence: { select: { url: true } },
    },
  });
  const more = rows.length > take;
  const page = more ? rows.slice(0, take) : rows;
  const opportunities: AgentOpportunity[] = page.map(agentOpportunity);
  const last = page[page.length - 1];
  // An empty page keeps the caller's position, so copying `next` never resets to the start.
  const next = last ? `${last.updatedAt.toISOString()}|${last.id}` : after ? `${after.at.toISOString()}|${after.id ?? ""}`.replace(/\|$/, "") : null;
  return { opportunities, next, more };
}

/**
 * Research targets and buyers, at most 500 per page, by id. Organisations that
 * are CYVRIX clients are left out: client names belong to the read scope only.
 */
export async function listOrganisationsForAgents(category: string | null, afterId: string | null = null) {
  const rows = await prisma.organisation.findMany({
    where: {
      clientCompanyId: null,
      ...(category ? { categories: { has: category } } : {}),
      ...(afterId ? { id: { gt: afterId } } : {}),
    },
    orderBy: { id: "asc" },
    take: 500,
    select: { id: true, name: true, categories: true, priority: true, isResearchTarget: true, website: true },
  });
  return { organisations: rows.map(agentOrganisation), next: rows.length === 500 ? rows[rows.length - 1].id : null };
}

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(3)
    .max(max)
    .refine((t) => !containsPersonalData(t), "Personal data (an email address, a phone number or a personal profile link) is not accepted. Name organisations and roles only.");

/** An agent's name as recorded: a role-like label, never personal data. */
export const agentName = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((t) => !containsPersonalData(t), "Agent names must not contain personal data.");

// Strict: unknown fields are refused, not silently dropped, so nothing personal
// can ride along in a field this schema does not check.
export const researchSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9._:-]{8,100}$/),
    kind: z.enum(["commercial", "tender", "partnership"]),
    title: safeText(300),
    organisation: safeText(200).optional(),
    evidenceUrl: z
      .string()
      .url()
      .max(1000)
      .refine((u) => isPublicLink(u) && !containsPersonalData(u), "Evidence must be an https link to a public page, with no personal data in it."),
    deadlineAt: z.string().datetime({ offset: true }).optional(),
    valueMax: z.number().nonnegative().max(1e10).optional(),
    source: z
      .object({
        agent: agentName,
        issueId: z.string().regex(/^[A-Za-z0-9._:-]{1,100}$/, "issueId is a Paperclip issue id or key.").optional(),
      })
      .strict(),
  })
  .strict();

export type ResearchInput = z.infer<typeof researchSchema>;

/** Records an agent's finding as a new opportunity (Discovered / TargetIdentified). Idempotent on the key. */
export async function recordAgentResearch(input: ResearchInput): Promise<{ id: string; created: boolean }> {
  const id = crypto.randomUUID();
  return prisma.$transaction(async (tx) => {
    // Serialise submissions with the same key, so two retries arriving together
    // cannot both pass the checks below and create two records.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agent-research:${input.idempotencyKey}`}))`;

    // The idempotency key is kept as an audit entry, so a retry returns the original.
    const prior = await tx.auditLog.findFirst({
      where: { action: "opportunity.agent_research", metadata: { path: ["idempotencyKey"], equals: input.idempotencyKey } },
      select: { entityId: true },
    });
    if (prior?.entityId) return { id: prior.entityId, created: false };

    // The same finding recorded by another run: same evidence link in the last 30 days.
    const since = new Date(Date.now() - 30 * 86_400_000);
    const same = await tx.opportunity.findFirst({
      where: { origin: "paperclip", createdAt: { gte: since }, Evidence: { some: { url: input.evidenceUrl } } },
      select: { id: true },
    });
    if (same) return { id: same.id, created: false };

    let buyerId: string | null = null;
    if (input.organisation) {
      const org = await tx.organisation.findFirst({ where: { name: { equals: input.organisation, mode: "insensitive" } }, select: { id: true } });
      buyerId = org?.id ?? null;
      if (!buyerId) {
        buyerId = crypto.randomUUID();
        await tx.organisation.create({ data: { id: buyerId, name: input.organisation, categories: [], notes: "Added from Paperclip agent research" } });
      }
    }
    await tx.opportunity.create({
      data: {
        id,
        kind: input.kind,
        status: initialStatus(input.kind),
        title: input.title,
        buyerOrganisationId: buyerId,
        origin: "paperclip",
        deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
        valueMax: input.valueMax ?? null,
        // Whether something is a confirmed buying opportunity is a person's call.
        confirmedBuying: false,
        paperclipIssueId: input.source.issueId ?? null,
        Evidence: { create: { id: crypto.randomUUID(), kind: "web", url: input.evidenceUrl, retrievedAt: new Date() } },
      },
    });
    await audit(tx, null, "opportunity.agent_research", "Opportunity", id, {
      idempotencyKey: input.idempotencyKey,
      agent: input.source.agent,
      issueId: input.source.issueId ?? null,
    });
    return { id, created: true };
  });
}

/** An agent asks to move a record. Only the lifecycle's agent moves can succeed. */
export async function agentMove(opportunityId: string, to: string, agent: string) {
  const name = agentName.safeParse(agent);
  if (!name.success) return { ok: false as const, reason: "Agent names must not contain personal data." };
  return transitionOpportunity({ opportunityId, to, actor: "agent", userId: null, note: `agent: ${name.data}`.slice(0, 200) });
}
