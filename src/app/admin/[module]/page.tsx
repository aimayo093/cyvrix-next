import Link from "next/link";
import { notFound } from "next/navigation";
import { saveCmsDraft } from "@/lib/actions";
import { adminModules, findAdminModule } from "@/lib/cyvrix-data";
import { requireAdmin } from "@/lib/auth";
import { ArrowLeft, Eye, Filter, ImageIcon, Plus, Save, Search, Trash2 } from "lucide-react";

export function generateStaticParams() {
  return adminModules.filter((module) => module !== "Dashboard").map((module) => ({ module: slug(module) }));
}

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  await requireAdmin();
  const fallbackName = adminModules.find((item) => slug(item) === module);
  const details = findAdminModule(module) ?? (fallbackName ? {
    name: fallbackName,
    description: "Manage records, visibility, status, audit history, and publishing workflow for this control panel area.",
    records: ["Draft item", "Published item", "Archived item"],
    fields: ["Title", "Status", "Visibility", "Sort order", "Notes"],
  } : null);
  if (!details) notFound();

  const isMedia = slug(details.name).includes("media");
  const isTicket = slug(details.name).includes("ticket");
  const isSettings = slug(details.name).includes("settings");

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-700"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
            <h1 className="mt-3 font-outfit text-4xl font-black">{details.name}</h1>
            <p className="mt-2 max-w-3xl leading-7 text-slate-600">{details.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-bold"><Filter className="h-4 w-4" /> Filter</button>
            <button className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-black text-white"><Plus className="h-4 w-4" /> New item</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-outfit text-2xl font-black">Records</h2>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              Search records
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <span>Name</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {details.records.map((record, index) => (
              <div key={`${record}-${index}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-slate-200 px-4 py-4">
                <div>
                  <p className="font-bold">{record}</p>
                  <p className="text-sm text-slate-500">Visible · Sort {index + 1} · SEO ready</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{index === 0 ? "Published" : "Draft"}</span>
                <div className="flex gap-2">
                  <button className="rounded-md border border-slate-200 p-2" aria-label="Preview"><Eye className="h-4 w-4" /></button>
                  <button className="rounded-md border border-slate-200 p-2 text-rose-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          {isTicket ? <TicketWorkflow /> : null}
          {isMedia ? <MediaWorkflow /> : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-outfit text-2xl font-black">{isSettings ? "Settings editor" : "Editor"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Fields below mirror the CMS controls for this module. Saving records writes audit logs and uses Prisma-backed persistence in production flows.</p>
          <form action={saveCmsDraft} className="mt-6 grid gap-4">
            <input type="hidden" name="module" value={details.name} />
            <Field name="title" label={isSettings ? "Setting group" : "Title"} placeholder={details.fields[0] ?? "Title"} required />
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="slug" label="Slug / key" placeholder="managed-it-support" />
              <label className="text-sm font-bold">Status<select name="status" className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3"><option>draft</option><option>published</option><option>archived</option></select></label>
            </div>
            <label className="text-sm font-bold">Summary / excerpt<textarea name="summary" rows={3} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3" placeholder="Short public-facing summary" /></label>
            <label className="text-sm font-bold">Rich content / block JSON<textarea name="body" rows={8} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3" placeholder="Rich text, page block configuration, FAQ body, notes, or settings JSON" /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="seoTitle" label="SEO title" placeholder="CYVRIX Technologies" />
              <Field name="seoDescription" label="SEO description" placeholder="Search result description" />
            </div>
            <div className="rounded-lg border border-dashed border-slate-300 p-5">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-cyan-600" />
                <div>
                  <p className="font-bold">Image picker</p>
                  <p className="text-sm text-slate-500">Select from media library, replace image, set alt text and caption.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
              {details.fields.slice(0, 8).map((field) => <label key={field} className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" defaultChecked /> {field}</label>)}
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 font-black text-white"><Save className="h-4 w-4" /> Save and audit</button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ name, label, placeholder, required = false }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return <label className="text-sm font-bold">{label}<input name={name} required={required} placeholder={placeholder} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3" /></label>;
}

function TicketWorkflow() {
  return <div className="mt-6 rounded-lg bg-slate-50 p-5"><h3 className="font-bold">Ticket statuses</h3><p className="mt-2 text-sm text-slate-600">New · Open · In Progress · Waiting on Client · Escalated · Resolved · Closed</p></div>;
}

function MediaWorkflow() {
  return <div className="mt-6 rounded-lg bg-slate-50 p-5"><h3 className="font-bold">Upload rules</h3><p className="mt-2 text-sm text-slate-600">Local storage first. Validate image type, size, filename, alt text, caption, and category. Cloudinary or Supabase Storage can be added behind the same metadata model.</p></div>;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
