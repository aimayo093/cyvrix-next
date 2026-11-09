import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { loadRecentActivity, loadSecuritySummary, loadWebsiteActivity } from "@/lib/dashboard/loaders";
import { QUEUE_LIMIT, summarySentence, type QueueKind } from "@/lib/dashboard/queue";
import { seriesTotal, type DayCount } from "@/lib/dashboard/series";
import { ageLabel, greeting, type RangeDays } from "@/lib/dashboard/time";
import { todayQueue, todayTiles, todayTraffic, todayViewer } from "./data";
import { BlockError, CARD, dayLabel, RangeLinks, StatTile } from "./parts";
import { RunScanButton } from "./RunScanButton";

// ── Header ─────────────────────────────────────────────────────────────────

export async function TodayHeader({ range }: { range: RangeDays }) {
  const [viewer, queue] = await Promise.all([todayViewer(), todayQueue()]);
  const now = new Date();
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-outfit text-3xl font-black text-balance text-[#041635]">
          {greeting(now, viewer.name)}
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {queue.ok ? summarySentence(queue.data, now) : "The work queue could not be read."}
        </p>
      </div>
      <RangeLinks current={range} />
    </div>
  );
}

// ── Tiles ──────────────────────────────────────────────────────────────────

const counts = (series: DayCount[]) => series.map((day) => day.count);

export async function TilesBlock({ range }: { range: RangeDays }) {
  const [tiles, traffic, viewer] = await Promise.all([todayTiles(range), todayTraffic(range), todayViewer()]);
  const data = tiles.ok ? tiles.data : null;
  const unread = !tiles.ok ? "Could not be read" : undefined;

  const trafficNote =
    traffic.state === "not_configured" ? (
      <span title="Set VERCEL_ANALYTICS_TOKEN — see DEPLOYMENT.md">Not connected</span>
    ) : traffic.state === "unavailable" ? (
      "Could not reach Vercel Analytics"
    ) : traffic.traffic.availableDays === 0 ? (
      "Vercel Web Analytics · no visits recorded yet"
    ) : traffic.traffic.availableDays < range ? (
      `Vercel Web Analytics, production · last ${traffic.traffic.availableDays} days available`
    ) : (
      "Vercel Web Analytics, production"
    );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatTile
        label="New enquiries"
        value={data?.enquiries.total ?? null}
        href="/admin/leads-crm"
        trend={data ? counts(data.enquiries.daily) : undefined}
        trendLabel={`Enquiries per day over ${range} days`}
        note={unread ?? `Last ${range} days`}
      />
      <StatTile
        label="Open tickets"
        value={data?.openTickets.now ?? null}
        href="/admin/ticket-management"
        trend={data ? counts(data.openTickets.daily) : undefined}
        trendLabel={`Tickets opened per day over ${range} days`}
        note={unread ?? "Now · trend is tickets opened"}
      />
      {viewer.canSeeSecurity && (
        <StatTile
          label="Security score"
          value={data?.security.score ?? null}
          href="/admin/security-center"
          trend={data && data.security.history.length > 1 ? data.security.history : undefined}
          trendLabel={`Security score of each scan over ${range} days`}
          note={unread ?? (data?.security.score === null ? "No scan in this period" : "Latest scan")}
        />
      )}
      <StatTile
        label="Newsletter"
        value={data?.newsletter.now ?? null}
        href="/admin/email"
        trend={data ? counts(data.newsletter.daily) : undefined}
        trendLabel={`Sign-ups per day over ${range} days`}
        note={unread ?? "Subscribed now · trend is sign-ups"}
      />
      <StatTile
        label="Website visitors"
        value={traffic.state === "ok" ? traffic.traffic.visitors : null}
        trend={traffic.state === "ok" ? counts(traffic.traffic.daily) : undefined}
        trendLabel={`Visitors per day over ${range} days`}
        note={trafficNote}
      />
    </div>
  );
}

// ── Queue ──────────────────────────────────────────────────────────────────

