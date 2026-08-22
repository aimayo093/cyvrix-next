"use client";

import * as React from "react";
import { History, RotateCcw } from "lucide-react";

export type RestorablePage = {
  slug: string;
  label: string;
  summary: string;
  /** How many sections the reviewed version has. */
  reviewedCount: number;
  /** How many sections the page has right now, or null when no CMS page exists. */
  currentCount: number | null;
};

/**
 * Restores a page's sections from the reviewed content in
 * `lib/reviewed-page-content.ts`.
 *
 * Confirmation is deliberately explicit about what is replaced, because this
 * discards whatever an administrator currently has. The previous sections are
 * written to the audit log first, which the confirmation says so nobody thinks
 * the change is unrecoverable.
 */
export function RestoreReviewedContent({
  pages,
  action,
}: {
  pages: RestorablePage[];
  action: (formData: FormData) => void;
}) {
  if (pages.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
        <h3 className="flex items-center gap-2 font-outfit font-black text-slate-800">
          <History className="h-4 w-4 text-[#2691F0]" />
          Restore reviewed content
        </h3>
        <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-500">
          Each page below has a reviewed version written to the site&rsquo;s editorial standard: no
          certification we do not hold, no performance figure we cannot evidence, no client outcome.
          Restoring replaces that page&rsquo;s current sections with it. They stay fully editable
          afterwards, and the version being replaced is written to the audit log first.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {pages.map((page) => {
          const missing = page.currentCount === null;
          const replacing = page.currentCount ?? 0;

          return (
            <div key={page.slug} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-outfit text-sm font-black text-slate-800">{page.label}</span>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                    /{page.slug}
                  </code>
                  {missing ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                      No CMS page
                    </span>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {replacing} &rarr; {page.reviewedCount} sections
                    </span>
                  )}
                </div>
                <p className="mt-1.5 max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
                  {page.summary}
                </p>
              </div>

              {missing ? (
                <span className="shrink-0 text-xs font-semibold text-slate-400">
                  Create the page first
                </span>
              ) : (
                <form action={action} className="shrink-0">
                  <input type="hidden" name="slug" value={page.slug} />
                  <button
                    type="submit"
                    onClick={(event) => {
                      const confirmed = window.confirm(
                        `Replace the ${replacing} current section(s) on /${page.slug} with ${page.reviewedCount} reviewed section(s)?\n\n` +
                          "The sections being replaced are saved to the audit log first, so this can be reconstructed.\n\n" +
                          "The restored sections remain fully editable in this builder."
                      );
                      if (!confirmed) event.preventDefault();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#2691F0]/30 bg-[#2691F0]/5 px-4 py-2 text-xs font-black text-[#0f5aab] transition-colors hover:bg-[#2691F0] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
