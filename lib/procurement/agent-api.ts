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

export async function listOpportunitiesForAgents(params: { since: Date | null; kind: string | null; status: string | null; limit: number }) {
  const rows = await prisma.opportunity.findMany({
    where: {
      ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      ...(params.kind ? { kind: params.kind } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { updatedAt: "asc" },
    take: Math.min(Math.max(params.limit, 1), 200),
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
  const opportunities: AgentOpportunity[] = rows.map(agentOpportunity);
  return { opportunities, next: rows.length ? rows[rows.length - 1].updatedAt.toISOString() : null };
}

export async function listOrganisationsForAgents(category: string | null) {
  const rows = await prisma.organisation.findMany({
    where: category ? { categories: { has: category } } : {},
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    select: { id: true, name: true, categories: true, priority: true, isResearchTarget: true, website: true },
  });
  return { organisations: rows.map(agentOrganisation) };
}

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(3)
    .max(max)
    .refine((t) => !containsPersonalData(t), "Personal data (an email address, a phone number or a personal profile link) is not accepted. Name organisations and roles only.");

export const researchSchema = z.object({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9._:-]{8,100}$/),
  kind: z.enum(["commercial", "tender", "partnership"]),
  title: safeText(300),
  organisation: safeText(200).optional(),
  evidenceUrl: z
    .string()
    .url()
    .max(1000)
    .refine(isPublicLink, "Evidence must be an https link to a public page, not a personal profile."),
  deadlineAt: z.string().datetime({ offset: true }).optional(),
  valueMax: z.number().nonnegative().max(1e10).optional(),
  confirmedBuying: z.boolean().default(false),
  source: z.object({
    agent: z.string().trim().min(2).max(80).refine((t) => !containsPersonalData(t)),
    issueId: z.string().max(100).optional(),
  }),
});

export type ResearchInput = z.infer<typeof researchSchema>;

/** Records an agent's finding as a new opportunity (Discovered / TargetIdentified). Idempotent on the key. */
export async function recordAgentResearch(input: ResearchInput): Promise<{ id: string; created: boolean }> {
  // The idempotency key is kept as an audit entry, so a retry returns the original.
  const prior = await prisma.auditLog.findFirst({
    where: { action: "opportunity.agent_research", metadata: { path: ["idempotencyKey"], equals: input.idempotencyKey } },
    select: { entityId: true },
  });
  if (prior?.entityId) return { id: prior.entityId, created: false };

  // The same finding recorded by another run: same evidence link in the last 30 days.
  const since = new Date(Date.now() - 30 * 86_400_000);
  const same = await prisma.opportunity.findFirst({
    where: { origin: "paperclip", createdAt: { gte: since }, Evidence: { some: { url: input.evidenceUrl } } },
    select: { id: true },
  });
  if (same) return { id: same.id, created: false };

  const id = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
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
        confirmedBuying: input.confirmedBuying,
        paperclipIssueId: input.source.issueId ?? null,
        Evidence: { create: { id: crypto.randomUUID(), kind: "web", url: input.evidenceUrl, retrievedAt: new Date() } },
      },
    });
    await audit(tx, null, "opportunity.agent_research", "Opportunity", id, {
      idempotencyKey: input.idempotencyKey,
      agent: input.source.agent,
      issueId: input.source.issueId ?? null,
    });
  });
  return { id, created: true };
}

/** An agent asks to move a record. Only the lifecycle's agent moves can succeed. */
export async function agentMove(opportunityId: string, to: string, agent: string) {
  return transitionOpportunity({ opportunityId, to, actor: "agent", userId: null, note: `agent: ${agent}`.slice(0, 200) });
}
