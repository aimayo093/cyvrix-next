import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createPartnerLogo,
  updatePartnerLogo,
  deletePartnerLogo,
  reorderPartnerLogos,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Pencil, Star, Globe, ArrowUp, ArrowDown } from "lucide-react";

export const metadata = { title: "Partner Accreditations CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function PartnerLogosCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; newItem?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const partners = await prisma.partnerLogo.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const editing = sp.edit ? partners.find((p) => p.id === sp.edit) ?? null : null;
  const isCreating = sp.newItem === "true";

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <Star className="h-8 w-8 text-[#2691F0]" />
            Partner Accreditations CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Display your certified tech alliances, cloud partnerships, and industrial accreditations.
          </p>
        </div>
        <a
          href="/admin/partner-logos?newItem=true"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Partner Logo
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Partners Grid */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-outfit font-black text-slate-800 border-b border-slate-100 pb-4 mb-6">
            Registered Tech Partners
          </h3>

          {partners.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Star className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No partnerships added yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Add Partner Logo&quot; to configure your first trust link.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partners.map((partner, index) => (
                <div
                  key={partner.id}
                  className={`border border-slate-150 rounded-xl p-4 bg-slate-50/30 hover:bg-slate-50/50 transition-colors flex flex-col justify-between gap-3 ${
                    editing?.id === partner.id ? "ring-2 ring-[#2691F0]" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 bg-[#041635] rounded-xl flex items-center justify-center p-2 shrink-0 border border-slate-250/30 overflow-hidden shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={partner.logoUrl}
                        alt={partner.altText || ""}
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="font-outfit font-black text-slate-800 text-sm block truncate">
                        {partner.name}
                      </span>
                      <span className="text-[9px] font-bold text-[#2691F0] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                        {partner.category || "General"}
                      </span>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {partner.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                    <div className="flex gap-1">
                      {/* Reorder actions */}
                      <form action={reorderPartnerLogos}>
                        <input
                          type="hidden"
                          name="ids"
                          value={JSON.stringify(
                            index > 0
                              ? partners.map((p, pIdx) => {
                                  if (pIdx === index - 1) return partners[index].id;
                                  if (pIdx === index) return partners[index - 1].id;
                                  return p.id;
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
                      <form action={reorderPartnerLogos}>
                        <input
                          type="hidden"
                          name="ids"
                          value={JSON.stringify(
                            index < partners.length - 1
                              ? partners.map((p, pIdx) => {
                                  if (pIdx === index) return partners[index + 1].id;
                                  if (pIdx === index + 1) return partners[index].id;
                                  return p.id;
                                })
                              : []
                          )}
                        />
                        <button
                          type="submit"
                          disabled={index === partners.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </form>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {partner.isFeatured && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded mr-1">
                          Featured
                        </span>
                      )}
                      {!partner.isVisible && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded mr-1">
                          Hidden
                        </span>
                      )}
                      <a
                        href={`/admin/partner-logos?edit=${partner.id}`}
                        className="p-1 text-slate-400 hover:text-[#2691F0]"
                      >
                        <Pencil className="h-4 w-4" />
                      </a>
                      <form action={deletePartnerLogo}>
                        <input type="hidden" name="id" value={partner.id} />
                        <DeleteButton message={`Delete partnership with "${partner.name}"?`} />
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
            {isCreating && (
              <form action={createPartnerLogo} className="space-y-4">
                <h3 className="font-outfit text-lg font-black text-[#041635]">Add Partner Alliance</h3>
                <PartnerFormFields />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Create Alliance
                  </Button>
                  <a href="/admin/partner-logos" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {editing && (
              <form action={updatePartnerLogo} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">Edit Alliance: {editing.name}</h3>
                <PartnerFormFields defaults={editing} />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Changes
                  </Button>
                  <a href="/admin/partner-logos" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {!isCreating && !editing && (
              <div className="text-center py-24 text-slate-300">
                <Star className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <h4 className="font-outfit font-black text-slate-600 text-base">Select Tech Partner</h4>
                <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose a tech partner to edit, delete, or rearrange their showcase order on the public sections.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerFormFields({ defaults }: { defaults?: any }) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">
        Partner / Credential Name
        <input
          name="name"
          required
          defaultValue={defaults?.name}
          placeholder="e.g. Microsoft Gold Partner"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Category
          <input
            name="category"
            required
            defaultValue={defaults?.category}
            placeholder="e.g. Cloud, Security"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Website Link
          <input
            name="websiteUrl"
            defaultValue={defaults?.websiteUrl}
            placeholder="https://microsoft.com"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>
      </div>

      <div className="block text-sm font-bold text-slate-700">
        Partner Logo Image
        <div className="mt-1.5">
          <ImageUpload name="logoUrl" defaultValue={defaults?.logoUrl || ""} />
        </div>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        Short Description
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description}
          placeholder="Short overview of the partner alliance..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <label className="flex items-center gap-2 text-slate-700 text-sm font-bold cursor-pointer">
          <input
            type="checkbox"
            name="isFeatured"
            value="true"
            defaultChecked={defaults?.isFeatured}
            className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0] h-4 w-4"
          />
          Featured Partner
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
