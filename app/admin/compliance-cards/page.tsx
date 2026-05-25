import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createComplianceCard,
  updateComplianceCard,
  deleteComplianceCard,
  reorderComplianceCards,
  toggleComplianceCardFooter,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Pencil, ShieldCheck, ArrowUp, ArrowDown } from "lucide-react";

export const metadata = { title: "Compliance Framework Cards CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function ComplianceCardsCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; newItem?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const cards = await prisma.complianceCard.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const editing = sp.edit ? cards.find((c) => c.id === sp.edit) ?? null : null;
  const isCreating = sp.newItem === "true";

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-[#2691F0]" />
            Compliance & Trust Cards CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure trust badges, security standards, and legislative guidelines (ISO 27001, Cyber Essentials, GDPR).
          </p>
        </div>
        <a
          href="/admin/compliance-cards?newItem=true"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Trust Card
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Compliance Cards list */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-outfit font-black text-slate-800 border-b border-slate-100 pb-4 mb-6">
            Compliance Frameworks & Standards
          </h3>

          {cards.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No compliance cards defined yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Add Trust Card&quot; to configure your first record.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className={`border border-slate-150 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 ${
                    editing?.id === card.id ? "ring-2 ring-[#2691F0]" : ""
                  }`}
                >
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
                      {card.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.logoUrl}
                          alt={card.title}
                          className="object-contain w-full h-full"
                        />
                      ) : (
                        <ShieldCheck className="h-6 w-6 text-[#2691F0]" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-outfit font-black text-slate-800 text-sm">
                          {card.title}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          card.status === "Certified"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : card.status === "In progress"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}>
                          {card.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs truncate max-w-md">
                        {card.description}
                      </p>
                      <div className="flex gap-1.5 flex-wrap pt-0.5 items-center">
                        <span className="text-[9px] font-semibold text-slate-400">
                          Cat: {card.category}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          Pages: {card.displayLocation}
                        </span>
                        {card.displayLocation?.toLowerCase().split(",").map((l: string) => l.trim()).includes("footer") && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-[#2691F0]">
                            Active In Footer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reordering */}
                    <form action={reorderComplianceCards}>
                      <input
                        type="hidden"
                        name="ids"
                        value={JSON.stringify(
                          index > 0
                            ? cards.map((c, cIdx) => {
                                if (cIdx === index - 1) return cards[index].id;
                                if (cIdx === index) return cards[index - 1].id;
                                return c.id;
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
                    <form action={reorderComplianceCards}>
                      <input
                        type="hidden"
                        name="ids"
                        value={JSON.stringify(
                          index < cards.length - 1
                            ? cards.map((c, cIdx) => {
                                if (cIdx === index) return cards[index + 1].id;
                                if (cIdx === index + 1) return cards[index].id;
                                return c.id;
                              })
                            : []
                        )}
                      />
                      <button
                        type="submit"
                        disabled={index === cards.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </form>

                    <form action={toggleComplianceCardFooter} className="shrink-0">
                      <input type="hidden" name="id" value={card.id} />
                      <button
                        type="submit"
                        className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border transition-all ${
                          card.displayLocation?.toLowerCase().split(",").map((l: string) => l.trim()).includes("footer")
                            ? "bg-slate-105 border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-250 hover:text-red-600"
                            : "bg-[#2691F0]/5 border-[#2691F0]/20 text-[#2691F0] hover:bg-[#2691F0] hover:text-white"
                        }`}
                      >
                        {card.displayLocation?.toLowerCase().split(",").map((l: string) => l.trim()).includes("footer")
                          ? "Remove"
                          : "Add to Footer"}
                      </button>
                    </form>

                    <a
                      href={`/admin/compliance-cards?edit=${card.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </a>
                    <form action={deleteComplianceCard}>
                      <input type="hidden" name="id" value={card.id} />
                      <DeleteButton message={`Delete compliance card for "${card.title}"?`} />
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
              <form action={createComplianceCard} className="space-y-4">
                <h3 className="font-outfit text-lg font-black text-[#041635]">Add Trust Card</h3>
                <ComplianceFormFields />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Create Card
                  </Button>
                  <a href="/admin/compliance-cards" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {editing && (
              <form action={updateComplianceCard} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">Edit: {editing.title}</h3>
                <ComplianceFormFields defaults={editing} />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Changes
                  </Button>
                  <a href="/admin/compliance-cards" className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {!isCreating && !editing && (
              <div className="text-center py-24 text-slate-300">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <h4 className="font-outfit font-black text-slate-600 text-base">Select Trust Card</h4>
                <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose a certification card to edit its description, verification state, specific display page context, and badges.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceFormFields({ defaults }: { defaults?: any }) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">
        Framework Title
        <input
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="e.g. ISO 27001"
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
            placeholder="e.g. Technical Security"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Status / State Badge
          <select
            name="status"
            defaultValue={defaults?.status || "Framework followed"}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-[#041635] bg-white font-semibold"
          >
            <option value="Certified">Certified</option>
            <option value="In progress">In progress</option>
            <option value="Framework followed">Framework followed</option>
          </select>
        </label>
      </div>

      <div className="block text-sm font-bold text-slate-700">
        Certification Logo Badge (Optional)
        <div className="mt-1.5">
          <ImageUpload name="logoUrl" defaultValue={defaults?.logoUrl || ""} />
        </div>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        Description
        <textarea
          name="description"
          rows={3}
          required
          defaultValue={defaults?.description}
          placeholder="Short breakdown of alignment and controls..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Verification/Link URL (Optional)
          <input
            name="externalUrl"
            defaultValue={defaults?.externalUrl}
            placeholder="https://iasme.co.uk"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Display Context (Comma-separated pages)
          <input
            name="displayLocation"
            required
            defaultValue={defaults?.displayLocation || "homepage"}
            placeholder="homepage,about,compliance_page"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none font-mono"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <label className="block text-sm font-bold text-slate-700">
          Lucide Icon Fallback Key
          <input
            name="iconKey"
            defaultValue={defaults?.iconKey || "Shield"}
            placeholder="e.g. Shield, CheckCircle, Lock"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Visibility
          <select
            name="isVisible"
            defaultValue={defaults?.isVisible !== false ? "true" : "false"}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-[#041635] bg-white font-semibold"
          >
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2 pt-4 pb-2 text-sm font-bold text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          name="showInFooter"
          id="showInFooter"
          defaultChecked={
            defaults?.displayLocation
              ? defaults.displayLocation.split(",").map((l: string) => l.trim().toLowerCase()).includes("footer")
              : false
          }
          className="h-4 w-4 rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0] cursor-pointer"
        />
        <label htmlFor="showInFooter" className="cursor-pointer">Display Card in Public Footer</label>
      </div>
    </>
  );
}
