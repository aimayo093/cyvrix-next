import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClientCompany, updateClientCompany, deactivateClient } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { Plus, Pencil, Power } from "lucide-react";

export const metadata = { title: "Client Management | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function ClientManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const clients = await prisma.clientCompany.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { Ticket: true, User: true } },
    },
  });

  const editing = sp.edit && sp.edit !== "new"
    ? clients.find((c) => c.id === sp.edit) ?? null
    : null;

  const active = clients.filter((c) => c.status === "active").length;
  const inactive = clients.filter((c) => c.status !== "active").length;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Client Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            {active} active &bull; {inactive} inactive client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a href="/admin/client-management?edit=new"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors">
          <Plus className="h-4 w-4" /> Add Client
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {["Company", "Contact Email", "Plan", "Tickets", "Users", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients.map((client) => (
                <tr key={client.id} className={`hover:bg-slate-50/70 transition-colors ${editing?.id === client.id ? "bg-blue-50/50" : ""}`}>
                  <td className="px-5 py-4">
                    <p className="font-black text-[#041635] text-sm">{client.name}</p>
                    {client.industry && <p className="text-xs text-slate-400">{client.industry}</p>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{client.billingContact ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">{client.status}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-black text-[#041635]">{client._count.Ticket}</td>
                  <td className="px-5 py-4 text-sm font-black text-[#041635]">{client._count.User}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      client.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/admin/client-management?edit=${client.id}`} className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </a>
                      <form action={deactivateClient}>
                        <input type="hidden" name="id" value={client.id} />
                        <button type="submit" title={client.status === "active" ? "Deactivate" : "Reactivate"}
                          className={`p-2 rounded-lg transition-colors ${client.status === "active" ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50" : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"}`}>
                          <Power className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No clients yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h2 className="font-outfit text-lg font-black text-[#041635] mb-1">
              {sp.edit === "new" ? "Add New Client" : editing ? `Editing: ${editing.name}` : "Select a client to edit"}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mb-5">Client companies give portal access to their team members.</p>

            {sp.edit === "new" ? (
              <form action={createClientCompany} className="space-y-4">
                <ClientFormFields />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Create Client</Button>
              </form>
            ) : editing ? (
              <form action={updateClientCompany} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <ClientFormFields defaults={{
                  name: editing.name,
                  industry: editing.industry ?? "",
                  billingContact: editing.billingContact ?? "",
                  securityContact: editing.securityContact ?? "",
                  notes: editing.notes ?? "",
                }} />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Save Changes</Button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <Pencil className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">Click the edit icon to manage a client.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientFormFields({ defaults }: { defaults?: Record<string, string> }) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">Company Name
        <input name="name" required defaultValue={defaults?.name} placeholder="e.g. Acme Ltd"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-slate-700">Industry
          <input name="industry" defaultValue={defaults?.industry} placeholder="e.g. Healthcare"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
        </label>
        <label className="block text-sm font-bold text-slate-700">Status
          <input value="active" readOnly
            className="mt-1.5 w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed" />
        </label>
      </div>
      <label className="block text-sm font-bold text-slate-700">Billing Contact (name or email)
        <input name="billingContact" defaultValue={defaults?.billingContact} placeholder="billing@acme.co.uk"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <label className="block text-sm font-bold text-slate-700">Security Contact (name or email)
        <input name="securityContact" defaultValue={defaults?.securityContact} placeholder="security@acme.co.uk"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <label className="block text-sm font-bold text-slate-700">Internal Notes
        <textarea name="notes" rows={3} defaultValue={defaults?.notes} placeholder="Onboarding notes, account details, SLA specifics..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
      </label>
    </>
  );
}
