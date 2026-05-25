import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLeadStatus, addLeadNote, deleteLead } from "@/lib/admin-actions";
import { formatDistanceToNow } from "date-fns";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { Trash2, StickyNote } from "lucide-react";

export const metadata = { title: "Leads CRM | CYVRIX Admin" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST", "ARCHIVED"];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-600 border-blue-100",
  CONTACTED: "bg-indigo-50 text-indigo-600 border-indigo-100",
  QUALIFIED: "bg-violet-50 text-violet-600 border-violet-100",
  PROPOSAL: "bg-amber-50 text-amber-600 border-amber-100",
  WON: "bg-emerald-50 text-emerald-600 border-emerald-100",
  LOST: "bg-rose-50 text-rose-600 border-rose-100",
  ARCHIVED: "bg-slate-50 text-slate-400 border-slate-100",
};

export default async function LeadsCRMPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { LeadNote: { orderBy: { createdAt: "desc" } } },
    take: 100,
  });

  const viewing = sp.view ? leads.find((l) => l.id === sp.view) ?? null : null;

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]">Leads CRM</h1>
        <p className="text-slate-500 text-sm mt-1">
          {leads.length} lead{leads.length !== 1 ? "s" : ""} &mdash; manage status, notes, and follow-ups.
        </p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["NEW", "CONTACTED", "QUALIFIED", "WON"].map((s) => {
          const count = leads.filter((l) => l.status === s).length;
          return (
            <div key={s} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-2xl font-black text-[#041635]">{count}</p>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">{s}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lead Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {["Contact", "Source", "Status", "Received", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.map((lead) => (
                <tr key={lead.id} className={`hover:bg-slate-50/70 transition-colors ${viewing?.id === lead.id ? "bg-blue-50/50" : ""}`}>
                  <td className="px-5 py-4">
                    <p className="font-black text-[#041635] text-sm">{lead.name ?? "Anonymous"}</p>
                    <p className="text-xs text-slate-400">{lead.email}</p>
                    {lead.company && <p className="text-xs text-slate-400">{lead.company}</p>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500 font-semibold">{lead.source?.replace(/_/g, " ")}</td>
                  <td className="px-5 py-4">
                    <form action={updateLeadStatus}>
                      <input type="hidden" name="id" value={lead.id} />
                      <AutoSubmitSelect 
                        name="status" 
                        defaultValue={lead.status} 
                        options={STATUS_OPTIONS}
                        className="text-xs font-black rounded-lg border border-slate-200 px-2 py-1 text-[#041635] bg-white focus:ring-2 focus:ring-[#2691F0] focus:outline-none cursor-pointer" 
                      />
                    </form>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/admin/leads-crm?view=${lead.id}`} className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors" title="View & Notes">
                        <StickyNote className="h-4 w-4" />
                      </a>
                      <form action={deleteLead}>
                        <input type="hidden" name="id" value={lead.id} />
                          <DeleteButton message="Delete this lead?" />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">No leads yet. They appear here when website forms are submitted.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lead Detail / Notes Panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6 space-y-5">
            {viewing ? (
              <>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#2691F0] mb-1">Lead Detail</p>
                  <h2 className="font-outfit text-xl font-black text-[#041635]">{viewing.name ?? "Anonymous"}</h2>
                  <p className="text-sm text-slate-500">{viewing.email}</p>
                  {viewing.company && <p className="text-sm text-slate-400">{viewing.company}</p>}
                  <span className={`mt-2 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[viewing.status] ?? STATUS_COLORS.NEW}`}>
                    {viewing.status}
                  </span>
                </div>

                {/* Payload */}
                {viewing.payload && Object.keys(viewing.payload as object).length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1">
                    <p className="font-black text-slate-500 uppercase tracking-wider text-[10px] mb-2">Submission Data</p>
                    {Object.entries(viewing.payload as Record<string, string>).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="font-bold text-slate-500 capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                        <span className="text-slate-700">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Internal Notes ({viewing.LeadNote.length})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                    {viewing.LeadNote.map((note) => (
                      <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs">
                        <p className="text-slate-700">{note.body}</p>
                        <p className="text-slate-400 mt-1">{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</p>
                      </div>
                    ))}
                  </div>
                  <form action={addLeadNote} className="flex gap-2">
                    <input type="hidden" name="leadId" value={viewing.id} />
                    <input name="body" required placeholder="Add internal note..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
                    <button type="submit" className="bg-[#041635] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#2691F0] transition-colors">
                      Add
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <StickyNote className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">Click the notes icon on any lead to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
