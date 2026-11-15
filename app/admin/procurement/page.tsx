import * as React from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AdminStatusNotice } from "@/components/admin/AdminStatusNotice";
import {
  ACTION_LABEL,
  CATEGORY_LABEL,
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
import { EVIDENCE_STATUSES } from "@/lib/procurement/approval-core";
import {
  createOpportunity,
  createOrganisation,
  decideApprovalAction,
  saveCompanyFact,
  updateOrganisation,
} from "@/lib/procurement/actions";

export const metadata = { title: "Procurement" };

const TABS = [
  { key: "opportunities", label: "Opportunities" },
  { key: "approvals", label: "Approval Centre" },
  { key: "organisations", label: "Organisations" },
  { key: "documents", label: "Documents" },
  { key: "facts", label: "Company facts" },
  { key: "sources", label: "Sources" },
] as const;
type Tab = (typeof TABS)[number]["key"];

type SearchParams = { tab?: string; status?: string; message?: string; kind?: string; category?: string };

export default function ProcurementPage(props: { searchParams: Promise<SearchParams> }) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <ProcurementContent {...props} />
    </React.Suspense>
  );
}

async function ProcurementContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const user = await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "opportunities") as Tab;
  const isFounder = user.role === "SUPER_ADMIN";

  let pending = 0;
  try {
    pending = await prisma.approvalRequest.count({ where: { status: "pending", expiresAt: { gt: new Date() } } });
  } catch {
    return (
      <div className="space-y-6 pb-16">
        <Header />
        <p className={`${card} text-sm text-slate-600`}>
          Procurement data could not be loaded. If this is a new install, the procurement migration
          (20261115120000) may not have been applied yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <AdminStatusNotice status={sp.status} message={sp.message} />
      <Header />
      <nav aria-label="Procurement sections" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`/admin/procurement?tab=${t.key}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9 ${
                active ? "border-[#041635] bg-[#041635] text-white" : "border-slate-200 bg-white text-slate-600 hover:text-[#041635]"
              }`}
            >
              {t.label}
              {t.key === "approvals" && pending > 0 && (
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-amber-100 text-amber-800"}`}>
                  {pending}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {tab === "opportunities" && <Opportunities kind={sp.kind} />}
      {tab === "approvals" && <Approvals isFounder={isFounder} />}
      {tab === "organisations" && <Organisations category={sp.category} />}
      {tab === "documents" && <Documents isFounder={isFounder} />}
      {tab === "facts" && <Facts isFounder={isFounder} />}
      {tab === "sources" && <Sources />}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-outfit text-3xl font-black text-[#041635]">Procurement</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Tenders, commercial opportunities and partnerships. Nothing leaves CYVRIX from here: you approve an exact
        package, carry it out yourself on the portal or by email, and record the receipt. Status changes that need an
        approval or a receipt cannot be made without one.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- opportunities

async function Opportunities({ kind }: { kind?: string }) {
  const where = kind && ["commercial", "tender", "partnership", "assignment"].includes(kind) ? { kind } : {};
  const [rows, orgs] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      orderBy: [{ deadlineAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 200,
      include: { Buyer: { select: { name: true } }, _count: { select: { Evidence: true } } },
    }),
    prisma.organisation.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm">
        {["all", "tender", "commercial", "partnership", "assignment"].map((k) => (
          <Link key={k} href={`/admin/procurement?tab=opportunities${k === "all" ? "" : `&kind=${k}`}`} className={`${pill} ${(kind ?? "all") === k ? "bg-[#041635] text-white" : "bg-slate-100 text-slate-600"}`}>
            {k}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={`${card} text-sm text-slate-600`}>No opportunities yet. Add one below; official tender feeds arrive in Phase 2.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Opportunity</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline (London)</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/admin/procurement/opportunities/${o.id}`} className="font-semibold text-[#0f5aab] hover:underline">
                      {o.title}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {o.Buyer?.name ?? "No organisation"} · {o.confirmedBuying ? "confirmed buying" : "inferred prospect"} · {o._count.Evidence} evidence
                    </div>
                  </td>
                  <td className="px-4 py-3">{o.kind}</td>
                  <td className="px-4 py-3"><span className={`${pill} bg-slate-100 text-slate-700`}>{o.status}</span></td>
                  <td className="px-4 py-3 tabular-nums">{when(o.deadlineAt)}</td>
                  <td className="px-4 py-3">{o.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={createOpportunity} className={`${card} grid gap-4 md:grid-cols-2`}>
        <h2 className="font-outfit text-lg font-black text-[#041635] md:col-span-2">Record an opportunity</h2>
        <label className="space-y-1">
          <span className={label}>Kind</span>
          <select name="kind" className={field} defaultValue="tender">
            <option value="tender">Tender</option>
            <option value="commercial">Commercial lead</option>
            <option value="partnership">Partnership programme</option>
            <option value="assignment">Subcontract assignment</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>Where it came from</span>
          <select name="origin" className={field} defaultValue="manual">
            <option value="manual">Manual entry</option>
            <option value="chatgpt_task">ChatGPT 9 am report</option>
            <option value="paperclip">Paperclip agent research</option>
            <option value="website">Website enquiry</option>
            <option value="supplier_portal">Supplier or partner portal</option>
          </select>
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className={label}>Title</span>
          <input name="title" required minLength={3} maxLength={300} className={field} />
        </label>
        <label className="space-y-1">
          <span className={label}>Organisation</span>
          <select name="buyerOrganisationId" className={field} defaultValue="">
            <option value="">Not linked</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>Deadline (London time)</span>
          <input type="datetime-local" name="deadlineAt" className={field} />
        </label>
        <label className="space-y-1">
          <span className={label}>OCDS identifier (if a published notice)</span>
          <input name="ocid" placeholder="ocds-h6vhtk-…" className={field} />
        </label>
        <label className="space-y-1">
          <span className={label}>Region</span>
          <input name="region" maxLength={100} className={field} />
        </label>
        <label className="space-y-1">
          <span className={label}>Value from (£, as published)</span>
          <input name="valueMin" inputMode="decimal" className={field} />
        </label>
        <label className="space-y-1">
          <span className={label}>Value to (£, as published)</span>
          <input name="valueMax" inputMode="decimal" className={field} />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className={label}>Summary</span>
          <textarea name="summary" rows={3} maxLength={8000} className={field} />
        </label>
        <label className="space-y-1">
          <span className={label}>Evidence link</span>
          <input name="evidenceUrl" type="url" placeholder="https://…" className={field} />
        </label>
        <label className="space-y-1">
          <span className={label}>…or a short quote from the source</span>
          <input name="evidenceQuote" maxLength={1000} className={field} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" name="confirmedBuying" /> Confirmed buying opportunity (a published tender or a request), not an inferred prospect
        </label>
        <div className="md:col-span-2">
          <button className={primaryButton}>Record</button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- approvals

async function Approvals({ isFounder }: { isFounder: boolean }) {
  const now = new Date();
  const [waiting, recent] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { status: "pending" },
      orderBy: { expiresAt: "asc" },
      include: {
        Opportunity: { select: { id: true, title: true, deadlineAt: true } },
        Package: { include: { Item: { include: { DocumentVersion: { include: { Document: true } } } } } },
      },
    }),
    prisma.approvalDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { Request: { include: { Opportunity: { select: { id: true, title: true } } } }, ExecutionRecord: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      {!isFounder && (
        <p className={`${card} text-sm text-slate-600`}>Only the founder can decide approvals. You can see what is waiting.</p>
      )}
      {waiting.length === 0 ? (
        <p className={`${card} text-sm text-slate-600`}>Nothing is waiting for a decision.</p>
      ) : (
        waiting.map((r) => {
          const expired = r.expiresAt <= now;
          const price = r.priceSnapshot as { amount?: number; currency?: string; basis?: string } | null;
          const declarations = Array.isArray(r.declarations) ? (r.declarations as string[]) : [];
          return (
            <section key={r.id} className={`${card} space-y-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{ACTION_LABEL[r.actionType] ?? r.actionType}</p>
                  <h2 className="font-outfit text-xl font-black text-[#041635]">
                    <Link href={`/admin/procurement/opportunities/${r.Opportunity.id}`} className="hover:underline">{r.Opportunity.title}</Link>
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  {expired ? <span className="font-bold text-rose-700">Expired {when(r.expiresAt)}</span> : <>Valid until {when(r.expiresAt)}</>}
                  {" · "}deadline {when(r.Opportunity.deadlineAt)}
                </p>
              </div>
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div><dt className={label}>Destination</dt><dd className="break-all text-[#041635]">{r.destination}</dd></div>
                <div><dt className={label}>Package fingerprint</dt><dd className="font-mono text-xs">{r.manifestSha256}</dd></div>
                <div><dt className={label}>Price</dt><dd>{price?.amount !== undefined ? `£${price.amount.toLocaleString("en-GB")} — ${price.basis || "no basis given"}` : "No price in this package"}</dd></div>
                <div><dt className={label}>Package version</dt><dd>v{r.Package.version}</dd></div>
              </dl>
              <div>
                <h3 className={label}>Exact documents</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {r.Package.Item.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-2">
                      <a href={`/api/admin/procurement/documents/${i.documentVersionId}`} className="font-semibold text-[#0f5aab] hover:underline" target="_blank" rel="noreferrer">
                        {i.label}
                      </a>
                      <span className="text-xs text-slate-500">{VERSION_STATUS_LABEL[i.DocumentVersion.status] ?? i.DocumentVersion.status} · {short(i.sha256)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className={label}>Declarations you would be making</h3>
                {declarations.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">None recorded.</p>
                ) : (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[#041635]">{declarations.map((d, n) => <li key={n}>{d}</li>)}</ol>
                )}
              </div>
              {isFounder && !expired && (
                <form action={decideApprovalAction} className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[1fr_auto]">
                  <input type="hidden" name="requestId" value={r.id} />
                  <label className="space-y-1 md:col-span-2">
                    <span className={label}>Note (needed to reject or ask for changes)</span>
                    <textarea name="note" rows={2} maxLength={2000} className={field} />
                  </label>
                  <label className="space-y-1">
                    <span className={label}>Authenticator code</span>
                    <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className={`${field} max-w-40 tabular-nums`} />
                  </label>
                  <div className="flex flex-wrap items-end gap-2">
                    <button name="decision" value="approved" className={primaryButton}>Approve exactly this</button>
                    <button name="decision" value="revision_requested" className={secondaryButton}>Ask for changes</button>
                    <button name="decision" value="rejected" className={secondaryButton}>Reject</button>
                  </div>
                </form>
              )}
            </section>
          );
        })
      )}

      <section className={card}>
        <h2 className="font-outfit text-lg font-black text-[#041635]">Recent decisions</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {recent.map((d) => (
              <li key={d.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <Link href={`/admin/procurement/opportunities/${d.Request.Opportunity.id}`} className="font-semibold text-[#0f5aab] hover:underline">{d.Request.Opportunity.title}</Link>
                  {" · "}{ACTION_LABEL[d.Request.actionType] ?? d.Request.actionType}
                </span>
                <span className="text-slate-500">
                  {d.decision.replace("_", " ")} {when(d.createdAt)}
                  {d.ExecutionRecord ? ` · ${d.ExecutionRecord.outcome}` : d.decision === "approved" ? " · not yet carried out" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- organisations

async function Organisations({ category }: { category?: string }) {
  const where = category && CATEGORY_LABEL[category] ? { categories: { has: category } } : {};
  const orgs = await prisma.organisation.findMany({
    where,
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    include: { _count: { select: { Opportunity: true } } },
  });
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Research targets are not partners. An organisation is recorded here so its programmes and opportunities can be
        tracked; nothing on this page says CYVRIX has any relationship with it.
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/procurement?tab=organisations" className={`${pill} ${!category ? "bg-[#041635] text-white" : "bg-slate-100 text-slate-600"}`}>All ({orgs.length})</Link>
        {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
          <Link key={k} href={`/admin/procurement?tab=organisations&category=${k}`} className={`${pill} ${category === k ? "bg-[#041635] text-white" : "bg-slate-100 text-slate-600"}`}>{v}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Organisation</th><th className="px-4 py-3">Categories</th><th className="px-4 py-3">Opportunities</th><th className="px-4 py-3">Priority and target</th></tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3 font-semibold text-[#041635]">
                  {o.name}
                  {o.website && <div><a href={o.website} target="_blank" rel="noreferrer" className="text-xs font-normal text-[#0f5aab] hover:underline">{o.website}</a></div>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{o.categories.map((c) => CATEGORY_LABEL[c] ?? c).join(", ") || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{o._count.Opportunity}</td>
                <td className="px-4 py-3">
                  <form action={updateOrganisation} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <select name="priority" defaultValue={String(o.priority)} className={`${field} w-20`} aria-label={`Priority for ${o.name}`}>
                      {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isResearchTarget" defaultChecked={o.isResearchTarget} /> target</label>
                    <button className={secondaryButton}>Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={createOrganisation} className={`${card} grid gap-4 md:grid-cols-2`}>
        <h2 className="font-outfit text-lg font-black text-[#041635] md:col-span-2">Add an organisation</h2>
        <label className="space-y-1"><span className={label}>Name</span><input name="name" required maxLength={200} className={field} /></label>
        <label className="space-y-1"><span className={label}>Official website</span><input name="website" type="url" className={field} /></label>
        <fieldset className="space-y-1 md:col-span-2">
          <legend className={label}>Categories</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <label key={k} className="flex items-center gap-1"><input type="checkbox" name="categories" value={k} /> {v}</label>
            ))}
          </div>
        </fieldset>
        <label className="space-y-1"><span className={label}>Priority (1 highest)</span>
          <select name="priority" defaultValue="3" className={field}>{[1, 2, 3, 4, 5].map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        <label className="space-y-1"><span className={label}>Source of this entry</span><input name="sourceUrl" type="url" className={field} /></label>
        <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="isResearchTarget" /> Research target</label>
        <div className="md:col-span-2"><button className={primaryButton}>Add</button></div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- documents

async function Documents({ isFounder }: { isFounder: boolean }) {
  const now = new Date();
  const docs = await prisma.companyDocument.findMany({
    orderBy: { title: "asc" },
    include: { Version: { orderBy: { version: "desc" } } },
  });
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Stored privately. An AI draft is not evidence, and an AI-written policy is not proof its controls exist. Only
        independently issued certificates should be marked certified evidence.
      </p>
      {docs.length === 0 ? (
        <p className={`${card} text-sm text-slate-600`}>No documents yet.</p>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => {
            const latest = d.Version[0];
            const expired = latest?.expiresAt && latest.expiresAt < now;
            return (
              <li key={d.id} className={card}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold text-[#041635]">{d.title} <span className="text-xs font-normal text-slate-500">· {d.kind} · {d.classification}</span></h2>
                  {latest && (
                    <span className={`${pill} ${expired ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                      {expired ? "Expired" : VERSION_STATUS_LABEL[latest.status] ?? latest.status}
                    </span>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {d.Version.map((v) => (
                    <li key={v.id} className="flex flex-wrap gap-2">
                      <a href={`/api/admin/procurement/documents/${v.id}`} target="_blank" rel="noreferrer" className="text-[#0f5aab] hover:underline">v{v.version} {v.filename}</a>
                      <span className="text-xs text-slate-500">{when(v.createdAt)} · {short(v.sha256)}{v.expiresAt ? ` · expires ${when(v.expiresAt)}` : ""}</span>
                    </li>
                  ))}
                </ul>
                <UploadForm documentId={d.id} isFounder={isFounder} compact />
              </li>
            );
          })}
        </ul>
      )}
      <section className={card}>
        <h2 className="font-outfit text-lg font-black text-[#041635]">Upload a new document</h2>
        <UploadForm isFounder={isFounder} />
      </section>
    </div>
  );
}

function UploadForm({ documentId, isFounder, compact }: { documentId?: string; isFounder: boolean; compact?: boolean }) {
  return (
    <form action="/api/admin/procurement/documents" method="post" encType="multipart/form-data" className={`mt-3 grid gap-3 ${compact ? "md:grid-cols-[1fr_auto_auto]" : "md:grid-cols-2"}`}>
      {documentId && <input type="hidden" name="documentId" value={documentId} />}
      {!documentId && (
        <>
          <label className="space-y-1"><span className={label}>Title</span><input name="title" required maxLength={200} className={field} /></label>
          <label className="space-y-1"><span className={label}>Type</span><input name="kind" required placeholder="insurance, policy, accounts, capability…" maxLength={60} className={field} /></label>
          <label className="space-y-1"><span className={label}>Classification</span>
            <select name="classification" defaultValue="internal" className={field}><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="public">Public</option></select>
          </label>
          <label className="space-y-1"><span className={label}>Expires (insurance, certificates)</span><input type="date" name="expiresAt" className={field} /></label>
        </>
      )}
      <label className="space-y-1"><span className={label}>{documentId ? "New version" : "File"} (PDF, Word, ODT, RTF or text; up to 4 MB)</span>
        <input type="file" name="file" required accept=".pdf,.doc,.docx,.odt,.rtf,.txt" className="block text-sm" />
      </label>
      <label className="space-y-1"><span className={label}>This file is</span>
        <select name="status" defaultValue="verified" className={field}>
          <option value="verified">A verified existing document</option>
          <option value="ai_draft">An AI draft (not evidence)</option>
          {isFounder && <option value="founder_approved">Founder approved</option>}
          {isFounder && <option value="certified_evidence">Independently certified evidence</option>}
        </select>
      </label>
      <div className="flex items-end"><button className={compact ? secondaryButton : primaryButton}>Upload</button></div>
    </form>
  );
}

// ---------------------------------------------------------------- facts and sources

async function Facts({ isFounder }: { isFounder: boolean }) {
  const [facts, versions] = await Promise.all([
    prisma.companyFact.findMany({ orderBy: { key: "asc" }, include: { Evidence: { include: { Document: true } } } }),
    isFounder ? prisma.companyDocumentVersion.findMany({ where: { status: { in: [...EVIDENCE_STATUSES] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" }, take: 100, include: { Document: true } }) : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        The verified facts registration forms are filled from. Only the founder can add or change one. A fact not marked
        public is never placed on the website.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Fact</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Verified</th></tr></thead>
          <tbody>
            {facts.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-slate-500">None yet.</td></tr>}
            {facts.map((f) => (
              <tr key={f.key} className="border-t border-slate-100">
                <td className="px-4 py-3"><span className="font-semibold">{f.label}</span><div className="font-mono text-xs text-slate-500">{f.key}{f.publicAllowed ? "" : " · not public"}</div></td>
                <td className="px-4 py-3 whitespace-pre-wrap">{f.value}</td>
                <td className="px-4 py-3 text-xs">{f.Evidence ? `${f.Evidence.Document.title} v${f.Evidence.version}` : "—"}</td>
                <td className="px-4 py-3 text-xs">{when(f.verifiedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isFounder && (
        <form action={saveCompanyFact} className={`${card} grid gap-4 md:grid-cols-2`}>
          <h2 className="font-outfit text-lg font-black text-[#041635] md:col-span-2">Add or update a fact</h2>
          <label className="space-y-1"><span className={label}>Key</span><input name="key" required pattern="[a-z][a-z0-9_]{1,63}" placeholder="company_number" className={field} /></label>
          <label className="space-y-1"><span className={label}>Label</span><input name="label" required maxLength={120} className={field} /></label>
          <label className="space-y-1 md:col-span-2"><span className={label}>Value</span><textarea name="value" required rows={2} maxLength={2000} className={field} /></label>
          <label className="space-y-1"><span className={label}>Evidence document</span>
            <select name="evidenceVersionId" defaultValue="" className={field}>
              <option value="">None</option>
              {versions.map((v) => <option key={v.id} value={v.id}>{v.Document.title} v{v.version}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publicAllowed" /> May appear on the public website</label>
          <div className="md:col-span-2"><button className={primaryButton}>Save</button></div>
        </form>
      )}
    </div>
  );
}

async function Sources() {
  const sources = await prisma.opportunitySource.findMany({ orderBy: { key: "asc" } });
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Where opportunities come from. The official feeds are switched on in Phase 2. Leads marked ChatGPT 9 am report
        are only ever ones imported from that task, never ones researched elsewhere.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Source</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Last success</th><th className="px-4 py-3">Licence</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.key} className="border-t border-slate-100">
                <td className="px-4 py-3"><span className="font-semibold">{s.name}</span>{s.notes && <div className="text-xs text-slate-500">{s.notes}</div>}</td>
                <td className="px-4 py-3">{s.kind}</td>
                <td className="px-4 py-3">{s.enabled ? `on · ${s.health}` : "off"}</td>
                <td className="px-4 py-3">{when(s.lastSuccessAt)}</td>
                <td className="px-4 py-3 text-xs">{s.licence ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
