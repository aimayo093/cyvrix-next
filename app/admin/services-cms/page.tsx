import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createService,
  updateService,
  toggleServicePublish,
  deleteService,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export const metadata = { title: "Services CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function ServicesCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; action?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const services = await prisma.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const editing = sp.edit
    ? services.find((s) => s.id === sp.edit) ?? null
    : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">
            Services CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {services.length} service{services.length !== 1 ? "s" : ""}{" "}
            configured &mdash; edit, publish, or create new service pages.
          </p>
        </div>
        <a
          href="/admin/services-cms?edit=new"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Services Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {services.map((service) => (
                <tr
                  key={service.id}
                  className={`hover:bg-slate-50/70 transition-colors ${editing?.id === service.id ? "bg-blue-50/50" : ""}`}
                >
                  <td className="px-6 py-4">
                    <p className="font-black text-[#041635] text-sm">
                      {service.title}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {service.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        service.published
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}
                    >
                      {service.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/admin/services-cms?edit=${service.id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </a>
                      <form action={toggleServicePublish}>
                        <input type="hidden" name="id" value={service.id} />
                        <button
                          type="submit"
                          className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title={service.published ? "Unpublish" : "Publish"}
                        >
                          {service.published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </form>
                      <form action={deleteService}>
                        <input type="hidden" name="id" value={service.id} />
                        <DeleteButton message={`Delete "${service.title}"? This cannot be undone.`} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No services yet. Click "Add Service" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h2 className="font-outfit text-lg font-black text-[#041635] mb-1">
              {editing === null && sp.edit === "new"
                ? "Create New Service"
                : editing
                  ? `Editing: ${editing.title}`
                  : "Select a service to edit"}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mb-6">
              Changes save directly to your Supabase database and update the
              live website.
            </p>

            {sp.edit === "new" ? (
              <form action={createService} className="space-y-4">
                <ServiceFormFields />
                <Button
                  type="submit"
                  className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold"
                >
                  Create Service
                </Button>
              </form>
            ) : editing ? (
              <form action={updateService} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <ServiceFormFields
                  defaults={{
                    title: editing.title,
                    slug: editing.slug,
                    summary: editing.summary,
                    body: (editing.content as Record<string, string>)?.body ?? "",
                    seoTitle:
                      (editing.seo as Record<string, string>)?.title ?? "",
                    seoDescription:
                      (editing.seo as Record<string, string>)?.description ?? "",
                    image: (editing.content as Record<string, string>)?.image ?? "",
                  }}
                />
                <Button
                  type="submit"
                  className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold"
                >
                  Save Changes
                </Button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <Pencil className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">
                  Click the edit icon on any service to start editing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceFormFields({
  defaults,
}: {
  defaults?: {
    title?: string;
    slug?: string;
    summary?: string;
    body?: string;
    seoTitle?: string;
    seoDescription?: string;
    image?: string;
  };
}) {
  return (
    <>
      <div className="block text-sm font-bold text-slate-700">
        Service Card Image
        <div className="mt-1.5">
          <ImageUpload name="image" defaultValue={defaults?.image} />
        </div>
      </div>
      <label className="block text-sm font-bold text-slate-700">
        Title
        <input
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="e.g. Managed IT Support"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        URL Slug
        <input
          name="slug"
          defaultValue={defaults?.slug}
          placeholder="e.g. managed-it-support"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Summary (used in cards and listings)
        <textarea
          name="summary"
          rows={2}
          defaultValue={defaults?.summary}
          placeholder="Short description shown in service cards..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none"
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Full Page Body (Markdown)
        <textarea
          name="body"
          rows={5}
          defaultValue={defaults?.body}
          placeholder="Full service description, features, process steps..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 pt-1 border-t border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">
          SEO Metadata
        </p>
        <label className="block text-sm font-bold text-slate-700">
          SEO Title
          <input
            name="seoTitle"
            defaultValue={defaults?.seoTitle}
            placeholder="Browser tab and Google title..."
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          SEO Description
          <input
            name="seoDescription"
            defaultValue={defaults?.seoDescription}
            placeholder="Search result description..."
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>
      </div>
    </>
  );
}
