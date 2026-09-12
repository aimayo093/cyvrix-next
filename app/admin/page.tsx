import type { Metadata } from "next";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import * as React from "react";
import { connection } from "next/server";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Inbox,
  LifeBuoy,
  Mail,
} from "lucide-react";
import { getAdminStats, getRecentActivities } from "@/lib/data-fetchers";
import { formatDistanceToNow } from "date-fns";
import { SecurityScanCard } from "@/components/admin/SecurityScanCard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "CYVRIX internal management dashboard.",
};

export default function AdminDashboard() {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <AdminDashboardContent />
    </React.Suspense>
  );
}

/**
 * Audit actions are stored as snake_case verbs - portal_welcome_sent,
 * verification_email_failed, brand_asset_updated. They were rendered with the
 * underscores swapped for spaces and nothing else, so the feed read as a column
 * of lowercase fragments.
 */
function readableAction(action: string): string {
  const words = action.trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * What an entry means, taken from the verb rather than assumed.
 *
 * Every row used to carry an emerald dot, so a failed send, a refused write and
 * a completed scan were drawn identically. DESIGN.md keeps semantic colour
 * separate from the accent for exactly this reason: green has to mean something
 * or it means nothing.
 */
function activityTone(action: string): { dot: string; label: string } {
  const value = action.toLowerCase();
  if (/fail|error|refused|denied|invalid/.test(value)) {
    return { dot: "bg-rose-500", label: "Failed" };
  }
  if (/warn|stale|expired|disabled|deleted|removed/.test(value)) {
    return { dot: "bg-amber-500", label: "Attention" };
  }
  return { dot: "bg-emerald-500", label: "Completed" };
}

async function AdminDashboardContent() {
  await connection();
  const [statsData, activities] = await Promise.all([
    getAdminStats(),
    getRecentActivities(6),
  ]);

  /*
   * Split by whether the number asks for anything.
   *
   * The four figures were four identical cards, which gave a subscriber count
   * the same weight as an untriaged enquiry. On a dashboard opened to answer
   * "what needs me today", that is the one question the layout should not make
   * the reader work out for themselves.
   */
  const queues = [
    {
      name: "New enquiries",
      value: statsData.newLeads,
      href: "/admin/leads-crm",
      idle: "None awaiting triage",
      active: "Awaiting triage",
      icon: Inbox,
    },
    {
      name: "Open support tickets",
      value: statsData.activeTickets,
      href: "/admin/ticket-management",
      idle: "Queue is clear",
      active: "Not yet closed",
      icon: LifeBuoy,
    },
  ];

  const records = [
    { name: "Active clients", value: statsData.totalClients, href: "/admin/client-management", icon: Building2 },
    { name: "Newsletter subscribers", value: statsData.totalSubscribers, href: "/admin/settings", icon: Mail },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-outfit text-3xl font-black text-balance text-[#041635]">Dashboard</h1>
        <p className="mt-1 font-medium text-slate-500">
          What is waiting, what is on record, and what has happened recently.
        </p>
      </div>

      {/* Queues first: the two numbers that can ask for something. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {queues.map((queue) => {
          const waiting = queue.value > 0;
          return (
            <Link
              key={queue.name}
              href={queue.href}
              className={`group rounded-3xl border bg-white p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 ${
                waiting
                  ? "border-amber-200 hover:border-amber-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* The tinted chip is the signal, so it only appears when there
                  * is something waiting. Drawn on both states it was decoration,
                  * and it paired grey on a tinted ground at 2.45:1. */}
                <div
                  className={
                    waiting ? "rounded-xl bg-amber-50 p-3 text-amber-700" : "p-3 text-slate-500"
                  }
                >
                  <queue.icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[#2691F0]"
                />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-500">{queue.name}</p>
              <p className="mt-1 font-outfit text-4xl font-black tabular-nums text-[#041635]">
                {queue.value}
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${waiting ? "text-amber-700" : "text-slate-400"}`}
              >
                {waiting ? queue.active : queue.idle}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Reference figures: smaller, because nothing here is a task. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {records.map((record) => (
          <Link
            key={record.name}
            href={record.href}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2"
          >
            <record.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="flex-1 text-sm font-semibold text-slate-600">{record.name}</span>
            <span className="font-outfit text-xl font-black tabular-nums text-[#041635]">
              {record.value}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-outfit font-black text-[#041635]">Recent activity</h2>
            <Link
              href="/admin/audit-logs"
              className="rounded-xl px-2 py-1 text-xs font-bold text-[#2691F0] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
            >
              View audit log
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.length > 0 ? (
              activities.map((item) => {
                const tone = activityTone(item.action);
                return (
                  <div key={item.id} className="flex items-start gap-3 px-6 py-4">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#041635]">
                        {readableAction(item.action)}
                        <span className="sr-only"> — {tone.label}</span>
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        <span className="capitalize">{item.type.toLowerCase()}</span>
                        {item.timestamp ? (
                          <>
                            {" · "}
                            <time dateTime={new Date(item.timestamp).toISOString()}>
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </time>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-slate-600">Nothing logged yet.</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Actions taken in the admin appear here as they happen.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <SecurityScanCard />

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-outfit font-black text-[#041635]">Go to</h2>
            <div className="mt-4 space-y-1">
              {[
                { name: "Security Center", href: "/admin/security-center" },
                { name: "Audit log", href: "/admin/audit-logs" },
                { name: "Support queue", href: "/admin/ticket-management" },
                { name: "Services CMS", href: "/admin/services-cms" },
                { name: "Settings", href: "/admin/settings" },
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="group flex items-center justify-between rounded-xl px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#2691F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
                >
                  {link.name}
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 text-slate-300 transition-colors group-hover:text-[#2691F0]"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
