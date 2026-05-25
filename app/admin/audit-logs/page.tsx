import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Audit Logs | CYVRIX Admin" };
export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<string, string> = {
  seed_completed: "bg-slate-50 text-slate-500 border-slate-100",
  service_created: "bg-blue-50 text-blue-600 border-blue-100",
  service_updated: "bg-indigo-50 text-indigo-600 border-indigo-100",
  service_published: "bg-emerald-50 text-emerald-600 border-emerald-100",
  service_unpublished: "bg-amber-50 text-amber-600 border-amber-100",
  service_deleted: "bg-rose-50 text-rose-600 border-rose-100",
  blog_published: "bg-emerald-50 text-emerald-600 border-emerald-100",
  blog_unpublished: "bg-amber-50 text-amber-600 border-amber-100",
  blog_post_deleted: "bg-rose-50 text-rose-600 border-rose-100",
  lead_status_updated: "bg-violet-50 text-violet-600 border-violet-100",
  ticket_closed: "bg-slate-50 text-slate-500 border-slate-100",
  ticket_status_updated: "bg-indigo-50 text-indigo-600 border-indigo-100",
  client_company_created: "bg-blue-50 text-blue-600 border-blue-100",
  client_deactivated: "bg-rose-50 text-rose-600 border-rose-100",
  client_reactivated: "bg-emerald-50 text-emerald-600 border-emerald-100",
  site_setting_updated: "bg-purple-50 text-purple-600 border-purple-100",
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const perPage = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-slate-100 rounded-xl">
          <ShieldCheck className="h-5 w-5 text-[#2691F0]" />
        </div>
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total.toLocaleString()} entries &mdash; immutable system activity trail.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {["Action", "Entity", "Entity ID", "User", "Metadata", "Time"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {logs.map((log) => {
              const colorClass = ACTION_COLORS[log.action] ?? "bg-slate-50 text-slate-500 border-slate-100";
              return (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${colorClass}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs font-semibold text-slate-600">{log.entityType ?? "—"}</td>
                  <td className="px-5 py-3">
                    {log.entityId ? (
                      <code className="text-[10px] text-slate-400">{log.entityId.slice(0, 8)}…</code>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{log.userId ? <code className="text-[10px]">{log.userId.slice(0, 8)}…</code> : "System"}</td>
                  <td className="px-5 py-3 max-w-xs">
                    {log.metadata && Object.keys(log.metadata as object).length > 0 ? (
                      <code className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded block truncate">
                        {JSON.stringify(log.metadata)}
                      </code>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : "—"}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No audit entries found.</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-semibold">
              Page {page} of {totalPages} &bull; {total} total entries
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/admin/audit-logs?page=${page - 1}`}
                  className="text-xs font-bold text-slate-600 hover:text-[#2691F0] px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#2691F0] transition-colors">
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a href={`/admin/audit-logs?page=${page + 1}`}
                  className="text-xs font-bold text-slate-600 hover:text-[#2691F0] px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#2691F0] transition-colors">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
