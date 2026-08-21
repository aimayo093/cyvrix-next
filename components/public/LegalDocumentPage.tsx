import Link from "next/link";
import { ArrowRight, FileText, type LucideIcon } from "lucide-react";
import type { PublicLegalDocument } from "@/lib/public-legal";

/** Stable anchor id from a section heading. */
function sectionId(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type LegalDocumentPageProps = {
  title: string;
  eyebrow: string;
  summary: string;
  icon: LucideIcon;
  document: PublicLegalDocument | null;
};

export function LegalDocumentPage({ title, eyebrow, summary, icon: Icon, document }: LegalDocumentPageProps) {
  const publishedTitle = document?.title || title;

  return (
    <div className="min-h-screen bg-[#020817] pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">
            <Icon className="h-3.5 w-3.5" />
            {eyebrow}
          </span>
          <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-5xl">{publishedTitle}</h1>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-relaxed text-slate-200">{summary}</p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-5 py-14">
        {document ? (
          <article className="rounded-3xl border border-white/10 bg-[#071126] p-7 md:p-10">
            {document.lastReviewed && (
              <p className="mb-8 border-b border-white/10 pb-6 text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">
                Last reviewed {document.lastReviewed}
              </p>
            )}

            {document.sections && document.sections.length > 0 ? (
              <>
                {/* On-page contents: legal documents are referred to, not read start to finish. */}
                <nav aria-label="Contents" className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Contents</p>
                  <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                    {document.sections.map((section, index) => (
                      <li key={section.heading}>
                        <a
                          href={`#${sectionId(section.heading)}`}
                          className="text-sm font-semibold text-slate-300 transition-colors hover:text-[#7ab8f4]"
                        >
                          <span className="tabular-nums text-slate-500">{String(index + 1).padStart(2, "0")}. </span>
                          {section.heading}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>

                <div className="space-y-10">
                  {document.sections.map((section) => (
                    <section key={section.heading} id={sectionId(section.heading)} className="scroll-mt-28">
                      <h2 className="font-outfit text-2xl font-black tracking-tight text-white">{section.heading}</h2>
                      <div className="mt-4 space-y-4 text-base font-medium leading-8 text-slate-300">
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={`${index}-${paragraph.slice(0, 32)}`}>{paragraph}</p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6 text-base font-medium leading-8 text-slate-200 md:text-lg">
                {document.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 32)}`}>{paragraph}</p>)}
              </div>
            )}
            {document.reviewNotice && (
              <aside className="mt-10 border-t border-white/10 pt-6 text-sm font-medium leading-relaxed text-slate-300">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">Important information</p>
                <p className="mt-3">{document.reviewNotice}</p>
              </aside>
            )}
          </article>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-[#071126] p-8 text-center md:p-12">
            <FileText className="mx-auto h-8 w-8 text-[#7ab8f4]" />
            <h2 className="mt-5 font-outfit text-3xl font-black text-white">Reviewed content has not yet been published.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
              CYVRIX does not present draft or incomplete material as a final legal document. This page will display the reviewed version once it is available.
            </p>
            <Link href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white">
              Make a general enquiry <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
