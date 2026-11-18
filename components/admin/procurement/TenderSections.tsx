import * as React from "react";
import { card, field, label, pill, primaryButton, secondaryButton, short, when } from "@/components/admin/procurement/ui";
import {
  fetchTenderDocumentAction,
  refreshTenderDocumentsAction,
  saveRequirementAction,
  setDeadlinesAction,
} from "@/lib/procurement/actions";
import { URGENCY_LABEL, urgency, type Urgency } from "@/lib/procurement/deadlines";
import {
  REQUIREMENT_KIND_LABEL,
  REQUIREMENT_KINDS,
  REQUIREMENT_STATUS_LABEL,
  REQUIREMENT_STATUSES,
  summarise,
} from "@/lib/procurement/requirements";
import { fetchRefusal } from "@/lib/procurement/tender-documents";

/**
 * Phase 4 sections of the opportunity page: dates, tender documents and the
 * requirements checklist (docs/procurement, spec sections 11 and 13).
 */

export const URGENCY_STYLE: Record<Urgency, string> = {
  passed: "bg-slate-200 text-slate-700",
  within_2_days: "bg-rose-100 text-rose-800",
  within_7_days: "bg-amber-100 text-amber-800",
  within_14_days: "bg-sky-50 text-sky-800",
};

/** A UTC date as the value of a London datetime-local input. */
function londonInput(d: Date | null): string {
  if (!d) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function DateLine({ title, at, now }: { title: string; at: Date | null; now: Date }) {
  const u = at ? urgency(at, now) : null;
  return (
    <div>
      <p className={label}>{title}</p>
      <p className="mt-1 tabular-nums">
        {when(at)} {u && <span className={`${pill} ${URGENCY_STYLE[u]} ml-1`}>{URGENCY_LABEL[u]}</span>}
      </p>
    </div>
  );
}

export function DatesSection({ opp, now }: { opp: { id: string; deadlineAt: Date | null; clarificationDeadlineAt: Date | null }; now: Date }) {
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="font-outfit text-lg font-black text-[#041635]">Dates</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <DateLine title="Submission deadline (London)" at={opp.deadlineAt} now={now} />
        <DateLine title="Last day for questions (London)" at={opp.clarificationDeadlineAt} now={now} />
      </div>
      <p className="text-sm text-slate-500">
        Dates from a notice are updated when the buyer publishes a change, and every change is kept in the history.
        Set them here for leads and quotes without a notice, or when the notice left one out.
      </p>
      <form action={setDeadlinesAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="opportunityId" value={opp.id} />
        <label className="space-y-1"><span className={label}>Submission deadline</span><input type="datetime-local" name="deadlineAt" defaultValue={londonInput(opp.deadlineAt)} className={field} /></label>
        <label className="space-y-1"><span className={label}>Last day for questions</span><input type="datetime-local" name="clarificationDeadlineAt" defaultValue={londonInput(opp.clarificationDeadlineAt)} className={field} /></label>
        <div className="self-end"><button className={secondaryButton}>Save dates</button></div>
      </form>
    </section>
  );
}

type TenderDoc = {
  id: string;
  title: string;
  documentType: string | null;
  sourceUrl: string | null;
  origin: string;
  status: string;
  refusal: string | null;
  sha256: string | null;
  sizeBytes: number | null;
  storedAt: Date | null;
};

const DOC_STATUS_STYLE: Record<string, string> = {
  listed: "bg-slate-100 text-slate-600",
  stored: "bg-emerald-50 text-emerald-700",
  refused: "bg-amber-50 text-amber-800",
};

export function TenderDocumentsSection({ opp, docs }: { opp: { id: string; ocid: string | null }; docs: TenderDoc[] }) {
  return (
    <section className={`${card} space-y-3`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-outfit text-lg font-black text-[#041635]">Tender documents</h2>
        {opp.ocid && (
          <form action={refreshTenderDocumentsAction}>
            <input type="hidden" name="opportunityId" value={opp.id} />
            <button className={secondaryButton}>List documents from the notice</button>
          </form>
        )}
      </div>
      <p className="text-sm text-slate-500">
        The buyer&apos;s documents, kept apart from CYVRIX evidence. The site fetches a copy only from the official notice
        services. Most buyers publish documents on their own e-tendering portal, which needs a sign-in: open the link,
        download the file yourself and upload it here. Every file is checked before it is stored; an antivirus scan
        runs as well when one is configured.
      </p>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-500">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {docs.map((d) => {
            const refusal = d.sourceUrl ? fetchRefusal(d.sourceUrl) : "No link.";
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold text-[#041635]">
                    {d.status === "stored" ? (
                      <a href={`/api/admin/procurement/tender-documents/${d.id}`} target="_blank" rel="noreferrer" className="text-[#0f5aab] hover:underline">{d.title}</a>
                    ) : (
                      d.title
                    )}
                    <span className={`${pill} ${DOC_STATUS_STYLE[d.status] ?? ""} ml-2`}>{d.status}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.documentType ?? "document"} · {d.origin === "upload" ? "uploaded" : "from the notice"}
                    {d.status === "stored" ? ` · ${short(d.sha256)} · ${Math.ceil((d.sizeBytes ?? 0) / 1024)} KB · ${when(d.storedAt)}` : ""}
                  </p>
                  {d.sourceUrl && <a href={d.sourceUrl} target="_blank" rel="noreferrer noopener" className="block break-all text-xs text-[#0f5aab] hover:underline">{d.sourceUrl}</a>}
                  {d.status === "refused" && d.refusal && <p className="text-xs text-amber-800">{d.refusal}</p>}
                </div>
                {d.status !== "stored" && !refusal && (
                  <form action={fetchTenderDocumentAction}>
                    <input type="hidden" name="documentId" value={d.id} />
                    <button className={secondaryButton}>Fetch a copy</button>
                  </form>
                )}
                {d.status === "listed" && refusal && (
                  <p className="w-full text-xs text-amber-800">Not fetched by the site: {refusal}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form action="/api/admin/procurement/tender-documents" method="post" encType="multipart/form-data" className="grid gap-2 md:grid-cols-2">
        <input type="hidden" name="opportunityId" value={opp.id} />
        <label className="space-y-1"><span className={label}>File (PDF, Word, ODT, RTF or text, up to 4 MB)</span><input type="file" name="file" required className={field} /></label>
        <label className="space-y-1"><span className={label}>Title</span><input name="title" required minLength={2} maxLength={300} className={field} /></label>
        <label className="space-y-1"><span className={label}>Link it came from (fills a listed document)</span><input name="sourceUrl" type="url" placeholder="https://…" className={field} /></label>
        <label className="space-y-1"><span className={label}>Type (optional)</span><input name="documentType" maxLength={80} placeholder="specification, questionnaire…" className={field} /></label>
        <div className="md:col-span-2"><button className={secondaryButton}>Upload tender document</button></div>
      </form>
    </section>
  );
}

type Requirement = {
  id: string;
  ref: string | null;
  text: string;
  kind: string;
  status: string;
  sourceDocumentId: string | null;
  location: string | null;
  evidenceVersionId: string | null;
  notes: string | null;
  /** false when the linked evidence has since expired or been superseded. */
  evidenceCurrent?: boolean;
  Evidence?: { id: string; Document: { title: string } } | null;
};

const REQ_STATUS_STYLE: Record<string, string> = {
  unknown: "bg-slate-100 text-slate-600",
  met: "bg-emerald-50 text-emerald-700",
  partly_met: "bg-amber-50 text-amber-800",
  not_met: "bg-rose-100 text-rose-800",
  not_applicable: "bg-slate-100 text-slate-500",
};

function RequirementFields({ r, opportunityId, docs, evidenceOptions }: { r?: Requirement; opportunityId: string; docs: { id: string; title: string }[]; evidenceOptions: React.ReactNode }) {
  return (
    <>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {r && <input type="hidden" name="id" value={r.id} />}
      <label className="space-y-1"><span className={label}>Buyer&apos;s reference</span><input name="ref" maxLength={40} defaultValue={r?.ref ?? ""} placeholder="SQ 4.2" className={field} /></label>
      <label className="space-y-1">
        <span className={label}>Kind</span>
        <select name="kind" defaultValue={r?.kind ?? "mandatory"} className={field}>
          {REQUIREMENT_KINDS.map((k) => <option key={k} value={k}>{REQUIREMENT_KIND_LABEL[k]}</option>)}
        </select>
      </label>
      <label className="space-y-1 md:col-span-2"><span className={label}>Requirement, as the buyer wrote it</span><textarea name="text" required minLength={3} maxLength={2000} rows={2} defaultValue={r?.text ?? ""} className={field} /></label>
      <label className="space-y-1">
        <span className={label}>Source document</span>
        <select name="sourceDocumentId" defaultValue={r?.sourceDocumentId ?? ""} className={field}>
          <option value="">Not linked</option>
          {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </label>
      <label className="space-y-1"><span className={label}>Page or section</span><input name="location" maxLength={120} defaultValue={r?.location ?? ""} className={field} /></label>
      <label className="space-y-1">
        <span className={label}>Does CYVRIX meet it?</span>
        <select name="status" defaultValue={r?.status ?? "unknown"} className={field}>
          {REQUIREMENT_STATUSES.map((s) => <option key={s} value={s}>{REQUIREMENT_STATUS_LABEL[s]}</option>)}
        </select>
      </label>
      <label className="space-y-1">
        <span className={label}>Evidence document</span>
        <select name="evidenceVersionId" defaultValue={r?.evidenceVersionId ?? ""} className={field}>
          <option value="">None</option>
          {/* The lapsed document stays visible so it can be seen and replaced; the server refuses to save it again. */}
          {r?.evidenceCurrent === false && r.evidenceVersionId && (
            <option value={r.evidenceVersionId}>{r.Evidence?.Document.title ?? "Linked document"} (expired or replaced: choose a current one)</option>
          )}
          {evidenceOptions}
        </select>
        {r?.evidenceCurrent === false && <span className="text-xs text-amber-800">This evidence has expired or been replaced, so the requirement counts as open.</span>}
      </label>
      <label className="space-y-1 md:col-span-2"><span className={label}>Notes</span><textarea name="notes" maxLength={2000} rows={1} defaultValue={r?.notes ?? ""} className={field} /></label>
    </>
  );
}

export function RequirementsSection({
  opp,
  rows,
  docs,
  evidenceOptions,
}: {
  opp: { id: string; kind: string };
  rows: Requirement[];
  docs: { id: string; title: string }[];
  evidenceOptions: React.ReactNode;
}) {
  const s = summarise(rows);
  return (
    <section id="requirements" className={`${card} space-y-3`}>
      <h2 className="font-outfit text-lg font-black text-[#041635]">Requirements checklist</h2>
      <p className="text-sm text-slate-500">
        Enter each requirement from the tender documents, word for word, with where it came from. A mandatory
        requirement is met only with the evidence document that shows it. Final approval is refused while any
        mandatory requirement is unchecked, partly met or not met{opp.kind === "tender" ? ", or before any are recorded" : ""}.
      </p>
      <p className="text-sm">
        <span className="font-semibold">{s.recorded}</span> recorded · <span className="font-semibold">{s.mandatory}</span> mandatory ·{" "}
        <span className={s.mandatoryOpen ? "font-semibold text-amber-800" : ""}>{s.mandatoryOpen} still open</span> ·{" "}
        <span className={s.mandatoryNotMet ? "font-semibold text-rose-700" : ""}>{s.mandatoryNotMet} not met</span>
      </p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <details className="rounded-xl border border-slate-200 p-3 text-sm">
              <summary className="cursor-pointer">
                <span className={`${pill} ${REQ_STATUS_STYLE[r.status] ?? ""} mr-2`}>{REQUIREMENT_STATUS_LABEL[r.status as keyof typeof REQUIREMENT_STATUS_LABEL] ?? r.status}</span>
                {r.status === "met" && r.evidenceCurrent === false && <span className={`${pill} bg-amber-100 text-amber-800 mr-2`}>evidence lapsed</span>}
                <span className="text-xs font-semibold uppercase text-slate-500">{r.kind}</span>{" "}
                {r.ref ? <span className="font-semibold">{r.ref}: </span> : null}
                {r.text}
              </summary>
              <form action={saveRequirementAction} className="mt-3 grid gap-2 md:grid-cols-2">
                <RequirementFields r={r} opportunityId={opp.id} docs={docs} evidenceOptions={evidenceOptions} />
                <div className="md:col-span-2"><button className={secondaryButton}>Save</button></div>
              </form>
            </details>
          </li>
        ))}
      </ul>
      <details className="rounded-xl border border-dashed border-slate-300 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#041635]">Add a requirement</summary>
        <form action={saveRequirementAction} className="mt-3 grid gap-2 md:grid-cols-2">
          <RequirementFields opportunityId={opp.id} docs={docs} evidenceOptions={evidenceOptions} />
          <div className="md:col-span-2"><button className={primaryButton}>Add requirement</button></div>
        </form>
      </details>
    </section>
  );
}
