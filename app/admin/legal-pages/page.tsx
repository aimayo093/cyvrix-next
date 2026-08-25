import Link from "next/link";
import { connection } from "next/server";
import { AlertCircle, CheckCircle2, ExternalLink, FileText, RotateCcw, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { saveLegalPage, restoreReviewedLegalPage } from "@/lib/admin-actions";
import { getDefaultLegalDocument } from "@/lib/legal-content";
import { toPublicLegalDocument } from "@/lib/public-legal";
import { findPublicLegalPageDefinition, publicLegalPageDefinitions } from "@/lib/legal-page-definitions";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Legal Pages" };

const defaultReviewNotice = "Final legal documents should be reviewed by a qualified legal professional.";

export default async function LegalPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; status?: string; message?: string }>;
}) {
  await connection();
  await requireAdmin();

  const [params, records] = await Promise.all([
    searchParams,
    prisma.legalPage.findMany({
      where: { slug: { in: publicLegalPageDefinitions.map((page) => page.slug) } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const selectedDefinition = findPublicLegalPageDefinition(params.edit || "") || publicLegalPageDefinitions[0];
  const selectedRecord = records.find((record) => record.slug === selectedDefinition.slug) || null;

  return (
    <div className="space-y-8 pb-16">
      {params.status && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${params.status === "success" ? "border-emerald-250 bg-emerald-50 text-emerald-800" : "border-rose-250 bg-rose-50 text-rose-800"}`}>
          {params.status === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
          <p className="text-xs font-semibold leading-relaxed">{params.message}</p>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-outfit text-3xl font-black text-[#041635]"><FileText className="h-8 w-8 text-[#2691F0]" />Legal Pages</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage the three public legal routes. Drafts remain private, and publication is guarded until reviewed content is ready.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800"><ShieldCheck className="h-4 w-4 shrink-0" />Legal review is required before publishing.</div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-5">
          <div className="divide-y divide-slate-100">
            {publicLegalPageDefinitions.map((page) => {
              const record = records.find((item) => item.slug === page.slug) || null;
              const isSelected = page.slug === selectedDefinition.slug;

              return (
                <div key={page.slug} className={isSelected ? "bg-blue-50/60" : "transition-colors hover:bg-slate-50/70"}>
                  <div className="flex gap-4 px-6 py-5">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#2691F0]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-black text-[#041635]">{page.title}</h2>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${record?.status === "PUBLISHED" ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-amber-100 bg-amber-50 text-amber-600"}`}>{record?.status === "PUBLISHED" ? "Published" : record ? "Draft" : "Not created"}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{page.description}</p>
                      {/*
                        What the record holds versus what the route serves.
                        toPublicLegalDocument rejects anything under 240
                        characters, so a stub in the CMS leaves the public page
                        showing the reviewed wording instead, and an edit here
                        looks like it did nothing.
                      */}
                      {record && !toPublicLegalDocument(record) && getDefaultLegalDocument(page.slug) && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                          <p className="text-[11px] font-bold leading-5 text-amber-900">
                            This record is too short to publish, so {page.route} is serving the reviewed
                            wording instead. What you edit here is not what visitors see.
                          </p>
                          <form action={restoreReviewedLegalPage} className="mt-2">
                            <input type="hidden" name="slug" value={page.slug} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-black text-amber-900 transition-colors hover:bg-amber-100"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Load the reviewed wording into this record
                            </button>
                          </form>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold">
                        <Link href={`/admin/legal-pages?edit=${page.slug}`} className="text-[#2691F0] hover:text-[#041635]">Edit document</Link>
                        <Link href={page.route} target="_blank" className="inline-flex items-center gap-1 text-slate-500 hover:text-[#041635]">View public route <ExternalLink className="h-3.5 w-3.5" /></Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="lg:col-span-7">
          <form action={saveLegalPage} className="sticky top-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="slug" value={selectedDefinition.slug} />
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2691F0]">Editing public route</p>
                <h2 className="mt-1 font-outfit text-xl font-black text-[#041635]">{selectedDefinition.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedDefinition.route}</p>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${selectedRecord?.status === "PUBLISHED" ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-amber-100 bg-amber-50 text-amber-600"}`}>{selectedRecord?.status === "PUBLISHED" ? "Currently public" : "Private draft"}</span>
            </div>

            <label className="block text-xs font-bold text-slate-700">Document title
              <input required name="title" defaultValue={selectedRecord?.title || selectedDefinition.title} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-[#041635] outline-none focus:ring-2 focus:ring-[#2691F0]" />
            </label>

            <label className="block text-xs font-bold text-slate-700">Reviewed legal content
              <textarea required name="body" rows={18} defaultValue={selectedRecord?.body || ""} placeholder="Paste the reviewed plain-text legal document here. Do not use this field for CMS notes or placeholders." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-[#041635] outline-none focus:ring-2 focus:ring-[#2691F0]" />
              <span className="mt-1.5 block text-[11px] font-medium leading-5 text-slate-400">A publishable document needs substantive content. HTML is not rendered on the public site.</span>
            </label>

            <label className="block text-xs font-bold text-slate-700">Review notice (optional)
              <textarea name="reviewNotice" rows={3} defaultValue={selectedRecord?.reviewNotice || defaultReviewNotice} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-[#041635] outline-none focus:ring-2 focus:ring-[#2691F0]" />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-xs font-bold text-slate-700">Publication status
                <select name="status" defaultValue={selectedRecord?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#041635] outline-none focus:ring-2 focus:ring-[#2691F0]">
                  <option value="DRAFT">Save as private draft</option>
                  <option value="PUBLISHED">Publish to the public route</option>
                </select>
              </label>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-600">
                <input name="legalReviewConfirmed" value="true" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0]" />
                <span>I confirm this exact document has been reviewed and approved for public publication by the appropriate legal reviewer. This confirmation is required when publishing.</span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link href={selectedDefinition.route} target="_blank" className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200">Preview public route</Link>
              <button type="submit" className="rounded-xl bg-[#041635] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2691F0]">Save legal document</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
