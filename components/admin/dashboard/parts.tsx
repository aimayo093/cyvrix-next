import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { sparklinePoints } from "@/lib/dashboard/series";
import type { RangeDays } from "@/lib/dashboard/time";

/**
 * Small building blocks for the Today page. Server components; no state.
 * Light admin surfaces per DESIGN.md: white card, slate border, ink #041635.
 */

export const CARD = "rounded-2xl border border-slate-200 bg-white";

export function BlockSkeleton({ className = "h-40" }: { className?: string }) {
  return <div className={`${CARD} ${className} animate-pulse`} aria-hidden="true" />;
}

/** In place of a block whose data could not be read. Never a zero. */
export function BlockError({ what }: { what: string }) {
  return (
    <p className="flex items-start gap-2 text-sm font-semibold text-amber-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {what} could not be read. Reload to try again.
    </p>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length === 0) return null;
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-3 h-6 w-full" role="img" aria-label={label}>
      <polyline
        points={sparklinePoints(values, 100, 22)}
        transform="translate(0 1)"
        fill="none"
        stroke="#2691F0"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  href,
  trend,
  trendLabel,
  note,
}: {
  label: string;
  value: number | null;
  /** Where the figure is managed. Omitted when there is no admin page for it. */
  href?: string;
  trend?: number[];
  trendLabel?: string;
  note?: React.ReactNode;
}) {
  const body = (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-outfit text-3xl font-black tabular-nums text-[#041635]">
        {value === null ? "—" : value.toLocaleString("en-GB")}
      </p>
      {trend && trend.length > 0 && <Sparkline values={trend} label={trendLabel ?? `${label} trend`} />}
      {note && <p className="mt-2 text-xs font-semibold text-slate-500">{note}</p>}
    </>
  );
  if (!href) return <div className={`${CARD} p-4`}>{body}</div>;
  return (
    <Link
      href={href}
      className={`${CARD} block p-4 transition-colors hover:border-[#2691F0]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]`}
    >
      {body}
    </Link>
  );
}

export function RangeLinks({ current }: { current: RangeDays }) {
  return (
    <nav aria-label="Period" className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      {([7, 30, 90] as const).map((range) => (
        <Link
          key={range}
          href={`/admin?range=${range}`}
          aria-current={range === current ? "page" : undefined}
          className={`flex min-h-9 items-center rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] ${
            range === current ? "bg-[#041635] text-white" : "text-slate-500 hover:text-[#041635]"
          }`}
        >
          {range} days
        </Link>
      ))}
    </nav>
  );
}

/** "Mon 9 Nov" from a `YYYY-MM-DD` key. */
export function dayLabel(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
