import * as React from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Eye, EyeOff, Pencil, Plus, Tags } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServiceProduct, deleteServiceProduct, toggleServiceProductPublish, updateServiceProduct } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ServiceProductFormFields } from "@/components/admin/ServiceProductFormFields";

export const metadata = { title: "Service Products" };

async function loadServiceProductData() {
  try {
    const [products, services] = await Promise.all([
      prisma.servicePackage.findMany({
        include: { Service: { select: { title: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.service.findMany({
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
    ]);

    return { products, services };
  } catch (error) {
    console.error("[service-products] database schema is not ready", error);
    return null;
  }
}

export default async function ServiceProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; newItem?: string }>;
}) {
  await connection();
  await requireAdmin();
  const [params, data] = await Promise.all([searchParams, loadServiceProductData()]);

  if (!data) {
    return (
      <div className="max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="font-outfit text-2xl font-black text-[#041635]">Service Products CMS needs the prepared database migration</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">No product data can be edited until the prepared Service Products migration has been applied in the approved staging environment. This page remains unavailable rather than exposing a partial editor.</p>
      </div>
    );
  }

  const { products, services } = data;
  const editing = params.edit ? products.find((product) => product.id === params.edit) ?? null : null;
  const isCreating = params.newItem === "true";

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-outfit text-3xl font-black text-[#041635]"><Tags className="h-8 w-8 text-[#2691F0]" />Service Products</h1>
          <p className="mt-1 text-sm text-slate-500">Create productised service plans with deliberate pricing visibility and a controlled enquiry route.</p>
        </div>
        <Link href="/admin/service-products?newItem=true" className="inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#041635]"><Plus className="h-4 w-4" />Add service product</Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Product</th><th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Pricing</th><th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th><th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((product) => (
                <tr key={product.id} className={editing?.id === product.id ? "bg-blue-50/50" : "transition-colors hover:bg-slate-50/70"}>
                  <td className="px-6 py-4"><p className="text-sm font-black text-[#041635]">{product.name}</p><p className="mt-1 text-xs text-slate-400">{product.Service?.title || "No linked service"}</p></td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-500">{product.priceDisplayMode.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="px-6 py-4"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${product.published ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-amber-100 bg-amber-50 text-amber-600"}`}>{product.published ? "Published" : "Draft"}</span></td>
                  <td className="px-6 py-4"><div className="flex justify-end gap-1"><Link href={`/admin/service-products?edit=${product.id}`} title="Edit" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#2691F0]"><Pencil className="h-4 w-4" /></Link><form action={toggleServiceProductPublish}><input type="hidden" name="id" value={product.id} /><button type="submit" title={product.published ? "Unpublish" : "Publish"} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600">{product.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></form><form action={deleteServiceProduct}><input type="hidden" name="id" value={product.id} /><DeleteButton message={`Delete “${product.name}”? This cannot be undone.`} /></form></div></td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">No service products yet. Add a draft when its commercial details are ready for review.</td></tr>}
            </tbody>
          </table>
        </div>

        <aside className="lg:col-span-5">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {isCreating ? (
              <form action={createServiceProduct} className="space-y-4">
                <h2 className="font-outfit text-lg font-black text-[#041635]">Create service product</h2>
                <p className="text-xs font-semibold leading-5 text-slate-400">New products are saved as drafts and will not be public until explicitly published.</p>
                <ServiceProductFormFields services={services} />
                <div className="flex gap-2 pt-2"><Button type="submit" className="flex-1 bg-[#041635] py-3 font-bold text-white hover:bg-[#2691F0]">Save draft</Button><Link href="/admin/service-products" className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</Link></div>
              </form>
            ) : editing ? (
              <form action={updateServiceProduct} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <h2 className="font-outfit text-lg font-black text-[#041635]">Edit {editing.name}</h2>
                <ServiceProductFormFields services={services} defaults={editing} />
                <div className="flex gap-2 pt-2"><Button type="submit" className="flex-1 bg-[#041635] py-3 font-bold text-white hover:bg-[#2691F0]">Save changes</Button><Link href="/admin/service-products" className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</Link></div>
              </form>
            ) : (
              <div className="py-16 text-center"><Tags className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-400">Select a product to edit or add a new draft.</p></div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