const KIND_META: Record<QueueKind, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-rose-50 text-rose-700 border-rose-200" },
  follow_up: { label: "Follow up", className: "bg-amber-50 text-amber-800 border-amber-200" },
  ticket: { label: "Ticket", className: "bg-slate-50 text-slate-600 border-slate-200" },
  enquiry: { label: "Enquiry", className: "bg-[#2691F0]/10 text-[#0f5aab] border-[#2691F0]/20" },
};

export async function QueueBlock() {
  const queue = await todayQueue();
  const now = new Date();
  return (
    <section aria-labelledby="queue-heading" className={`${CARD} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="queue-heading" className="font-outfit text-lg font-black text-[#041635]">
          Needs you
        </h2>
        {queue.ok && queue.data.length > QUEUE_LIMIT && (
          <span className="text-xs font-semibold text-slate-500">
            Showing {QUEUE_LIMIT} of {queue.data.length}
          </span>
        )}
      </div>
      {!queue.ok ? (
        <BlockError what="The work queue" />
      ) : queue.data.length === 0 ? (
        <p className="flex items-center gap-2 py-6 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Nothing is waiting on you.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {queue.data.slice(0, QUEUE_LIMIT).map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
              >
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold ${KIND_META[item.kind].className}`}
                >
                  {KIND_META[item.kind].label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#041635]">{item.title}</span>
                  {item.detail && <span className="block truncate text-xs text-slate-500">{item.detail}</span>}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">
                  {ageLabel(item.since, now)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold">
        <Link href="/admin/leads-crm" className="text-[#0f5aab] hover:underline">
          All enquiries
        </Link>
        <Link href="/admin/ticket-management" className="text-[#0f5aab] hover:underline">
          All tickets
        </Link>
      </div>
    </section>
  );
}

// ── Security ───────────────────────────────────────────────────────────────

export async function SecurityBlock() {
  // Roles that cannot open the Security Centre do not see its posture here.
  const viewer = await todayViewer();
  if (!viewer.canSeeSecurity) return null;
  const summary = await loadSecuritySummary();
  const urgent = summary.ok && summary.data && ["critical", "high"].includes(summary.data.highestSeverity ?? "");
  const Icon = urgent ? ShieldAlert : ShieldCheck;
  return (
    <section aria-labelledby="security-heading" className={`${CARD} p-5`}>
      <h2 id="security-heading" className="flex items-center gap-2 font-outfit text-lg font-black text-[#041635]">
        <Icon className={`h-5 w-5 ${urgent ? "text-rose-600" : "text-emerald-600"}`} aria-hidden="true" />
        Security
      </h2>
      <div className="mt-2 space-y-1 text-sm font-semibold text-slate-600">
        {!summary.ok ? (
          <BlockError what="The last scan" />
        ) : !summary.data ? (
          <p>No scan has run yet.</p>
        ) : (
          <>
            <p>
              Scanned {formatDistanceToNow(summary.data.ranAt, { addSuffix: true })} · score{" "}
              <span className="tabular-nums">{summary.data.score}</span>
            </p>
            <p className={urgent ? "text-rose-700" : undefined}>
              {summary.data.highestSeverity && summary.data.highestSeverity !== "info"
                ? `Highest open finding: ${summary.data.highestSeverity}`
                : "No open findings above information level"}
            </p>
          </>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/security-center"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2691F0] px-4 text-sm font-bold text-white transition-colors hover:bg-[#1678CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2"
        >
          Open Security Centre
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <RunScanButton />
      </div>
    </section>
  );
}

// ── Website ────────────────────────────────────────────────────────────────

export async function WebsiteBlock({ range }: { range: RangeDays }) {
  const [activity, traffic] = await Promise.all([loadWebsiteActivity(), todayTraffic(range)]);
  return (
    <section aria-labelledby="website-heading" className={`${CARD} p-5`}>
      <h2 id="website-heading" className="font-outfit text-lg font-black text-[#041635]">
        Website
      </h2>
      {!activity.ok ? (
        <div className="mt-2">
          <BlockError what="Recent site changes" />
        </div>
      ) : (
        <>
          {activity.data.blogDrafts > 0 && (
            <p className="mt-2 text-sm font-semibold text-slate-600">
              <Link href="/admin/blog-and-insights" className="text-[#0f5aab] hover:underline">
                {activity.data.blogDrafts} blog {activity.data.blogDrafts === 1 ? "draft" : "drafts"} not published
              </Link>
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {activity.data.edits.length === 0 && (
              <li className="text-sm font-semibold text-slate-500">No content changes recorded yet.</li>
            )}
            {activity.data.edits.map((edit, index) => (
              <li key={index} className="text-sm">
                <span className="font-semibold text-[#041635]">{edit.what}</span>
                <span className="block text-xs text-slate-500">
                  {edit.who} · {formatDistanceToNow(edit.when, { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {traffic.state === "ok" && traffic.traffic.topPages.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Top pages, {range} days</p>
          <ol className="mt-2 space-y-1">
            {traffic.traffic.topPages.map((page) => (
              <li key={page.path} className="flex justify-between gap-3 text-sm">
                <span className="truncate font-mono text-xs text-slate-700">{page.path}</span>
                <span className="shrink-0 tabular-nums text-xs font-semibold text-slate-500">
                  {page.pageviews.toLocaleString("en-GB")} views
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// ── Chart ──────────────────────────────────────────────────────────────────

const CHART_W = 600;
const CHART_H = 160;

function linePoints(series: DayCount[], max: number): string {
  const step = series.length > 1 ? CHART_W / (series.length - 1) : 0;
  return series
    .map((day, index) => `${(index * step).toFixed(1)},${(CHART_H - (max === 0 ? 0 : (day.count / max) * (CHART_H - 8))).toFixed(1)}`)
    .join(" ");
}

export async function ChartBlock({ range }: { range: RangeDays }) {
  const tiles = await todayTiles(range);
  return (
    <section aria-labelledby="chart-heading" className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="chart-heading" className="font-outfit text-lg font-black text-[#041635]">
          Enquiries and tickets, last {range} days
        </h2>
        <p className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-[#2691F0]" aria-hidden="true" /> Enquiries
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-slate-400" aria-hidden="true" /> Tickets opened
          </span>
        </p>
      </div>
      {!tiles.ok ? (
        <div className="mt-3">
          <BlockError what="The daily figures" />
        </div>
      ) : (
        (() => {
          const enquiries = tiles.data.enquiries.daily;
          const tickets = tiles.data.openTickets.daily;
          const max = Math.max(1, ...enquiries.map((d) => d.count), ...tickets.map((d) => d.count));
          const middle = enquiries[Math.floor(enquiries.length / 2)];
          return (
            <>
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio="none"
                className="mt-4 h-40 w-full"
                role="img"
                aria-label={`${seriesTotal(enquiries)} enquiries and ${seriesTotal(tickets)} tickets opened over the last ${range} days. Busiest day had ${max}.`}
              >
                <line x1="0" y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="#e2e8f0" vectorEffect="non-scaling-stroke" />
                <polyline points={linePoints(tickets, max)} fill="none" stroke="#94a3b8" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                <polyline points={linePoints(enquiries, max)} fill="none" stroke="#2691F0" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
              <div className="mt-2 flex justify-between text-xs font-semibold tabular-nums text-slate-500" aria-hidden="true">
                <span>{dayLabel(enquiries[0].day)}</span>
                <span>{dayLabel(middle.day)}</span>
                <span>{dayLabel(enquiries[enquiries.length - 1].day)}</span>
              </div>
            </>
          );
        })()
      )}
    </section>
  );
}

// ── Activity ───────────────────────────────────────────────────────────────

export async function ActivityBlock() {
  const activity = await loadRecentActivity();
  return (
    <section aria-labelledby="activity-heading" className={`${CARD} p-5`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 id="activity-heading" className="font-outfit text-lg font-black text-[#041635]">
          Recent activity
        </h2>
        <Link href="/admin/audit-logs" className="text-sm font-bold text-[#0f5aab] hover:underline">
          Audit log
        </Link>
      </div>
      {!activity.ok ? (
        <BlockError what="Recent activity" />
      ) : activity.data.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">No activity recorded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {activity.data.map((entry) => (
            <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[#041635]">{entry.action}</span>
                <span className="block text-xs text-slate-500">{entry.who}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {formatDistanceToNow(entry.when, { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
