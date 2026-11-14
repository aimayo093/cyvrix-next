"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApprove, draftFindings, plainText, type DraftKind } from "@/lib/agent-drafts-core";
import type { ClaimFinding } from "@/lib/claim-rules";

/**
 * Review actions for /admin/ai-drafts (DECISIONS section 15).
 *
 * Approving never publishes anything by itself:
 *   blog      becomes a DRAFT post in Blog & Insights, published from there
 *   email     opens the Email page with subject and body filled in
 *   social    is marked ready; you post it, then mark it posted
 *   proposal  is marked accepted; you carry it out
 */

const PAGE = "/admin/ai-drafts";
const ID = /^[0-9a-f-]{36}$/i;

const back = (tab: string, status: "success" | "error", message: string): never =>
  redirect(`${PAGE}?tab=${encodeURIComponent(tab)}&status=${status}&message=${encodeURIComponent(message)}`);

async function pending(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!ID.test(id)) back("blog", "error", "That draft could not be found.");
  const draft = await prisma.agentDraft.findUnique({ where: { id } });
  if (!draft) return back("blog", "error", "That draft could not be found.");
  if (draft.status !== "PENDING") back(draft.kind, "error", "That draft has already been reviewed.");
  return draft;
}

async function audit(userId: string, action: string, draftId: string, metadata: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), userId, action, entityType: "AgentDraft", entityId: draftId, metadata: metadata as Prisma.InputJsonValue },
  });
}

/** Save an edit and re-run the claims check, so an edit can clear (or add) a finding. */
export async function editAgentDraft(formData: FormData) {
  const admin = await requireAdmin();
  const draft = await pending(formData);
  const title = plainText(String(formData.get("title") ?? "")).slice(0, 200);
  const body = plainText(String(formData.get("body") ?? "")).slice(0, 40_000);
  if (!title || !body) back(draft.kind, "error", "A draft needs a title and a body.");

  const payload = (draft.payload ?? {}) as Record<string, unknown>;
  const findings = draftFindings({ title, body, payload });
  await prisma.agentDraft.update({
    where: { id: draft.id },
    data: { title, body, claimFindings: findings as unknown as Prisma.InputJsonValue },
  });
  await audit(admin.id, "paperclip.draft_edited", draft.id, { kind: draft.kind, findings: findings.length });
  revalidatePath(PAGE);
  back(draft.kind, "success", findings.length ? `Saved. ${findings.length} claims issue(s) still to fix.` : "Saved. No claims issues.");
}

export async function approveAgentDraft(formData: FormData) {
  const admin = await requireAdmin();
  const draft = await pending(formData);
  const kind = draft.kind as DraftKind;
  const payload = (draft.payload ?? {}) as Record<string, unknown>;

  // Checked again now, not trusted from submission: the rules may have changed.
  const findings: ClaimFinding[] = draftFindings({ title: draft.title, body: draft.body, payload });
  if (!canApprove(kind, findings)) {
    await prisma.agentDraft.update({ where: { id: draft.id }, data: { claimFindings: findings as unknown as Prisma.InputJsonValue } });
    back(kind, "error", "Fix the highlighted claims before approving. Edit the draft, then approve.");
  }

  let publishedRef: string | null = null;
  let next = `${PAGE}?tab=${kind}&status=success&message=${encodeURIComponent("Approved.")}`;

  if (kind === "blog") {
    const base = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "insight";
    const taken = await prisma.blogPost.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
    const used = new Set(taken.map((t) => t.slug));
    let slug = base;
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;

    const summary = typeof payload.summary === "string" ? payload.summary : "";
    const post = await prisma.blogPost.create({
      data: {
        id: crypto.randomUUID(),
        slug,
        title: draft.title,
        body: draft.body,
        author: "CYVRIX Editorial",
        category: typeof payload.category === "string" && payload.category ? payload.category : "General",
        tags: Array.isArray(payload.tags) ? payload.tags.filter((t): t is string => typeof t === "string") : [],
        status: "DRAFT",
        seo: { title: draft.title, description: summary },
        updatedAt: new Date(),
      },
    });
    publishedRef = post.id;
    next = `/admin/blog-and-insights?edit=${post.id}`;
  } else if (kind === "email") {
    next = `/admin/email?draft=${draft.id}`;
  }

  await prisma.agentDraft.update({
    where: { id: draft.id },
    data: {
      status: "APPROVED",
      reviewerId: admin.id,
      reviewedAt: new Date(),
      reviewNote: plainText(String(formData.get("note") ?? "")).slice(0, 1000) || null,
      publishedRef,
      claimFindings: findings as unknown as Prisma.InputJsonValue,
    },
  });
  await audit(admin.id, "paperclip.draft_approved", draft.id, { kind, title: draft.title.slice(0, 200), publishedRef });
  revalidatePath(PAGE);
  revalidatePath("/admin/blog-and-insights");
  redirect(next);
}

export async function rejectAgentDraft(formData: FormData) {
  const admin = await requireAdmin();
  const draft = await pending(formData);
  const note = plainText(String(formData.get("note") ?? "")).slice(0, 1000);
  if (!note) back(draft.kind, "error", "Say why it was rejected, so the agent can do better next time.");
  await prisma.agentDraft.update({
    where: { id: draft.id },
    data: { status: "REJECTED", reviewerId: admin.id, reviewedAt: new Date(), reviewNote: note },
  });
  await audit(admin.id, "paperclip.draft_rejected", draft.id, { kind: draft.kind, title: draft.title.slice(0, 200) });
  revalidatePath(PAGE);
  back(draft.kind, "success", "Rejected. The agent will see your note.");
}

/** After an approved social post has been posted by hand. */
export async function markAgentDraftPosted(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!ID.test(id)) back("social", "error", "That draft could not be found.");
  const updated = await prisma.agentDraft.updateMany({
    where: { id, kind: "social", status: "APPROVED" },
    data: { status: "PUBLISHED" },
  });
  if (updated.count === 0) back("social", "error", "Only an approved social post can be marked as posted.");
  await audit(admin.id, "paperclip.draft_posted", id, { kind: "social" });
  revalidatePath(PAGE);
  back("social", "success", "Marked as posted.");
}
