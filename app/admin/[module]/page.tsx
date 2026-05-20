import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  Eye, 
  Filter, 
  ImageIcon, 
  Plus, 
  Save, 
  Search, 
  Trash2, 
  ShieldCheck, 
  Layers, 
  Server, 
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { saveCmsDraft } from "@/lib/actions";
import { adminModules, findAdminModule } from "@/lib/cyvrix-data";
import { Button } from "@/components/shared/Button";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function generateStaticParams() {
  return adminModules
    .filter((module) => module.toLowerCase() !== "dashboard")
    .map((module) => ({ module: slugify(module) }));
}

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  // 1. Authenticate & authorize on server
  await requireAdmin();

  const { module } = await params;

  // Find module details by checking slug matching
  const fallbackName = adminModules.find((item) => slugify(item) === module);
  const details = findAdminModule(module) ?? (fallbackName ? {
    name: fallbackName,
    description: "Manage records, visibility, status, audit history, and publishing workflow for this control panel area.",
    records: ["Draft item", "Published item", "Archived item"],
    fields: ["Title", "Status", "Visibility", "Sort order", "Notes"],
  } : null);

  if (!details) notFound();

  const isMedia = slugify(details.name).includes("media");
  const isTicket = slugify(details.name).includes("ticket");
  const isSettings = slugify(details.name).includes("settings");

  return (
    <div className="space-y-8 pb-16">
      {/* Header section with back-nav */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <Link 
            href="/admin" 
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#2691F0] hover:text-[#041635] uppercase tracking-wider mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="font-outfit text-3xl font-black text-[#041635] mb-2">{details.name}</h1>
          <p className="text-slate-500 font-medium text-sm max-w-2xl leading-relaxed">{details.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" className="bg-white">
            <Filter className="h-4 w-4 text-[#041635]" />
            Filter View
          </Button>
          <Button variant="default" size="sm" className="bg-[#2691F0] hover:bg-[#041635] text-white">
            <Plus className="h-4 w-4" />
            Create Record
          </Button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Records list */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="font-outfit text-lg font-black text-[#041635]">Existing Records</h2>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Quick lookup..." 
                  className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all w-48 text-[#041635]"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Record Identifier</th>
                    <th scope="col" className="px-6 py-3.5">Workflow Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {details.records.map((record, index) => (
                    <tr key={`${record}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black text-[#041635]">{record}</p>
                          <p className="text-xs text-slate-400 font-bold mt-0.5">Order #{index + 1} • SEO Hardened</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          index === 0 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-blue-50 text-[#2691F0] border border-blue-100"
                        }`}>
                          {index === 0 ? "Published" : "Draft Mode"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-[#041635]" title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contextual workflow panels */}
          {isTicket && <TicketWorkflow />}
          {isMedia && <MediaWorkflow />}
        </div>

        {/* Right Side: Form editor */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 sticky top-6">
            <div>
              <h2 className="font-outfit text-lg font-black text-[#041635]">
                {isSettings ? "Global Configuration Editor" : "Fields Record Editor"}
              </h2>
              <p className="text-slate-400 font-semibold text-xs mt-1">
                Persist changes directly to your secure PostgreSQL backend through Server Actions.
              </p>
            </div>

            <form action={saveCmsDraft} className="space-y-4">
              <input type="hidden" name="module" value={details.name} />

              <label className="block text-sm font-bold text-slate-700">
                {isSettings ? "Configuration Variable Group" : "Document / Resource Title"}
                <input 
                  name="title" 
                  required 
                  placeholder={details.fields[0] || "e.g. Workspace Configurations"}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm font-bold text-slate-700">
                  Unique Slug Key
                  <input 
                    name="slug" 
                    placeholder="e.g. managed-it-support"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Workflow Status
                  <select 
                    name="status"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  >
                    <option value="draft">Draft Mode</option>
                    <option value="published">Active & Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-bold text-slate-700">
                Short Description / Excerpt
                <textarea 
                  name="summary" 
                  rows={2} 
                  placeholder="Summary text displayed in public search feeds..."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold resize-none text-slate-600"
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Rich Markdown Content / Block JSON
                <textarea 
                  name="body" 
                  rows={6} 
                  placeholder="Markdown text, custom configurations JSON, or accordion body content..."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-mono font-semibold resize-none text-slate-600"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm font-bold text-slate-700">
                  Search Engine SEO Title
                  <input 
                    name="seoTitle" 
                    placeholder="e.g. CYVRIX Technologies | London"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Search Engine SEO Description
                  <input 
                    name="seoDescription" 
                    placeholder="Search result summary details..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>
              </div>

              {/* Glassmorphic Media File Picker mockup */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed p-4 flex gap-3 items-center">
                <div className="p-2.5 rounded-lg bg-blue-50 text-[#2691F0] shrink-0">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-[#041635]">Asset Media Picker</p>
                  <p className="text-slate-400 font-semibold mt-0.5">Select illustrations from public-media Supabase bucket.</p>
                </div>
              </div>

              {/* Display fields matching CMS options */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-500">
                {details.fields.slice(0, 8).map((field) => (
                  <label key={field} className="flex items-center gap-2 select-none hover:text-[#041635] transition-colors cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0] h-3.5 w-3.5" />
                    {field}
                  </label>
                ))}
              </div>

              <Button type="submit" variant="default" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all">
                <Save className="h-4 w-4" />
                Persist & Create Audit Log
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

function TicketWorkflow() {
  const categories = [
    { name: "SLA Targets", desc: "Aligned directly to customer premium agreement scopes." },
    { name: "Priority states", desc: "Low · Standard · Elevated · Business Critical Incident" },
    { name: "Active Pipeline", desc: "New → Awaiting Triaging → In Progress → Escalated → Resolved" }
  ];

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 border border-white/5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Server className="h-5 w-5 text-[#2691F0]" />
        <h3 className="font-outfit text-base font-bold">Client Ticket Queue Configuration</h3>
      </div>
      <p className="text-xs text-slate-400 font-semibold leading-relaxed">
        The ticket manager validates SLA resolution timers on active support messages. Admins can escalate or assign to support specialists.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {categories.map((cat, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <h4 className="text-xs font-black text-[#2691F0] uppercase tracking-wider">{cat.name}</h4>
            <p className="text-[10px] font-bold text-slate-300 leading-normal">{cat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaWorkflow() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-[#2691F0]" />
        <h3 className="font-outfit text-base font-black text-[#041635]">Supabase Media bucket upload</h3>
      </div>
      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
        Upload rules are governed by Supabase storage parameters. Files are saved in the `public-media` bucket. Maximum file sizes: Images 5MB, PDF reports 10MB. Correct file headers are validated in real-time.
      </p>
      <div className="flex gap-2 text-[10px] font-black uppercase text-slate-400">
        <span className="bg-slate-50 px-2 py-1 border border-slate-200/50 rounded-md">Bucket: public-media</span>
        <span className="bg-slate-50 px-2 py-1 border border-slate-200/50 rounded-md">Bucket: ticket-attachments</span>
      </div>
    </div>
  );
}
