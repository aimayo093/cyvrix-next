import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createIndustry,
  updateIndustry,
  toggleIndustryPublish,
  deleteIndustry,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export const metadata = { title: "Industries CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function IndustriesCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const industries = await prisma.industry.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const editing = sp.edit ? industries.find((i) => i.id === sp.edit) ?? null : null;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Industries CMS</h1>
          <p className="text-slate-500 text-sm mt-1">
            {industries.length} industr{industries.length !== 1 ? "ies" : "y"} &mdash; manage sector-specific pages.
          </p>
        </div>
        <a href="/admin/industries-cms?edit=new"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors">
          <Plus className="h-4 w-4" /> Add Industry
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {["Title", "Slug", "Status", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {industries.map((ind) => (
                <tr key={ind.id} className={`hover:bg-slate-50/70 transition-colors ${editing?.id === ind.id ? "bg-blue-50/50" : ""}`}>
                  <td className="px-6 py-4 font-black text-[#041635] text-sm">{ind.title}</td>
                  <td className="px-6 py-4"><code className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{ind.slug}</code></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      ind.published ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}>
                      {ind.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/admin/industries-cms?edit=${ind.id}`} className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </a>
                      <form action={toggleIndustryPublish}>
                        <input type="hidden" name="id" value={ind.id} />
                        <button type="submit" className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                          {ind.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </form>
                      <form action={deleteIndustry}>
                        <input type="hidden" name="id" value={ind.id} />
                        <DeleteButton message={`Delete "${ind.title}"?`} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h2 className="font-outfit text-lg font-black text-[#041635] mb-1">
              {sp.edit === "new" ? "New Industry" : editing ? `Editing: ${editing.title}` : "Select an industry to edit"}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mb-5">Changes update the live website immediately.</p>

            {sp.edit === "new" ? (
              <form action={createIndustry} className="space-y-4">
                <IndustryFormFields />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Create Industry</Button>
              </form>
            ) : editing ? (
              <form action={updateIndustry} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <IndustryFormFields defaults={{
                  title: editing.title,
                  slug: editing.slug,
                  summary: (editing.content as Record<string, string>)?.summary ?? "",
                  body: (editing.content as Record<string, string>)?.body ?? "",
                  image: (editing.content as Record<string, string>)?.image ?? "",
                }} />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Save Changes</Button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <Pencil className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">Click the edit icon on any industry to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IndustryFormFields({ defaults }: { defaults?: Record<string, string> }) {
  return (
    <>
      <div className="block text-sm font-bold text-slate-700">
        Industry Card Image
        <div className="mt-1.5">
          <ImageUpload name="image" defaultValue={defaults?.image} />
        </div>
      </div>
      <label className="block text-sm font-bold text-slate-700">Title
        <input name="title" required defaultValue={defaults?.title} placeholder="e.g. Healthcare and Care Providers"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <label className="block text-sm font-bold text-slate-700">URL Slug
        <input name="slug" defaultValue={defaults?.slug} placeholder="e.g. healthcare-care-providers"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <label className="block text-sm font-bold text-slate-700">Summary
        <textarea name="summary" rows={2} defaultValue={defaults?.summary} placeholder="How CYVRIX helps this industry..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
      </label>
      <label className="block text-sm font-bold text-slate-700">Full Body (Markdown)
        <textarea name="body" rows={5} defaultValue={defaults?.body} placeholder="Challenges, solutions, relevant services..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
      </label>
    </>
  );
}
