import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { portalModules } from "@/lib/cyvrix-data";

export function generateStaticParams() {
  return portalModules.map((module) => ({ module: slug(module) }));
}

export default async function PortalModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  await requireUser();
  const moduleName = portalModules.find((item) => slug(item) === module) ?? "Portal Module";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950 dark:bg-slate-950 dark:text-white lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/portal" className="text-sm font-bold text-cyan-600 dark:text-cyan-300">Back to portal</Link>
        <h1 className="mt-4 font-outfit text-4xl font-black">{moduleName}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-400">This client-facing module is protected by authentication and maps to Prisma-backed PostgreSQL tables for tickets, proposals, active services, knowledge articles, documents, and notifications.</p>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {["Current", "Needs attention", "Archived"].map((status) => <div key={status} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"><p className="font-bold">{moduleName}</p><p className="mt-2 text-sm text-slate-500">{status}</p></div>)}
        </section>
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 className="font-outfit text-2xl font-black">Client workflow</h2>
          <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">Clients can view history, submit updates, upload files, request service changes, and track admin-managed visibility for tickets, quotes, documents, notifications, and active services.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {["Create or reply", "Upload attachment", "Track status", "Request change"].map((item) => <div key={item} className="rounded-md bg-slate-50 p-4 text-sm font-bold dark:bg-white/[0.04]">{item}</div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
