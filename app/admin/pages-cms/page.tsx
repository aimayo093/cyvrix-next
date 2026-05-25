import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createCmsPage,
  updateCmsPage,
  deleteCmsPage,
  createPageSection,
  updatePageSection,
  deletePageSection,
  reorderPageSections,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Pencil, ArrowUp, ArrowDown, Layers, FileText, Settings, Sparkles, AlertTriangle } from "lucide-react";

export const metadata = { title: "Pages & Core Sections Builder | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function PagesCMSPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    tab?: string;
    sectionId?: string;
    newSection?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const pages = await prisma.cmsPage.findMany({
    orderBy: [{ slug: "asc" }],
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const editingPage = sp.edit ? pages.find((p) => p.id === sp.edit) ?? null : null;
  const currentTab = sp.tab || "sections";

  const selectedSection = editingPage && sp.sectionId
    ? editingPage.sections.find((s) => s.id === sp.sectionId) ?? null
    : null;

  const isCreatingSection = sp.newSection === "true" && editingPage;

  // Available Section Types mapping
  const sectionTypes = [
    { type: "hero", name: "Hero Banner" },
    { type: "accredited_partners", name: "Accredited Partners Logos" },
    { type: "trusted_businesses", name: "Trusted Clients Slider" },
    { type: "services_grid", name: "Services Highlight Grid" },
    { type: "compliance_cards", name: "Compliance & Security Trust Cards" },
    { type: "features", name: "Features Grid" },
    { type: "statistics", name: "Numerical Statistics Grid" },
    { type: "testimonials", name: "Client Testimonials Grid" },
    { type: "faq", name: "FAQ Accordion List" },
    { type: "pricing", name: "Pricing Tiers Grid" },
    { type: "text_block", name: "Custom Rich Text/Body Block" },
    { type: "contact_form", name: "Interactive Contact Forms" },
    { type: "about_company", name: "About CYVRIX Company Block" },
    { type: "mission", name: "Mission & Values Block" },
    { type: "careers_list", name: "Active Job Listings list" },
    { type: "pricing_hero", name: "Pricing Header Banner" },
    { type: "contact_hero", name: "Contact Header Info Block" },
    { type: "support_hero", name: "Support Hub Header Banner" },
    { type: "faq_hero", name: "FAQ Search Header Banner" },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <Layers className="h-8 w-8 text-[#2691F0]" />
            Pages & Core Section Builder
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Build modern, fully editable corporate pages, rearrange rich sections, rewrite content, and upload media assets instantly.
          </p>
        </div>
        <a
          href="/admin/pages-cms?edit=new"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors shrink-0 font-outfit"
        >
          <Plus className="h-4 w-4" />
          Create Public Page
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pages Sidebar List */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
            <h3 className="font-outfit font-black text-slate-800">Public Pages</h3>
            <p className="text-[10px] text-slate-400">Select page to customize sections</p>
          </div>
          <div className="divide-y divide-slate-100">
            {pages.map((p) => (
              <div
                key={p.id}
                className={`p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors ${
                  editingPage?.id === p.id ? "bg-blue-50/50 border-l-4 border-l-[#2691F0]" : ""
                }`}
              >
                <div className="min-w-0">
                  <a
                    href={`/admin/pages-cms?edit=${p.id}&tab=sections`}
                    className="font-outfit font-black text-slate-800 text-sm hover:text-[#2691F0] transition-colors block truncate"
                  >
                    {p.title}
                  </a>
                  <code className="text-[10px] text-slate-400 font-mono">
                    /{p.slug === "home" ? "" : p.slug}
                  </code>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <a
                    href={`/admin/pages-cms?edit=${p.id}&tab=sections`}
                    className="p-1 rounded text-slate-400 hover:text-[#2691F0]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </a>
                  {!["home", "about", "contact", "careers", "faq", "pricing", "support"].includes(p.slug) && (
                    <form action={deleteCmsPage}>
                      <input type="hidden" name="id" value={p.id} />
                      <DeleteButton message={`Delete page "${p.title}" and all its page builder sections?`} />
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace Central Builder */}
        <div className="lg:col-span-9 space-y-6">
          {editingPage ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Tab Selector */}
              <div className="bg-slate-50 border-b border-slate-150 px-6 py-1 flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-4">
                  <a
                    href={`/admin/pages-cms?edit=${editingPage.id}&tab=sections`}
                    className={`py-3.5 font-outfit font-black text-xs uppercase tracking-wider border-b-2 transition-colors ${
                      currentTab === "sections"
                        ? "border-b-[#2691F0] text-[#2691F0]"
                        : "border-b-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Page Sections ({editingPage.sections.length})
                  </a>
                  <a
                    href={`/admin/pages-cms?edit=${editingPage.id}&tab=settings`}
                    className={`py-3.5 font-outfit font-black text-xs uppercase tracking-wider border-b-2 transition-colors ${
                      currentTab === "settings"
                        ? "border-b-[#2691F0] text-[#2691F0]"
                        : "border-b-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Settings & SEO
                  </a>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-black uppercase px-2.5 py-0.5 rounded tracking-wide">
                    Live
                  </span>
                  <a
                    href={editingPage.slug === "home" ? "/" : `/${editingPage.slug}`}
                    target="_blank"
                    className="text-[10px] text-[#2691F0] font-black underline"
                  >
                    View Page
                  </a>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                {currentTab === "settings" && (
                  <form action={updateCmsPage} className="space-y-6">
                    <input type="hidden" name="id" value={editingPage.id} />
                    <h3 className="font-outfit text-lg font-black text-slate-800">
                      Page settings & SEO Metadata
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <label className="block text-sm font-bold text-slate-700">
                        Page Title (Internal name)
                        <input
                          name="title"
                          required
                          defaultValue={editingPage.title}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                        />
                      </label>
                      <label className="block text-sm font-bold text-slate-700">
                        URL Slug
                        <input
                          name="slug"
                          defaultValue={editingPage.slug}
                          readOnly={["home", "about", "contact", "careers", "faq", "pricing", "support"].includes(editingPage.slug)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none read-only:bg-slate-100 font-mono"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      <label className="block text-sm font-bold text-slate-700">
                        SEO Meta Title
                        <input
                          name="seoTitle"
                          defaultValue={editingPage.seoTitle || ""}
                          placeholder="e.g. CYVRIX | Professional Cyber Security Services"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                        />
                      </label>
                      <label className="block text-sm font-bold text-slate-700">
                        SEO Meta Description
                        <input
                          name="seoDescription"
                          defaultValue={editingPage.seoDescription || ""}
                          placeholder="Short summary of page content for search engines..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2 pt-6 border-t border-slate-100">
                      <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold px-6">
                        Save Metadata
                      </Button>
                    </div>
                  </form>
                )}

                {currentTab === "sections" && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Sections Tree */}
                    <div className="xl:col-span-6 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <h4 className="font-outfit font-black text-slate-800">Page Section List</h4>
                        <a
                          href={`/admin/pages-cms?edit=${editingPage.id}&tab=sections&newSection=true`}
                          className="inline-flex items-center gap-1.5 bg-[#2691F0] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg hover:bg-[#041635] transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Section
                        </a>
                      </div>

                      {editingPage.sections.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                          <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-semibold">No builder sections added yet.</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Click &quot;Add Section&quot; to build beautiful pages.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {editingPage.sections.map((section, index) => (
                            <div
                              key={section.id}
                              className={`border border-slate-150 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 ${
                                sp.sectionId === section.id ? "ring-2 ring-[#2691F0]" : ""
                              }`}
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-outfit font-black text-slate-800 text-xs truncate block max-w-[180px]">
                                    {section.title || "(Untitled Section)"}
                                  </span>
                                  <span className="text-[9px] font-bold text-[#2691F0] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                                    {section.sectionType}
                                  </span>
                                  {!section.isVisible && (
                                    <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 leading-snug line-clamp-1">
                                  {section.subtitle || "No subtitle configured."}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Section Reordering */}
                                <form action={reorderPageSections} className="flex">
                                  <input type="hidden" name="pageId" value={editingPage.id} />
                                  <input
                                    type="hidden"
                                    name="ids"
                                    value={JSON.stringify(
                                      index > 0
                                        ? editingPage.sections.map((s, sIdx) => {
                                            if (sIdx === index - 1) return editingPage.sections[index].id;
                                            if (sIdx === index) return editingPage.sections[index - 1].id;
                                            return s.id;
                                          })
                                        : []
                                    )}
                                  />
                                  <button
                                    type="submit"
                                    disabled={index === 0}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                </form>

                                <form action={reorderPageSections} className="flex">
                                  <input type="hidden" name="pageId" value={editingPage.id} />
                                  <input
                                    type="hidden"
                                    name="ids"
                                    value={JSON.stringify(
                                      index < editingPage.sections.length - 1
                                        ? editingPage.sections.map((s, sIdx) => {
                                            if (sIdx === index) return editingPage.sections[index + 1].id;
                                            if (sIdx === index + 1) return editingPage.sections[index].id;
                                            return s.id;
                                          })
                                        : []
                                    )}
                                  />
                                  <button
                                    type="submit"
                                    disabled={index === editingPage.sections.length - 1}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                </form>

                                <a
                                  href={`/admin/pages-cms?edit=${editingPage.id}&tab=sections&sectionId=${section.id}`}
                                  className="p-1 text-slate-400 hover:text-[#2691F0]"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </a>
                                <form action={deletePageSection}>
                                  <input type="hidden" name="id" value={section.id} />
                                  <DeleteButton message="Delete this page section? This will remove all block elements instantly." />
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section Work Form */}
                    <div className="xl:col-span-6 bg-slate-50/50 border border-slate-150 rounded-2xl p-4">
                      {isCreatingSection && (
                        <form action={createPageSection} className="space-y-4">
                          <input type="hidden" name="pageId" value={editingPage.id} />
                          <h4 className="font-outfit text-sm font-black text-slate-800">
                            Add Dynamic Section Block
                          </h4>

                          <label className="block text-xs font-bold text-slate-700">
                            Section Category/Type
                            <select
                              name="sectionType"
                              required
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] bg-white font-semibold"
                            >
                              {sectionTypes.map((st) => (
                                <option key={st.type} value={st.type}>
                                  {st.name} ({st.type})
                                </option>
                              ))}
                            </select>
                          </label>

                          <SectionFormFields />

                          <div className="flex gap-2 pt-2 border-t border-slate-200">
                            <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-2 rounded-xl text-xs font-bold">
                              Add Section
                            </Button>
                            <a
                              href={`/admin/pages-cms?edit=${editingPage.id}&tab=sections`}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-xl text-xs text-center"
                            >
                              Cancel
                            </a>
                          </div>
                        </form>
                      )}

                      {selectedSection && (
                        <form action={updatePageSection} className="space-y-4">
                          <input type="hidden" name="id" value={selectedSection.id} />
                          <h4 className="font-outfit text-sm font-black text-slate-800">
                            Edit Block: <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-[#2691F0]">{selectedSection.sectionType}</code>
                          </h4>

                          <SectionFormFields defaults={selectedSection} />

                          <div className="flex gap-2 pt-2 border-t border-slate-200">
                            <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-2 rounded-xl text-xs font-bold">
                              Save Changes
                            </Button>
                            <a
                              href={`/admin/pages-cms?edit=${editingPage.id}&tab=sections`}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-xl text-xs text-center"
                            >
                              Cancel
                            </a>
                          </div>
                        </form>
                      )}

                      {!isCreatingSection && !selectedSection && (
                        <div className="text-center py-24 text-slate-400">
                          <Layers className="h-8 w-8 mx-auto mb-2 text-slate-350" />
                          <h5 className="font-outfit font-black text-slate-600 text-xs">Section Editor</h5>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                            Click add section to create a new layout block or click pencil on existing sections to rewrite content and upload background assets.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-300">
              <FileText className="h-16 w-16 mx-auto mb-4 text-slate-200" />
              <h3 className="font-outfit font-black text-slate-600 text-lg">Select Page to Customize</h3>
              <p className="text-sm font-semibold text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                CYVRIX dynamic layouts map directly from your sidebar pages list. Select a page to start customizing the interactive modules.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionFormFields({ defaults }: { defaults?: any }) {
  return (
    <>
      <label className="block text-xs font-bold text-slate-700">
        Section Title (H2/H3 text)
        <input
          name="title"
          defaultValue={defaults?.title}
          placeholder="e.g. Next-Gen Security Auditing"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-1 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <label className="block text-xs font-bold text-slate-700">
        Subtitle (Supporting headline)
        <input
          name="subtitle"
          defaultValue={defaults?.subtitle}
          placeholder="e.g. Tailored penetration tests mapped to compliance standards"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-1 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <label className="block text-xs font-bold text-slate-700">
        Body Content / Paragraph
        <textarea
          name="body"
          rows={3}
          defaultValue={defaults?.body}
          placeholder="Main section description paragraphs..."
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-1 focus:ring-[#2691F0] focus:outline-none resize-none"
        />
      </label>

      <div className="block text-xs font-bold text-slate-700">
        Section Media / Banner Image (Optional)
        <div className="mt-1">
          <ImageUpload name="mediaId" defaultValue={defaults?.mediaId || ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-xs font-bold text-slate-700">
          Action Button Label
          <input
            name="buttonLabel"
            defaultValue={defaults?.buttonLabel}
            placeholder="e.g. Book Audit"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-1 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Action Button URL
          <input
            name="buttonUrl"
            defaultValue={defaults?.buttonUrl}
            placeholder="e.g. /contact"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-1 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-xs font-bold text-slate-700">
          Background Style
          <select
            name="backgroundStyle"
            defaultValue={defaults?.backgroundStyle || "dark"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] bg-white font-semibold"
          >
            <option value="dark">Dark Deep Navy (#020817)</option>
            <option value="light">Premium Pure Light</option>
            <option value="brand">Sleek Gradient Brand Accent</option>
            <option value="glassmorphic">Glassmorphic Navy Overlay</option>
          </select>
        </label>

        <label className="block text-xs font-bold text-slate-700">
          Layout Align Style
          <select
            name="layoutStyle"
            defaultValue={defaults?.layoutStyle || "split"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] bg-white font-semibold"
          >
            <option value="split">Split Row (Media + Text)</option>
            <option value="center">Centered Full Width</option>
            <option value="left">Left Aligned Full Width</option>
            <option value="media_right">Media on Right, Text on Left</option>
          </select>
        </label>
      </div>

      <label className="block text-xs font-bold text-slate-700">
        Advanced Settings (JSON metadata)
        <textarea
          name="settingsJson"
          rows={3}
          defaultValue={defaults?.settingsJson ? JSON.stringify(defaults.settingsJson, null, 2) : "{}"}
          placeholder='{"features": [{"title": "Step 1", "desc": "Auditing"}]}'
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-600 focus:ring-1 focus:ring-[#2691F0] focus:outline-none"
        />
        <p className="text-[9px] text-slate-400 mt-0.5">Used for secondary CTA links or custom list items within specific components.</p>
      </label>

      <label className="block text-xs font-bold text-slate-700">
        Visibility State
        <select
          name="isVisible"
          defaultValue={defaults?.isVisible !== false ? "true" : "false"}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-[#041635] bg-white font-semibold"
        >
          <option value="true">Active & Visible</option>
          <option value="false">Hidden Block</option>
        </select>
      </label>
    </>
  );
}
