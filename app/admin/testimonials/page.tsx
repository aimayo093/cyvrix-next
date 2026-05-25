import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveTestimonial, toggleFeaturedTestimonial, deleteTestimonial, createTestimonial } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Star, Trash2, CheckCircle, XCircle, Bookmark } from "lucide-react";

export const metadata = { title: "Testimonials | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  await requireAdmin();

  const testimonials = await prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });

  const approved = testimonials.filter((t) => t.approved).length;
  const featured = testimonials.filter((t) => t.featured).length;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Testimonials</h1>
          <p className="text-slate-500 text-sm mt-1">
            {approved} approved &bull; {featured} featured &bull; {testimonials.length} total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Testimonials list */}
        <div className="lg:col-span-7 space-y-4">
          {testimonials.map((t) => (
            <div key={t.id} className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 ${t.approved ? "border-slate-200" : "border-amber-100 bg-amber-50/30"}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  {!t.approved && (
                    <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">Pending Approval</span>
                  )}
                  {t.featured && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#2691F0] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Featured</span>
                  )}
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-3">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-xs font-black text-[#041635]">{t.clientName}</p>
                <p className="text-xs text-slate-400">{t.company}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <form action={approveTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" title={t.approved ? "Unapprove" : "Approve"}
                    className={`p-2 rounded-lg transition-colors ${t.approved ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"}`}>
                    {t.approved ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </button>
                </form>
                <form action={toggleFeaturedTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" title={t.featured ? "Unfeature" : "Feature on homepage"}
                    className={`p-2 rounded-lg transition-colors ${t.featured ? "text-[#2691F0] hover:bg-blue-50" : "text-slate-400 hover:text-[#2691F0] hover:bg-blue-50"}`}>
                    <Bookmark className="h-4 w-4" />
                  </button>
                </form>
                <form action={deleteTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <DeleteButton message="Delete this testimonial?" />
                </form>
              </div>
            </div>
          ))}
          {testimonials.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">No testimonials yet.</div>
          )}
        </div>

        {/* Add testimonial panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h2 className="font-outfit text-lg font-black text-[#041635] mb-1">Add Testimonial</h2>
            <p className="text-xs text-slate-400 font-semibold mb-5">New testimonials require approval before appearing on the website.</p>
            <form action={createTestimonial} className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">Client Name
                <input name="clientName" required placeholder="e.g. Operations Director"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">Company
                <input name="company" placeholder="e.g. UK healthcare provider"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">Quote
                <textarea name="quote" required rows={3} placeholder="Their feedback..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">Rating (1–5)
                <select name="rating" defaultValue="5"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} star{r !== 1 ? "s" : ""}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Add Testimonial</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
