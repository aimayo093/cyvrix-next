import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTicketStatus, assignTicket, addTicketNote, closeTicket } from "@/lib/admin-actions";
import { formatDistanceToNow } from "date-fns";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Ticket Management | CYVRIX Admin" };
export const dynamic = "force-dynamic";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-500 border-slate-100",
  STANDARD: "bg-blue-50 text-blue-600 border-blue-100",
  HIGH: "bg-amber-50 text-amber-600 border-amber-100",
  CRITICAL: "bg-rose-50 text-rose-600 border-rose-100",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-600 border-blue-100",
  OPEN: "bg-indigo-50 text-indigo-600 border-indigo-100",
  IN_PROGRESS: "bg-violet-50 text-violet-600 border-violet-100",
  AWAITING_CLIENT: "bg-amber-50 text-amber-600 border-amber-100",
  RESOLVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  CLOSED: "bg-slate-50 text-slate-400 border-slate-100",
};

export default async function TicketManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; filter?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = sp.filter ?? "all";

  const tickets = await prisma.ticket.findMany({
    where: filter !== "all" ? { status: filter as any } : { status: { not: "CLOSED" } },
    orderBy: { createdAt: "desc" },
    include: {
      TicketMessage: { orderBy: { createdAt: "desc" } },
    },
    take: 100,
  });

  const viewing = sp.view ? tickets.find((t) => t.id === sp.view) ?? null : null;

  const counts = await prisma.ticket.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]">Ticket Management</h1>
        <p className="text-slate-500 text-sm mt-1">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} shown &mdash; manage support queue and SLA status.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Open", value: "all" },
          { label: "New", value: "NEW" },
          { label: "In Progress", value: "IN_PROGRESS" },
          { label: "Awaiting Client", value: "AWAITING_CLIENT" },
          { label: "Resolved", value: "RESOLVED" },
          { label: "Closed", value: "CLOSED" },
        ].map((tab) => (
          <a key={tab.value} href={`/admin/ticket-management?filter=${tab.value}`}
            className={`px-4 py-1.5 rounded-full text-xs font-black border transition-colors ${
              filter === tab.value
                ? "bg-[#041635] text-white border-[#041635]"
                : "bg-white text-slate-500 border-slate-200 hover:border-[#2691F0] hover:text-[#2691F0]"
            }`}>
            {tab.label}
            {countMap[tab.value] !== undefined && (
              <span className="ml-1.5 text-[10px]">({countMap[tab.value]})</span>
            )}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ticket list */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {["Ticket", "Contact", "Priority", "Status", "Age", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className={`hover:bg-slate-50/70 transition-colors ${viewing?.id === ticket.id ? "bg-blue-50/50" : ""}`}>
                  <td className="px-5 py-4">
                    <p className="font-black text-[#041635] text-xs">{ticket.ticketNumber}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ticket.subject}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-slate-700">{ticket.name}</p>
                    <p className="text-xs text-slate-400">{ticket.company}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS.STANDARD}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <form action={updateTicketStatus}>
                      <input type="hidden" name="id" value={ticket.id} />
                      <AutoSubmitSelect
                        name="status"
                        defaultValue={ticket.status}
                        options={Object.keys(STATUS_COLORS).map(s => ({ value: s, label: s.replace(/_/g, " ") }))}
                        className="text-xs font-black rounded-lg border border-slate-200 px-2 py-1 text-[#041635] bg-white focus:ring-2 focus:ring-[#2691F0] focus:outline-none cursor-pointer"
                      />
                    </form>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-4">
                    <a href={`/admin/ticket-management?filter=${filter}&view=${ticket.id}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors inline-flex">
                      <MessageSquare className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">No tickets in this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ticket detail panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6 space-y-5">
            {viewing ? (
              <>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#2691F0] mb-1">{viewing.ticketNumber}</p>
                  <h2 className="font-outfit text-lg font-black text-[#041635] leading-snug">{viewing.subject}</h2>
                  <p className="text-sm text-slate-500 mt-1">{viewing.name} &bull; {viewing.company}</p>
                  <p className="text-xs text-slate-400">{viewing.email}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Description</p>
                  <p className="leading-relaxed">{viewing.description}</p>
                </div>

                {/* Assign */}
                <form action={assignTicket} className="flex gap-2 items-end">
                  <input type="hidden" name="id" value={viewing.id} />
                  <label className="flex-1 text-xs font-bold text-slate-600">
                    Assign to
                    <input name="assignedTo" defaultValue={viewing.assignedTo ?? ""}
                      placeholder="Staff name or email"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
                  </label>
                  <button type="submit" className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#2691F0] hover:text-white transition-colors mb-0.5">
                    Assign
                  </button>
                </form>

                {/* Internal note */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Thread ({viewing.TicketMessage.length} messages)</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                    {viewing.TicketMessage.map((msg) => (
                      <div key={msg.id} className={`rounded-lg px-3 py-2 text-xs ${msg.visibility === "internal" ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"}`}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{msg.visibility === "internal" ? "Internal Note" : "Reply to Client"}</p>
                        <p className="text-slate-700">{msg.body}</p>
                      </div>
                    ))}
                  </div>
                  <form action={addTicketNote} className="space-y-2">
                    <input type="hidden" name="ticketId" value={viewing.id} />
                    <textarea name="body" required rows={2} placeholder="Internal note or reply..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
                    <div className="flex gap-2">
                      <select name="visibility" className="text-xs font-bold rounded-lg border border-slate-200 px-2 py-1.5 text-[#041635] bg-white focus:ring-2 focus:ring-[#2691F0] focus:outline-none">
                        <option value="internal">Internal note</option>
                        <option value="client">Reply to client</option>
                      </select>
                      <button type="submit" className="flex-1 bg-[#041635] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-[#2691F0] transition-colors">
                        Add
                      </button>
                    </div>
                  </form>
                </div>

                {/* Close ticket */}
                {viewing.status !== "CLOSED" && (
                  <form action={closeTicket}>
                    <input type="hidden" name="id" value={viewing.id} />
                    <button type="submit" className="w-full text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-rose-100 py-2 rounded-xl transition-colors">
                      Close Ticket
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <MessageSquare className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">Click a ticket to view its thread and manage it.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
