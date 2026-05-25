import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateBrandAsset } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Settings, AlertTriangle, ShieldCheck, Image as ImageIcon } from "lucide-react";

export const metadata = { title: "Brand Assets CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function BrandAssetsCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  let assets = await prisma.brandAsset.findMany({
    orderBy: { assetKey: "asc" },
  });

  const stickyExists = assets.some((a) => a.assetKey === "logo_sticky");
  if (!stickyExists) {
    const newSticky = await prisma.brandAsset.create({
      data: {
        id: crypto.randomUUID(),
        assetKey: "logo_sticky",
        name: "Sticky Header Logo",
        mediaUrl: "",
        altText: "CYVRIX Sticky Logo",
        usageContext: "Dark navy and glassmorphic scrolled sticky headers",
        isActive: true,
      },
    });
    assets.push(newSticky);
    assets.sort((a, b) => a.assetKey.localeCompare(b.assetKey));
  }

  const activeWhiteLogo = assets.find(
    (a) => a.assetKey === "logo_white" && a.isActive && a.mediaUrl
  );

  const editing = sp.edit ? assets.find((a) => a.id === sp.edit) ?? null : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#2691F0]" />
          Brand Assets CMS
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage corporate logos, favicon variants, and brand symbols for the CYVRIX Technologies platform.
        </p>
      </div>

      {/* Warning Box if white logo is missing or inactive */}
      {!activeWhiteLogo && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4 items-start shadow-sm max-w-4xl">
          <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-outfit font-black text-amber-900 text-base">
              Missing or Inactive White Monochrome Logo (`logo_white`)
            </h4>
            <p className="text-amber-800 text-sm leading-relaxed">
              The public sticky/scrolled headers transition into dark and glassmorphic designs which require a white/monochrome logo variant for perfect contrast. Without `logo_white` active and populated, your site might render an unreadable dark logo on sticky headers.
            </p>
            <div className="pt-2">
              <a
                href={`/admin/brand-assets?edit=${assets.find((a) => a.assetKey === "logo_white")?.id || ""}`}
                className="inline-flex items-center gap-1.5 font-bold text-xs text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Configure White Logo Variant
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Assets List */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
            <h3 className="font-outfit font-black text-slate-800">Available Logo Assets</h3>
            <p className="text-xs text-slate-400">All brand logos must come from Supabase / Local storage.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors ${
                  editing?.id === asset.id ? "bg-blue-50/50 border-l-4 border-l-[#2691F0]" : ""
                }`}
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="font-outfit font-black text-slate-800 text-sm">
                      {asset.name}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                      {asset.assetKey}
                    </span>
                    {asset.isActive ? (
                      <span className="bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{asset.usageContext || "General brand asset."}</p>
                  
                  {asset.mediaUrl ? (
                    <div className="flex items-center gap-2 text-xs text-[#2691F0] font-semibold pt-1">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="truncate max-w-xs">{asset.mediaUrl}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 pt-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      No asset URL configured
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {asset.mediaUrl && (
                    <div className="relative w-12 h-12 rounded-lg bg-[#041635] flex items-center justify-center p-1 border border-slate-200 overflow-hidden shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.mediaUrl}
                        alt={asset.altText || ""}
                        className="object-contain w-full h-full max-h-full max-w-full"
                      />
                    </div>
                  )}
                  <a
                    href={`/admin/brand-assets?edit=${asset.id}`}
                    className="bg-slate-100 text-slate-700 hover:bg-[#2691F0] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Edit
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Form */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
            {editing ? (
              <form action={updateBrandAsset} className="space-y-6">
                <input type="hidden" name="id" value={editing.id} />
                
                <div>
                  <h3 className="font-outfit text-lg font-black text-[#041635]">
                    Edit Asset: {editing.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    Key: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{editing.assetKey}</code>
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">
                    Asset Name
                    <input
                      name="name"
                      required
                      defaultValue={editing.name}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                    />
                  </label>

                  <div className="block text-sm font-bold text-slate-700">
                    Upload/Select Brand Image
                    <div className="mt-1.5">
                      <ImageUpload name="mediaUrl" defaultValue={editing.mediaUrl || ""} />
                    </div>
                  </div>

                  <label className="block text-sm font-bold text-slate-700">
                    Alt Text
                    <input
                      name="altText"
                      defaultValue={editing.altText || ""}
                      placeholder="e.g. CYVRIX primary colored brand logo"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                    />
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Usage Description
                    <input
                      name="usageContext"
                      defaultValue={editing.usageContext || ""}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                    />
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Status
                    <select
                      name="isActive"
                      defaultValue={editing.isActive ? "true" : "false"}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white"
                    >
                      <option value="true">Active & Enabled</option>
                      <option value="false">Disabled / Hidden</option>
                    </select>
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold transition-all"
                  >
                    Save Asset Changes
                  </Button>
                  <a
                    href="/admin/brand-assets"
                    className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-3 rounded-xl font-bold text-center text-sm transition-all"
                  >
                    Cancel
                  </a>
                </div>
              </form>
            ) : (
              <div className="text-center py-24 text-slate-300">
                <Settings className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <h4 className="font-outfit font-black text-slate-600 text-base">Select Brand Asset</h4>
                <p className="text-sm font-semibold text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Click the Edit button on any logo variant in the list to manage its image asset and details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
