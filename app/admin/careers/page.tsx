import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCareerJob, updateCareerJob, toggleCareerJobPublish, deleteCareerJob } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Plus, Pencil, Trash2, Eye, EyeOff, MapPin, Briefcase } from "lucide-react";

export const metadata = { title: "Careers CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function CareersCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const jobs = await prisma.careerJob.findMany({ orderBy: { createdAt: "desc" } });
  const editing = sp.edit ? jobs.find((j) => j.id === sp.edit) ?? null : null;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Careers CMS</h1>
          <p className="text-slate-500 text-sm mt-1">
            {jobs.length} job opening{jobs.length !== 1 ? "s" : ""} currently listed.
          </p>
        </div>
        <a href="/admin/careers?edit=new"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors">
          <Plus className="h-4 w-4" /> Post a Job
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Job List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["Job Posting", "Details", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jobs.map((job) => (
                  <tr key={job.id} className={`hover:bg-slate-50/70 transition-colors ${editing?.id === job.id ? "bg-blue-50/50" : ""}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#041635] text-sm">{job.title}</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2691F0]" /> {job.location || "Remote"}
                        <span className="text-slate-300">&bull;</span>
                        <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {job.type || "Full-time"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed max-w-sm">{job.description || "No description provided."}</p>
                    </td>
                    <td className="px-6 py-4 w-24">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        job.visible ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}>
                        {job.visible ? "Live" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 w-28">
                      <div className="flex items-center justify-end gap-1">
                        <a href={`/admin/careers?edit=${job.id}`} className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </a>
                        <form action={toggleCareerJobPublish}>
                          <input type="hidden" name="id" value={job.id} />
                          <button type="submit" className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                            {job.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </form>
                        <form action={deleteCareerJob}>
                          <input type="hidden" name="id" value={job.id} />
                          <DeleteButton message="Delete this job posting?" />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobs.length === 0 && (
              <div className="p-12 text-center text-sm text-slate-400">No job openings created yet.</div>
            )}
          </div>
        </div>

        {/* Editor Side Pane */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h2 className="font-outfit text-lg font-black text-[#041635] mb-1">
              {sp.edit === "new" ? "Post a Job" : editing ? "Edit Job Posting" : "Select a Job to Edit"}
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Create, update, and manage job openings displayed on the public Careers page.
            </p>

            {sp.edit === "new" || editing ? (
              <form action={sp.edit === "new" ? createCareerJob : updateCareerJob} className="space-y-4">
                {editing && <input type="hidden" name="id" value={editing.id} />}

                <label className="block text-xs font-bold text-slate-700">
                  Job Title
                  <input required name="title" defaultValue={editing?.title || ""}
                    placeholder="e.g. Senior Security Engineer"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-medium" />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-xs font-bold text-slate-700">
                    Location
                    <input required name="location" defaultValue={editing?.location || "Remote, UK"}
                      placeholder="e.g. Remote, UK"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-medium" />
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    Job Type
                    <input required name="type" defaultValue={editing?.type || "Full-time"}
                      placeholder="e.g. Full-time, Contract"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-medium" />
                  </label>
                </div>

                <label className="block text-xs font-bold text-slate-700">
                  Role Description & Requirements
                  <textarea required name="description" rows={10} defaultValue={editing?.description || ""}
                    placeholder="Detail core operational focus, required certifications, experience, and benefits package..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-medium resize-none" />
                </label>

                <div className="flex gap-3 pt-2">
                  <a href="/admin/careers"
                    className="flex-1 text-center bg-slate-100 text-slate-600 text-xs font-bold px-4 py-3 rounded-xl hover:bg-slate-200 transition-colors">
                    Cancel
                  </a>
                  <button type="submit"
                    className="flex-1 bg-[#2691F0] text-white text-xs font-bold px-4 py-3 rounded-xl hover:bg-[#041635] transition-all">
                    {sp.edit === "new" ? "Post Job" : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                <Briefcase className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-xs font-bold text-slate-400">Click a job to edit, or post a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
