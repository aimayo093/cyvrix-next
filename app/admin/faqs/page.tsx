import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFAQ, updateFAQ, toggleFAQPublish, deleteFAQ } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export const metadata = { title: "FAQ CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function FAQsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const faqs = await prisma.fAQ.findMany({ orderBy: { category: "asc" } });
  const editing = sp.edit ? faqs.find((f) => f.id === sp.edit) ?? null : null;

  // Group by category
  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const cat = faq.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">FAQ CMS</h1>
          <p className="text-slate-500 text-sm mt-1">
            {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} categories.
          </p>
        </div>
        <a href="/admin/faqs?edit=new"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors">
          <Plus className="h-4 w-4" /> Add FAQ
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="font-outfit font-black text-[#041635] text-sm">{category}</h3>
              </div>
              <table className="min-w-full divide-y divide-slate-50">
                <tbody>
                  {items.map((faq) => (
                    <tr key={faq.id} className={`hover:bg-slate-50/70 transition-colors ${editing?.id === faq.id ? "bg-blue-50/50" : ""}`}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#041635] text-sm">{faq.question}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{faq.answer}</p>
                      </td>
                      <td className="px-6 py-4 w-24">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          faq.published ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                          {faq.published ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 w-28">
                        <div className="flex items-center justify-end gap-1">
                          <a href={`/admin/faqs?edit=${faq.id}`} className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </a>
                          <form action={toggleFAQPublish}>
                            <input type="hidden" name="id" value={faq.id} />
                            <button type="submit" className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                              {faq.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </form>
                          <form action={deleteFAQ}>
                            <input type="hidden" name="id" value={faq.id} />
                            <DeleteButton message="Delete this FAQ?" />
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {faqs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-400">No FAQs yet.</div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h2 className="font-outfit text-lg font-black text-[#041635] mb-1">
              {sp.edit === "new" ? "New FAQ" : editing ? "Edit FAQ" : "Select an FAQ to edit"}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mb-5">FAQs appear on the public FAQ page and relevant service pages.</p>

            {sp.edit === "new" ? (
              <form action={createFAQ} className="space-y-4">
                <FAQFormFields />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Create FAQ</Button>
              </form>
            ) : editing ? (
              <form action={updateFAQ} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <FAQFormFields defaults={{ category: editing.category ?? "", question: editing.question, answer: editing.answer }} />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Save Changes</Button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <Pencil className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">Click the edit icon on any FAQ to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQFormFields({ defaults }: { defaults?: Record<string, string> }) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">Category
        <input name="category" defaultValue={defaults?.category} placeholder="e.g. Managed IT Support"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <label className="block text-sm font-bold text-slate-700">Question
        <input name="question" required defaultValue={defaults?.question} placeholder="e.g. Can CYVRIX act as our outsourced IT department?"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <label className="block text-sm font-bold text-slate-700">Answer
        <textarea name="answer" required rows={4} defaultValue={defaults?.answer} placeholder="Clear, helpful answer..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
      </label>
    </>
  );
}
