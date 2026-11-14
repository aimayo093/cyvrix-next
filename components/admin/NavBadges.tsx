import * as React from "react";
import { connection } from "next/server";
import { loadNavCounts } from "@/lib/dashboard/loaders";
import { pendingDraftCount } from "@/lib/agent-drafts";

/**
 * Live counts beside Enquiries and Tickets in the admin sidebar.
 *
 * Each badge streams inside its own Suspense boundary (passed in from the
 * admin layout), so a slow count never holds up the navigation. `cache` makes
 * the two badges share one set of queries per request. A count that cannot be
 * read renders nothing — never a zero.
 */
const navCounts = React.cache(async () => {
  await connection();
  return loadNavCounts(new Date());
});

function Badge({ count, urgent, label }: { count: number; urgent: boolean; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
        urgent ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

export async function EnquiriesBadge() {
  const counts = await navCounts();
  if (!counts.ok) return null;
  return <Badge count={counts.data.enquiries} urgent={false} label="new enquiries" />;
}

export async function TicketsBadge() {
  const counts = await navCounts();
  if (!counts.ok) return null;
  const { tickets, overdueTickets } = counts.data;
  return (
    <Badge
      count={tickets}
      urgent={overdueTickets > 0}
      label={overdueTickets > 0 ? `tickets waiting, ${overdueTickets} overdue` : "tickets waiting"}
    />
  );
}

/** AI drafts waiting for review. Nothing when the table cannot be read. */
export async function DraftsBadge() {
  await connection();
  const count = await pendingDraftCount().catch(() => null);
  if (count === null) return null;
  return <Badge count={count} urgent={false} label="AI drafts waiting for review" />;
}
