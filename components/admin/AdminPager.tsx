import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const ADMIN_PAGE_SIZE = 50;

/** Reads `?page=` as a 1-based page number; anything unusable is page 1. */
export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

/**
 * Previous / next links for an admin list. `buildHref` receives the page
 * number so each list keeps its own filters in the URL.
 */
export function AdminPager({
  page,
  total,
  pageSize = ADMIN_PAGE_SIZE,
  buildHref,
  noun,
}: {
  page: number;
  total: number;
  pageSize?: number;
  buildHref: (page: number) => string;
  noun: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const linkClass =
    "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#041635] transition-colors hover:bg-slate-50";
  const disabledClass =
    "inline-flex items-center gap-1 rounded-lg border border-slate-100 px-3 py-1.5 text-xs font-bold text-slate-300";

  return (
    <nav aria-label={`${noun} pages`} className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3">
      <p className="text-xs font-semibold text-slate-500">
        {first}–{last} of {total} {noun}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={linkClass}>
            <ChevronLeft className="h-3.5 w-3.5" /> Newer
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <ChevronLeft className="h-3.5 w-3.5" /> Newer
          </span>
        )}
        {page < pages ? (
          <Link href={buildHref(page + 1)} className={linkClass}>
            Older <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Older <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
