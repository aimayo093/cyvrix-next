import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  reorderSocialLinks,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Plus, Pencil, Globe, ArrowUp, ArrowDown } from "lucide-react";

export const metadata = { title: "Social Links CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function SocialLinksCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; newItem?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const socialLinks = await prisma.socialLink.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const editing = sp.edit ? socialLinks.find((l) => l.id === sp.edit) ?? null : null;
  const isCreating = sp.newItem === "true";

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <Globe className="h-8 w-8 text-[#2691F0]" />
            Social Links CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your company's social profiles, sorting hierarchies, and footer icon triggers.
          </p>
        </div>
        <a
          href="/admin/social-links?newItem=true"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Social Profile
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Social List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-outfit font-black text-slate-800 border-b border-slate-100 pb-4 mb-6">
            Configured Social Channels
          </h3>

          {socialLinks.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Globe className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No social channels defined yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Add Social Profile&quot; to configure your first record.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {socialLinks.map((link, index) => (
                <div
                  key={link.id}
                  className={`border border-slate-150 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 ${
                    editing?.id === link.id ? "ring-2 ring-[#2691F0]" : ""
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-outfit font-black text-slate-800 text-sm">
                        {link.platform}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded font-mono">
                        {link.iconKey}
                      </span>
                      {!link.isVisible && (
                        <span className="text-[9px] bg-rose-500/10 text-rose-600 font-bold px-2 py-0.5 rounded">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#2691F0] font-semibold truncate max-w-md">
                      {link.url}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Label: {link.label}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reordering */}
                    <form action={reorderSocialLinks}>
                      <input
                        type="hidden"
                        name="ids"
                        value={JSON.stringify(
                          index > 0
                            ? socialLinks.map((sl, slIdx) => {
                                if (slIdx === index - 1) return socialLinks[index].id;
                                if (slIdx === index) return socialLinks[index - 1].id;
                                return sl.id;
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
                    <form action={reorderSocialLinks}>
                      <input
                        type="hidden"
                        name="ids"
                        value={JSON.stringify(
                          index < socialLinks.length - 1
                            ? socialLinks.map((sl, slIdx) => {
                                if (slIdx === index) return socialLinks[index + 1].id;
                                if (slIdx === index + 1) return socialLinks[index].id;
                                return sl.id;
                              })
                            : []
                        )}
                      />
                      <button
                        type="submit"
                        disabled={index === socialLinks.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </form>

                    <a
                      href={`/admin/social-links?edit=${link.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </a>
                    <form action={deleteSocialLink}>
                      <input type="hidden" name="id" value={link.id} />
                      <DeleteButton message={`Delete social link for "${link.platform}"?`} />
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
            {isCreating && (
              <form action={createSocialLink} className="space-y-4">
                <h3 className="font-outfit text-lg font-black text-[#041635]">Add Social Profile</h3>
                <SocialFormFields />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Create Profile
                  </Button>
                  <a href="/admin/social-links" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {editing && (
              <form action={updateSocialLink} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">Edit: {editing.platform}</h3>
                <SocialFormFields defaults={editing} />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Changes
                  </Button>
                  <a href="/admin/social-links" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {!isCreating && !editing && (
              <div className="text-center py-24 text-slate-300">
                <Globe className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <h4 className="font-outfit font-black text-slate-600 text-base">Select Social Channel</h4>
                <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose a social platform to edit, delete, or rearrange in order to configure custom footer social icons.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialFormFields({ defaults }: { defaults?: any }) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">
        Platform Title
        <input
          name="platform"
          required
          defaultValue={defaults?.platform}
          placeholder="e.g. LinkedIn"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Profile / Channel URL
        <input
          name="url"
          required
          defaultValue={defaults?.url}
          placeholder="https://linkedin.com/company/cyvrix"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Accessibility Label
          <input
            name="label"
            required
            defaultValue={defaults?.label}
            placeholder="e.g. LinkedIn Company Page"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Lucide Icon Fallback Key
          <input
            name="iconKey"
            required
            defaultValue={defaults?.iconKey || "Globe"}
            placeholder="e.g. Linkedin, Twitter, Github, Mail"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none font-semibold"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <label className="flex items-center gap-2 text-slate-700 text-sm font-bold cursor-pointer">
          <input
            type="checkbox"
            name="openInNewTab"
            value="true"
            defaultChecked={defaults?.openInNewTab !== false}
            className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0] h-4 w-4"
          />
          Open in New Tab
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Visibility
          <select
            name="isVisible"
            defaultValue={defaults?.isVisible !== false ? "true" : "false"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-[#041635] bg-white font-semibold"
          >
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </label>
      </div>
    </>
  );
}
