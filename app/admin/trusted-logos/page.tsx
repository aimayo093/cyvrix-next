import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTrustedLogo,
  updateTrustedLogo,
  deleteTrustedLogo,
  reorderTrustedLogos,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Pencil, Users, ArrowUp, ArrowDown } from "lucide-react";

export const metadata = { title: "Trusted Client Logos CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function TrustedLogosCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; newItem?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const trustedLogos = await prisma.trustedBusinessLogo.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const editing = sp.edit ? trustedLogos.find((t) => t.id === sp.edit) ?? null : null;
  const isCreating = sp.newItem === "true";

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <Users className="h-8 w-8 text-[#2691F0]" />
            Trusted Client Logos CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage the client brand logos rendered in your infinite slider grids and trust marquees.
          </p>
        </div>
        <a
          href="/admin/trusted-logos?newItem=true"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Client Logo
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Logos Grid */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-outfit font-black text-slate-800 border-b border-slate-100 pb-4 mb-6">
            Client Showcase list
          </h3>

          {trustedLogos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No client logos added yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Add Client Logo&quot; to configure your first trust link.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {trustedLogos.map((client, index) => (
                <div
                  key={client.id}
                  className={`border border-slate-200 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/50 transition-colors flex flex-col justify-between items-center gap-3 ${
                    editing?.id === client.id ? "ring-2 ring-[#2691F0]" : ""
                  }`}
                >
                  <div className="w-full h-16 bg-[#041635] rounded-xl flex items-center justify-center p-2 border border-slate-250/20 overflow-hidden shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={client.logoUrl}
                      alt={client.altText || ""}
                      className="object-contain w-full h-full brightness-0 invert"
                    />
                  </div>

                  <div className="text-center w-full min-w-0">
                    <span className="font-outfit font-black text-slate-800 text-xs block truncate">
                      {client.companyName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between w-full border-t border-slate-100 pt-2 text-slate-500">
                    <div className="flex gap-0.5">
                      <form action={reorderTrustedLogos}>
                        <input
                          type="hidden"
                          name="ids"
                          value={JSON.stringify(
                            index > 0
                              ? trustedLogos.map((t, tIdx) => {
                                  if (tIdx === index - 1) return trustedLogos[index].id;
                                  if (tIdx === index) return trustedLogos[index - 1].id;
                                  return t.id;
                                })
                              : []
                          )}
                        />
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                      </form>
                      <form action={reorderTrustedLogos}>
                        <input
                          type="hidden"
                          name="ids"
                          value={JSON.stringify(
                            index < trustedLogos.length - 1
                              ? trustedLogos.map((t, tIdx) => {
                                  if (tIdx === index) return trustedLogos[index + 1].id;
                                  if (tIdx === index + 1) return trustedLogos[index].id;
                                  return t.id;
                                })
                              : []
                          )}
                        />
                        <button
                          type="submit"
                          disabled={index === trustedLogos.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={`/admin/trusted-logos?edit=${client.id}`}
                        className="p-1 text-slate-400 hover:text-[#2691F0]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </a>
                      <form action={deleteTrustedLogo}>
                        <input type="hidden" name="id" value={client.id} />
                        <DeleteButton message={`Delete client logo for "${client.companyName}"?`} />
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
              <form action={createTrustedLogo} className="space-y-4">
                <h3 className="font-outfit text-lg font-black text-[#041635]">Add Client Showcase</h3>
                <TrustedFormFields />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Add Client Logo
                  </Button>
                  <a href="/admin/trusted-logos" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {editing && (
              <form action={updateTrustedLogo} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">Edit Client: {editing.companyName}</h3>
                <TrustedFormFields defaults={editing} />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Changes
                  </Button>
                  <a href="/admin/trusted-logos" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {!isCreating && !editing && (
              <div className="text-center py-24 text-slate-300">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <h4 className="font-outfit font-black text-slate-600 text-base">Select Client</h4>
                <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Select a business logo to edit its description, click link, and custom sorting order inside trust banners.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustedFormFields({ defaults }: { defaults?: any }) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">
        Company Name
        <input
          name="companyName"
          required
          defaultValue={defaults?.companyName}
          placeholder="e.g. Acme Tech Solutions"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <div className="block text-sm font-bold text-slate-700">
        Client Logo Image
        <div className="mt-1.5">
          <ImageUpload name="logoUrl" defaultValue={defaults?.logoUrl || ""} />
        </div>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        Alt Text
        <input
          name="altText"
          defaultValue={defaults?.altText}
          placeholder="e.g. Acme Solutions corporate logo"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Website URL (Optional)
        <input
          name="websiteUrl"
          defaultValue={defaults?.websiteUrl}
          placeholder="https://acme.com"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
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
          Featured Client
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
