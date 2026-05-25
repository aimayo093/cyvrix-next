import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createFooterSection,
  updateFooterSection,
  deleteFooterSection,
  reorderFooterSections,
  createFooterLink,
  updateFooterLink,
  deleteFooterLink,
  reorderFooterLinks,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Plus, Pencil, Layers, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";

export const metadata = { title: "Footer Builder CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function FooterBuilderCMSPage({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string;
    editSection?: string;
    editLink?: string;
    newLink?: string;
    newSection?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  // Fetch sections, links, and pages
  const sections = await prisma.footerSection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });

  const pages = await prisma.cmsPage.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  });

  // Selected column context
  const selectedSectionId = sp.sectionId || sections[0]?.id || "";
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;

  // Edit contexts
  const editingSection = sp.editSection === "true" && selectedSection ? selectedSection : null;
  const editingLink = sp.editLink && selectedSection
    ? selectedSection.links.find((l) => l.id === sp.editLink) ?? null
    : null;
  const isCreatingSection = sp.newSection === "true";
  const isCreatingLink = sp.newLink === "true" && selectedSection;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <Layers className="h-8 w-8 text-[#2691F0]" />
            Footer Builder CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Build and arrange footer columns, detailed link structures, and corporate legal groups.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="/admin/footer-builder?newSection=true"
            className="inline-flex items-center gap-2 bg-[#041635] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#2691F0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Footer Column
          </a>
          {selectedSection && (
            <a
              href={`/admin/footer-builder?sectionId=${selectedSectionId}&newLink=true`}
              className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#041635] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Link to Column
            </a>
          )}
        </div>
      </div>

      {/* Column Selector */}
      <div className="flex flex-wrap gap-2 items-center border-b border-slate-200 pb-4">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-2">
          Select Footer Column:
        </span>
        {sections.map((s, index) => (
          <div key={s.id} className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <a
              href={`/admin/footer-builder?sectionId=${s.id}`}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                selectedSectionId === s.id
                  ? "bg-[#041635] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s.title}
            </a>

            {/* Reorder column selectors */}
            <div className="flex shrink-0">
              <form action={reorderFooterSections}>
                <input
                  type="hidden"
                  name="ids"
                  value={JSON.stringify(
                    index > 0
                      ? sections.map((sRow, sIdx) => {
                          if (sIdx === index - 1) return sections[index].id;
                          if (sIdx === index) return sections[index - 1].id;
                          return sRow.id;
                        })
                      : []
                  )}
                />
                <button
                  type="submit"
                  disabled={index === 0}
                  className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move left"
                >
                  <ArrowUp className="h-3 w-3 -rotate-90" />
                </button>
              </form>

              <form action={reorderFooterSections}>
                <input
                  type="hidden"
                  name="ids"
                  value={JSON.stringify(
                    index < sections.length - 1
                      ? sections.map((sRow, sIdx) => {
                          if (sIdx === index) return sections[index + 1].id;
                          if (sIdx === index + 1) return sections[index].id;
                          return sRow.id;
                        })
                      : []
                  )}
                />
                <button
                  type="submit"
                  disabled={index === sections.length - 1}
                  className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move right"
                >
                  <ArrowDown className="h-3 w-3 -rotate-90" />
                </button>
              </form>
            </div>

            <a
              href={`/admin/footer-builder?sectionId=${s.id}&editSection=true`}
              className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-50 rounded"
              title="Edit column name"
            >
              <Pencil className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Column Link List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <h3 className="font-outfit font-black text-slate-800">
              Links in {selectedSection ? `"${selectedSection.title}" Column` : "Select Column"}
            </h3>
            {selectedSection && !selectedSection.isVisible && (
              <span className="bg-rose-500/10 text-rose-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded">
                Hidden Column
              </span>
            )}
          </div>

          {!selectedSection ? (
            <div className="text-center py-20 text-slate-300">
              <Layers className="h-10 w-10 mx-auto mb-3" />
              <p className="text-sm font-semibold">No footer columns configured.</p>
            </div>
          ) : selectedSection.links.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Layers className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No links inside this column.</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Add Link to Column&quot; to populate your links.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSection.links.map((link, index) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between border border-slate-100 rounded-xl p-4 bg-slate-50/30 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${!link.isVisible ? "text-slate-400 line-through" : "text-[#041635]"}`}>
                        {link.label}
                      </span>
                      {link.openInNewTab && (
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      )}
                      {!link.isVisible && (
                        <span className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {link.url}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Link Reordering */}
                    <form action={reorderFooterLinks} className="flex">
                      <input
                        type="hidden"
                        name="ids"
                        value={JSON.stringify(
                          index > 0
                            ? selectedSection.links.map((lRow, lIdx) => {
                                if (lIdx === index - 1) return selectedSection.links[index].id;
                                if (lIdx === index) return selectedSection.links[index - 1].id;
                                return lRow.id;
                              })
                            : []
                        )}
                      />
                      <button
                        type="submit"
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    </form>

                    <form action={reorderFooterLinks} className="flex">
                      <input
                        type="hidden"
                        name="ids"
                        value={JSON.stringify(
                          index < selectedSection.links.length - 1
                            ? selectedSection.links.map((lRow, lIdx) => {
                                if (lIdx === index) return selectedSection.links[index + 1].id;
                                if (lIdx === index + 1) return selectedSection.links[index].id;
                                return lRow.id;
                              })
                            : []
                        )}
                      />
                      <button
                        type="submit"
                        disabled={index === selectedSection.links.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </form>

                    <a
                      href={`/admin/footer-builder?sectionId=${selectedSectionId}&editLink=${link.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </a>
                    <form action={deleteFooterLink}>
                      <input type="hidden" name="id" value={link.id} />
                      <DeleteButton message={`Delete link "${link.label}"?`} />
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor sidebar panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
            
            {/* Create Footer Column */}
            {isCreatingSection && (
              <form action={createFooterSection} className="space-y-4">
                <h3 className="font-outfit text-lg font-black text-[#041635]">Create Column</h3>
                <label className="block text-sm font-bold text-slate-700">
                  Column Title
                  <input
                    name="title"
                    required
                    placeholder="e.g. Services"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Description / Note (Optional)
                  <input
                    name="description"
                    placeholder="e.g. Core offerings list"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                  />
                </label>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Create Column
                  </Button>
                  <a href={`/admin/footer-builder?sectionId=${selectedSectionId}`} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {/* Edit Footer Column */}
            {editingSection && (
              <form action={updateFooterSection} className="space-y-4">
                <input type="hidden" name="id" value={editingSection.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">Edit Column: {editingSection.title}</h3>
                
                <label className="block text-sm font-bold text-slate-700">
                  Column Title
                  <input
                    name="title"
                    required
                    defaultValue={editingSection.title}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Description / Note (Optional)
                  <input
                    name="description"
                    defaultValue={editingSection.description || ""}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Visibility
                  <select
                    name="isVisible"
                    defaultValue={editingSection.isVisible ? "true" : "false"}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white"
                  >
                    <option value="true">Visible Column</option>
                    <option value="false">Hidden Column</option>
                  </select>
                </label>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Column
                  </Button>
                  <form action={deleteFooterSection} className="flex-1">
                    <input type="hidden" name="id" value={editingSection.id} />
                    <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold">
                      Delete Column
                    </Button>
                  </form>
                </div>
              </form>
            )}

            {/* Create Link inside Column */}
            {isCreatingLink && (
              <form action={createFooterLink} className="space-y-4">
                <input type="hidden" name="footerSectionId" value={selectedSectionId} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">
                  Add Link to {selectedSection.title}
                </h3>
                
                <LinkFormFields pages={pages} />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Add Link
                  </Button>
                  <a href={`/admin/footer-builder?sectionId=${selectedSectionId}`} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {/* Edit Link inside Column */}
            {editingLink && (
              <form action={updateFooterLink} className="space-y-4">
                <input type="hidden" name="id" value={editingLink.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">
                  Edit Link: {editingLink.label}
                </h3>

                <LinkFormFields pages={pages} defaults={editingLink} />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Changes
                  </Button>
                  <a href={`/admin/footer-builder?sectionId=${selectedSectionId}`} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {/* Neutral Selection Placeholder */}
            {!isCreatingSection && !editingSection && !isCreatingLink && !editingLink && (
              <div className="text-center py-20 text-slate-300">
                <Layers className="h-10 w-10 mx-auto mb-3" />
                <h4 className="font-outfit font-black text-slate-600 text-base">Select Column or Link</h4>
                <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose a footer column or specific link from the lists to adjust your public layout links.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkFormFields({
  pages,
  defaults,
}: {
  pages: { id: string; title: string; slug: string }[];
  defaults?: any;
}) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">
        Link Text / Label
        <input
          name="label"
          required
          defaultValue={defaults?.label}
          placeholder="e.g. Cyber Security Solutions"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Destination URL
        <input
          name="url"
          required
          defaultValue={defaults?.url}
          placeholder="e.g. /services/cyber-security"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Or Link to Core Page
          <select
            name="pageId"
            defaultValue={defaults?.pageId || ""}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-semibold"
          >
            <option value="">Custom/External URL</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (/{p.slug})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Visibility
          <select
            name="isVisible"
            defaultValue={defaults?.isVisible !== false ? "true" : "false"}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-semibold"
          >
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 pt-2 text-slate-700 text-sm font-bold cursor-pointer">
        <input
          type="checkbox"
          name="openInNewTab"
          value="true"
          defaultChecked={defaults?.openInNewTab}
          className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0] h-4 w-4"
        />
        Open Link in New Tab
      </label>
    </>
  );
}
