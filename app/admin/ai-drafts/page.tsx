import * as React from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, Bot, ExternalLink, FileText, Lightbulb, Mail, Share2 } from "lucide-react";
import { AdminStatusNotice } from "@/components/admin/AdminStatusNotice";
import { CopyButton } from "@/components/admin/ai-drafts/CopyButton";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { canApprove, DRAFT_KINDS, type DraftKind } from "@/lib/agent-drafts-core";
import { approveAgentDraft, editAgentDraft, markAgentDraftPosted, rejectAgentDraft } from "@/lib/ai-draft-actions";
import { requireAdmin } from "@/lib/auth";
import type { ClaimFinding } from "@/lib/claim-rules";
import { integrationTokenState } from "@/lib/paperclip-auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "AI drafts" };

type SearchParams = { tab?: string; view?: string; status?: string; message?: string };

const TABS: { kind: DraftKind; label: string; icon: typeof FileText; approveLabel: string }[] = [
  { kind: "blog", label: "Blog", icon: FileText, approveLabel: "Approve to Blog drafts" },
  { kind: "email", label: "Email", icon: Mail, approveLabel: "Approve and open in Email" },
  { kind: "social", label: "Social", icon: Share2, approveLabel: "Approve" },
  { kind: "proposal", label: "Proposals", icon: Lightbulb, approveLabel: "Accept" },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  PUBLISHED: "bg-blue-50 text-[#0f5aab]",
  REJECTED: "bg-slate-100 text-slate-600",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "Waiting", APPROVED: "Approved", PUBLISHED: "Done", REJECTED: "Rejected" };

const when = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(d);

const field =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]";
const secondaryButton =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#041635] transition-colors hover:border-[#2691F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9";

export default function AiDraftsPage(props: { searchParams: Promise<SearchParams> }) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <AiDraftsContent {...props} />
    </React.Suspense>
  );
}

async function loadDrafts(kind: DraftKind, reviewed: boolean) {
  try {
    const [drafts, waiting] = await Promise.all([
      prisma.agentDraft.findMany({
        where: { kind, status: reviewed ? { not: "PENDING" } : "PENDING" },
        orderBy: { createdAt: reviewed ? "desc" : "asc" },
        take: 50,
      }),
      prisma.agentDraft.groupBy({ by: ["kind"], where: { status: "PENDING" }, _count: { _all: true } }),
    ]);
    return { drafts, waiting: new Map(waiting.map((w) => [w.kind, w._count._all])) };
  } catch (error) {
    console.error("[ai-drafts] could not load drafts", error instanceof Error ? error.name : "error");
    return null;
  }
}

async function AiDraftsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const tab: DraftKind = (DRAFT_KINDS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as DraftKind) : "blog";
  const reviewed = sp.view === "reviewed";
  const loaded = await loadDrafts(tab, reviewed);
  const tokens = integrationTokenState();

  return (
    <div className="space-y-6 pb-16">
      <AdminStatusNotice status={sp.status} message={sp.message} />

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">AI drafts</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Content and proposals from your Paperclip agents. Nothing here is public until you approve it, and anything
            that breaks the site&apos;s claims rules cannot be approved until it is fixed.
          </p>
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Connection:{" "}
          {tokens.draftStrong && !tokens.sameValue ? <span className="text-emerald-700">drafts on</span> : <span>drafts off</span>}
          {" · "}
          {tokens.readStrong ? <span className="text-emerald-700">read on</span> : <span>read off</span>}
        </p>
      </div>

      <nav aria-label="Draft type" className="flex flex-wrap gap-2">
        {TABS.map(({ kind, label, icon: Icon }) => {
          const active = kind === tab;
          const count = loaded?.waiting.get(kind) ?? 0;
          return (
            <Link
              key={kind}
              href={`/admin/ai-drafts?tab=${kind}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9 ${
                active ? "border-[#041635] bg-[#041635] text-white" : "border-slate-200 bg-white text-slate-600 hover:text-[#041635]"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-amber-100 text-amber-800"}`}>
                  {count}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </Link>
          );
        })}
        <Link
          href={`/admin/ai-drafts?tab=${tab}${reviewed ? "" : "&view=reviewed"}`}
          className="ml-auto inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[#2691F0] hover:underline lg:min-h-9"
        >
          {reviewed ? "Show waiting" : "Show reviewed"}
        </Link>
      </nav>

      {loaded === null ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Drafts could not be loaded. If this is a new install, the AgentDraft migration may not have been applied yet.
        </p>
      ) : loaded.drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Bot className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {reviewed ? "Nothing reviewed here yet." : "Nothing waiting. New drafts from your agents appear here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {loaded.drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </ul>
      )}
    </div>
  );
}

type DraftRow = Awaited<ReturnType<typeof prisma.agentDraft.findMany>>[number];

