import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminStatusNotice } from "@/components/admin/AdminStatusNotice";
import {
  ACTION_LABEL,
  card,
  field,
  label,
  pill,
  primaryButton,
  secondaryButton,
  short,
  VERSION_STATUS_LABEL,
  when,
} from "@/components/admin/procurement/ui";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addEvidence,
  addPackageItem,
  createPackage,
  lockPackageAction,
  moveOpportunity,
  recordOutcomeAction,
  removePackageItem,
  requestApprovalAction,
  revisePackageAction,
  startExecutionAction,
} from "@/lib/procurement/actions";
import { APPROVAL_ACTIONS, nextStates, type OpportunityKind } from "@/lib/procurement/lifecycle";

export const metadata = { title: "Opportunity" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; message?: string }> };

const GATE_HINT: Record<string, string> = {
  founder: "founder only",
  approval: "needs a current approval",
  executed: "needs a confirmed receipt",
  evidence: "needs an evidence document",
};

export default function OpportunityPage(props: Props) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <OpportunityContent {...props} />
    </React.Suspense>
  );
}

async function OpportunityContent({ params, searchParams }: Props) {
  await connection();
  const user = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const isFounder = user.role === "SUPER_ADMIN";

  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      Buyer: true,
      Evidence: { orderBy: { createdAt: "asc" } },
      Package: {
        orderBy: { version: "desc" },
        include: {
          Item: { include: { DocumentVersion: { include: { Document: true } } } },
          ApprovalRequest: { orderBy: { createdAt: "desc" }, include: { Decision: { include: { ExecutionRecord: { include: { Receipt: true } } } } } },
        },
      },
    },
  });
  if (!opp) notFound();

  const [versions, history] = await Promise.all([
    prisma.companyDocumentVersion.findMany({ where: { status: { not: "superseded" } }, orderBy: { createdAt: "desc" }, take: 200, include: { Document: true } }),
    prisma.auditLog.findMany({ where: { entityType: "Opportunity", entityId: opp.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const moves = nextStates(opp.kind as OpportunityKind, opp.status);
  const docOptions = versions.map((v) => (
    <option key={v.id} value={v.id}>
      {v.Document.title} v{v.version} ({VERSION_STATUS_LABEL[v.status] ?? v.status})
    </option>
  ));

  return (
    <div className="space-y-6 pb-16">
      <AdminStatusNotice status={sp.status} message={sp.message} />
      <div>
        <Link href={`/admin/procurement?tab=opportunities`} className="text-sm font-semibold text-[#2691F0] hover:underline">← Procurement</Link>
        <h1 className="mt-2 font-outfit text-3xl font-black text-[#041635]">{opp.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {opp.kind} · {opp.Buyer?.name ?? "no organisation"} · from {opp.origin} · {opp.confirmedBuying ? "confirmed buying opportunity" : "inferred prospect"}
          {opp.ocid ? ` · ${opp.ocid}` : ""}
        </p>
      </div>

      <section className={`${card} grid gap-4 md:grid-cols-4`}>
        <div><p className={label}>Status</p><p className="mt-1"><span className={`${pill} bg-[#041635] text-white`}>{opp.status}</span></p></div>
        <div><p className={label}>Deadline (London)</p><p className="mt-1 tabular-nums">{when(opp.deadlineAt)}</p></div>
        <div><p className={label}>Published value</p><p className="mt-1">{opp.valueMin || opp.valueMax ? `£${opp.valueMin?.toString() ?? "?"} – £${opp.valueMax?.toString() ?? "?"}` : "Not published"}</p></div>
        <div><p className={label}>Region</p><p className="mt-1">{opp.region ?? "—"}</p></div>
        {opp.summary && <p className="whitespace-pre-wrap text-sm text-slate-700 md:col-span-4">{opp.summary}</p>}
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="font-outfit text-lg font-black text-[#041635]">Move to</h2>
        {moves.length === 0 ? (
          <p className="text-sm text-slate-500">This is a final status.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {moves.map((m) => (
              <form key={m.to} action={moveOpportunity} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2">
                <input type="hidden" name="opportunityId" value={opp.id} />
                <input type="hidden" name="to" value={m.to} />
                {m.gate === "evidence" && (
                  <select name="evidenceVersionId" required defaultValue="" className={`${field} max-w-64`} aria-label={`Evidence for ${m.to}`}>
                    <option value="" disabled>Evidence document…</option>
                    {docOptions}
                  </select>
                )}
                <button className={m.gate === "person" ? secondaryButton : primaryButton} disabled={m.gate === "founder" && !isFounder}>
                  {m.to}
                </button>
                {GATE_HINT[m.gate] && <span className="text-xs text-slate-500">{GATE_HINT[m.gate]}</span>}
              </form>
            ))}
          </div>
        )}
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="font-outfit text-lg font-black text-[#041635]">Evidence</h2>
        <ul className="space-y-2 text-sm">
          {opp.Evidence.map((e) => (
            <li key={e.id}>
              {e.url ? <a href={e.url} target="_blank" rel="noreferrer noopener" className="break-all text-[#0f5aab] hover:underline">{e.url}</a> : null}
              {e.quote && <blockquote className="border-l-2 border-slate-200 pl-3 text-slate-600">{e.quote}</blockquote>}
              <span className="text-xs text-slate-400">{e.kind} · {when(e.retrievedAt ?? e.createdAt)}</span>
            </li>
          ))}
        </ul>
        <form action={addEvidence} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="opportunityId" value={opp.id} />
          <input name="url" type="url" placeholder="https://…" className={field} aria-label="Evidence link" />
          <input name="quote" maxLength={1000} placeholder="or a short quote" className={field} aria-label="Evidence quote" />
          <button className={secondaryButton}>Add evidence</button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-outfit text-lg font-black text-[#041635]">Packages</h2>
        <p className="text-sm text-slate-500">
          A package is the exact set of documents, price and declarations for one destination. Locking it fixes its
          fingerprint. The founder approves that fingerprint; changing anything afterwards needs a new version and a new approval.
        </p>
        {opp.Package.map((p) => {
          const declarations = Array.isArray(p.declarations) ? (p.declarations as string[]) : [];
          const price = p.priceSnapshot as { amount?: number; basis?: string } | null;
          return (
            <article key={p.id} className={`${card} space-y-3`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-[#041635]">Version {p.version} → <span className="break-all font-normal">{p.destination}</span></h3>
                <span className={`${pill} ${p.status === "locked" ? "bg-emerald-50 text-emerald-700" : p.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.status}{p.manifestSha256 ? ` · ${short(p.manifestSha256)}` : ""}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Price: {price?.amount !== undefined ? `£${price.amount.toLocaleString("en-GB")} (${price.basis || "no basis"})` : "none"} · {declarations.length} declaration(s)
              </p>
              <ul className="space-y-1 text-sm">
                {p.Item.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2">
                    <a href={`/api/admin/procurement/documents/${i.documentVersionId}`} target="_blank" rel="noreferrer" className="text-[#0f5aab] hover:underline">{i.label}</a>
                    <span className="text-xs text-slate-500">{VERSION_STATUS_LABEL[i.DocumentVersion.status] ?? i.DocumentVersion.status} · {short(i.sha256)}</span>
                    {p.status === "draft" && (
                      <form action={removePackageItem}><input type="hidden" name="itemId" value={i.id} /><button className="text-xs font-semibold text-rose-700 hover:underline">Remove</button></form>
                    )}
                  </li>
                ))}
              </ul>
              {p.status === "draft" && (
                <div className="flex flex-wrap gap-3">
                  <form action={addPackageItem} className="flex flex-wrap gap-2">
                    <input type="hidden" name="packageId" value={p.id} />
                    <select name="documentVersionId" required defaultValue="" className={`${field} max-w-80`} aria-label="Document to add">
                      <option value="" disabled>Add a document…</option>
                      {docOptions}
                    </select>
                    <button className={secondaryButton}>Add</button>
                  </form>
                  <form action={lockPackageAction}><input type="hidden" name="packageId" value={p.id} /><button className={primaryButton}>Lock package</button></form>
                </div>
              )}
              {p.status === "locked" && (
                <div className="flex flex-wrap gap-3">
                  <form action={requestApprovalAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="packageId" value={p.id} />
                    <select name="actionType" required defaultValue="" className={`${field} max-w-72`} aria-label="Approval for">
                      <option value="" disabled>Ask the founder to approve…</option>
                      {APPROVAL_ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
                    </select>
                    <button className={primaryButton}>Request approval</button>
                  </form>
                  <form action={revisePackageAction}><input type="hidden" name="packageId" value={p.id} /><button className={secondaryButton}>Revise (new version)</button></form>
                </div>
              )}

              {p.ApprovalRequest.map((r) => {
                const d = r.Decision;
                const exec = d?.ExecutionRecord;
                return (
                  <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p>
                      <span className="font-semibold">{ACTION_LABEL[r.actionType] ?? r.actionType}</span> · requested {when(r.createdAt)} ·{" "}
                      <span className="font-semibold">{r.status.replace("_", " ")}</span>
                      {d ? ` ${when(d.createdAt)}` : ` · valid until ${when(r.expiresAt)}`}
                      {d?.note ? ` · “${d.note}”` : ""}
                    </p>
                    {d?.decision === "approved" && !exec && isFounder && (
                      <form action={startExecutionAction} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="decisionId" value={d.id} />
                        <select name="mode" defaultValue="manual" className={`${field} max-w-60`} aria-label="How it will be carried out">
                          <option value="manual">I will submit it myself</option>
                          <option value="human_assisted">Submitted with help, by a person</option>
                        </select>
                        <button className={primaryButton}>Start: I am submitting this now</button>
                      </form>
                    )}
                    {exec && (
                      <div className="mt-2 space-y-2">
                        <p>
                          Carried out {when(exec.startedAt)} ({exec.mode}) · outcome <span className="font-semibold">{exec.outcome}</span>
                          {exec.portalReference ? ` · ref ${exec.portalReference}` : ""} · {exec.Receipt.length} receipt(s)
                        </p>
                        {(exec.outcome === "pending" || exec.outcome === "ambiguous") && isFounder && (
                          <form action={recordOutcomeAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                            <input type="hidden" name="executionId" value={exec.id} />
                            <input name="portalReference" maxLength={200} placeholder="Portal reference" className={field} aria-label="Portal reference" />
                            <select name="receiptVersionId" defaultValue="" className={field} aria-label="Receipt document">
                              <option value="">Receipt document (upload it first)…</option>
                              {docOptions}
                            </select>
                            <div className="flex flex-wrap gap-2">
                              <button name="outcome" value="confirmed" className={primaryButton}>Confirmed</button>
                              <button name="outcome" value="rejected" className={secondaryButton}>Rejected by portal</button>
                              <button name="outcome" value="ambiguous" className={secondaryButton}>Not sure</button>
                            </div>
                          </form>
                        )}
                        {exec.outcome === "ambiguous" && (
                          <p className="font-semibold text-amber-800">Outcome unclear. Check the portal before doing anything else; nothing will be retried.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </article>
          );
        })}

        <form action={createPackage} className={`${card} grid gap-3 md:grid-cols-2`}>
          <h3 className="font-semibold text-[#041635] md:col-span-2">New package</h3>
          <input type="hidden" name="opportunityId" value={opp.id} />
          <label className="space-y-1 md:col-span-2"><span className={label}>Destination (portal address or recipient)</span><input name="destination" required maxLength={500} className={field} /></label>
          <label className="space-y-1"><span className={label}>Price (£, optional)</span><input name="priceAmount" inputMode="decimal" className={field} /></label>
          <label className="space-y-1"><span className={label}>Price basis</span><input name="priceBasis" maxLength={300} className={field} /></label>
          <label className="space-y-1 md:col-span-2"><span className={label}>Declarations, one per line, word for word</span><textarea name="declarations" rows={3} className={field} /></label>
          <div className="md:col-span-2"><button className={secondaryButton}>Create package</button></div>
        </form>
      </section>

      <section className={card}>
        <h2 className="font-outfit text-lg font-black text-[#041635]">History</h2>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {history.map((h) => {
            const m = (h.metadata ?? {}) as Record<string, unknown>;
            return (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{h.action === "opportunity.transition" ? `${String(m.from)} → ${String(m.to)} (${String(m.actor)})` : h.action}</span>
                <span className="text-slate-500">{when(h.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
