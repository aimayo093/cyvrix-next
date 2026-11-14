import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { draftFindings, draftView, type NormalisedDraft } from "@/lib/agent-drafts-core";

/**
 * Storage for drafts submitted by Paperclip agents (DECISIONS section 15).
 * Validation and the claims check live in `lib/agent-drafts-core.ts`.
 */

export type CreateResult = { created: boolean; draft: ReturnType<typeof draftView> };

/**
 * Store a draft, or return the existing one for the same idempotency key, so
 * a heartbeat that retries after a timeout does not create a second draft.
 */
export async function createDraft(draft: NormalisedDraft): Promise<CreateResult> {
  const existing = await prisma.agentDraft.findUnique({ where: { idempotencyKey: draft.idempotencyKey } });
  if (existing) return { created: false, draft: draftView(existing) };

  const findings = draftFindings(draft);
  try {
    const row = await prisma.agentDraft.create({
      data: {
        id: crypto.randomUUID(),
        kind: draft.kind,
        title: draft.title,
        body: draft.body,
        payload: draft.payload as Prisma.InputJsonValue,
        claimFindings: findings as unknown as Prisma.InputJsonValue,
        sourceAgent: draft.sourceAgent,
        sourceRole: draft.sourceRole,
        paperclipIssueId: draft.paperclipIssueId,
        idempotencyKey: draft.idempotencyKey,
      },
    });
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: "paperclip.draft_submitted",
        entityType: "AgentDraft",
        entityId: row.id,
        metadata: { kind: row.kind, title: row.title.slice(0, 200), agent: row.sourceAgent, findings: findings.length },
      },
    });
    return { created: true, draft: draftView(row) };
  } catch (error) {
    // Two retries racing: the other one won, so return its row.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.agentDraft.findUniqueOrThrow({ where: { idempotencyKey: draft.idempotencyKey } });
      return { created: false, draft: draftView(row) };
    }
    throw error;
  }
}

export async function getDraftForAgent(id: string) {
  const row = await prisma.agentDraft.findUnique({ where: { id } });
  return row ? draftView(row) : null;
}

/** Drafts changed since a time, oldest first, so an agent can poll for review results. */
export async function listDraftsForAgent(since: Date | null, limit = 50) {
  const rows = await prisma.agentDraft.findMany({
    where: since ? { updatedAt: { gt: since } } : {},
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: limit,
  });
  return rows.map(draftView);
}

export async function pendingDraftCount(): Promise<number> {
  return prisma.agentDraft.count({ where: { status: "PENDING" } });
}