function DraftCard({ draft }: { draft: DraftRow }) {
  const kind = draft.kind as DraftKind;
  const findings = (Array.isArray(draft.claimFindings) ? draft.claimFindings : []) as unknown as ClaimFinding[];
  const payload = (draft.payload ?? {}) as Record<string, unknown>;
  const approvable = canApprove(kind, findings);
  const approveLabel = TABS.find((t) => t.kind === kind)?.approveLabel ?? "Approve";
  const pending = draft.status === "PENDING";
  const network = typeof payload.network === "string" ? payload.network : "";
  const link = typeof payload.link === "string" ? payload.link : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  const relatesTo = (payload.relatesTo ?? null) as { type?: string; id?: string } | null;
  const shareText = link ? `${draft.body}\n\n${link}` : draft.body;
  const titleId = `draft-${draft.id}-title`;

  return (
    <li aria-labelledby={titleId} className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="font-outfit text-lg font-black text-[#041635]">
            {draft.title}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {draft.sourceAgent}
            {draft.sourceRole ? ` (${draft.sourceRole})` : ""} · {when(draft.createdAt)}
            {draft.paperclipIssueId ? ` · Paperclip ${draft.paperclipIssueId}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[draft.status] ?? STATUS_STYLE.REJECTED}`}>
          {STATUS_LABEL[draft.status] ?? draft.status}
        </span>
      </div>

      <div className="space-y-4 px-6 py-5">
        {findings.length > 0 && kind !== "proposal" && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="flex items-center gap-2 text-sm font-black text-rose-800">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {findings.length} claims issue{findings.length === 1 ? "" : "s"}. Edit these out before approving.
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-rose-800">
              {findings.slice(0, 8).map((f, i) => (
                <li key={i}>
                  <span className="font-bold">{f.rule}:</span> &ldquo;{f.excerpt}&rdquo; ({f.note})
                </li>
              ))}
            </ul>
          </div>
        )}

        {kind === "social" && (
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {network}
            {link && (
              <>
                {" · "}
                <a href={link} target="_blank" rel="noopener noreferrer" className="normal-case text-[#2691F0] hover:underline">
                  {link}
                </a>
              </>
            )}
          </p>
        )}

        {kind === "proposal" && action && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Suggested action</p>
            <p className="mt-1 whitespace-pre-line text-sm text-[#041635]">{action}</p>
            {relatesTo?.type && relatesTo.id && (
              <Link
                href={relatesTo.type === "lead" ? "/admin/leads-crm" : "/admin/ticket-management"}
                className="mt-2 inline-block text-sm font-semibold text-[#2691F0] hover:underline"
              >
                Open {relatesTo.type === "lead" ? "Enquiries" : "Tickets"}
              </Link>
            )}
          </div>
        )}

        {pending ? (
          <form action={editAgentDraft} className="space-y-3">
            <input type="hidden" name="id" value={draft.id} />
            <div>
              <label htmlFor={`${draft.id}-title`} className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Title
              </label>
              <input id={`${draft.id}-title`} name="title" defaultValue={draft.title} maxLength={200} className={`mt-1 ${field}`} />
            </div>
            <div>
              <label htmlFor={`${draft.id}-body`} className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                {kind === "proposal" ? "Why" : "Text"}
              </label>
              <textarea
                id={`${draft.id}-body`}
                name="body"
                defaultValue={draft.body}
                rows={kind === "blog" ? 14 : 6}
                className={`mt-1 leading-relaxed ${field}`}
              />
              {kind === "blog" && (
                <p className="mt-1 text-xs text-slate-500">Blank lines separate paragraphs. A line starting &ldquo;## &rdquo; is a heading.</p>
              )}
            </div>
            <button type="submit" className={secondaryButton}>
              Save edits and recheck
            </button>
          </form>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {draft.body.slice(0, 1500)}
            {draft.body.length > 1500 ? "…" : ""}
          </p>
        )}

        {draft.reviewNote && (
          <p className="text-sm text-slate-600">
            <span className="font-bold">Review note:</span> {draft.reviewNote}
          </p>
        )}
      </div>

      {pending && (
        <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-4 lg:flex-row lg:items-end">
          <form action={approveAgentDraft} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="id" value={draft.id} />
            <div className="flex-1">
              <label htmlFor={`${draft.id}-approve-note`} className="block text-xs font-bold text-slate-500">
                Note for the agent (optional)
              </label>
              <input id={`${draft.id}-approve-note`} name="note" maxLength={1000} className={`mt-1 ${field}`} />
            </div>
            <button
              type="submit"
              disabled={!approvable}
              aria-describedby={approvable ? undefined : `${draft.id}-blocked`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2691F0] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1678CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 lg:min-h-9"
            >
              {approveLabel}
            </button>
            {!approvable && (
              <span id={`${draft.id}-blocked`} className="sr-only">
                Disabled until the claims issues are fixed
              </span>
            )}
          </form>
          <form action={rejectAgentDraft} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="id" value={draft.id} />
            <div className="flex-1">
              <label htmlFor={`${draft.id}-reject-note`} className="block text-xs font-bold text-slate-500">
                Why reject? (the agent sees this)
              </label>
              <input id={`${draft.id}-reject-note`} name="note" required maxLength={1000} className={`mt-1 ${field}`} />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-white px-5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 lg:min-h-9"
            >
              Reject
            </button>
          </form>
        </div>
      )}

      {kind === "social" && draft.status === "APPROVED" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-6 py-4">
          <CopyButton text={shareText} />
          {network === "linkedin" && (
            <a
              href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryButton}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open in LinkedIn
            </a>
          )}
          <form action={markAgentDraftPosted}>
            <input type="hidden" name="id" value={draft.id} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#041635] px-4 text-sm font-bold text-white hover:bg-[#2691F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9"
            >
              Mark as posted
            </button>
          </form>
        </div>
      )}

      {kind === "blog" && draft.publishedRef && (
        <div className="border-t border-slate-100 px-6 py-4">
          <Link href={`/admin/blog-and-insights?edit=${draft.publishedRef}`} className="text-sm font-semibold text-[#2691F0] hover:underline">
            Open the blog post
          </Link>
        </div>
      )}
    </li>
  );
}
