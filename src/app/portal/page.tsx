import Link from "next/link";
import { portalModules } from "@/lib/cyvrix-data";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { Bell, Building2, FileText, LifeBuoy, ShieldCheck, Ticket } from "lucide-react";

export const metadata = { title: "Client Portal" };

export default async function PortalPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950 dark:bg-slate-950 dark:text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">CYVRIX client portal</p>
            <h1 className="mt-2 font-outfit text-4xl font-black">Client dashboard</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Signed in as {user.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/support" className="rounded-md bg-cyan-400 px-4 py-2 font-black text-slate-950">Create ticket</Link>
            <form action={signOut}><button className="rounded-md border border-slate-200 px-4 py-2 font-bold dark:border-white/10">Sign out</button></form>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active services", value: "Managed IT, cloud, security", Icon: ShieldCheck },
            { label: "Open tickets", value: "Track status and replies", Icon: Ticket },
            { label: "Documents", value: "Shared secure files", Icon: FileText },
            { label: "Notifications", value: "Ticket and proposal updates", Icon: Bell },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <Icon className="mb-4 h-6 w-6 text-cyan-500" />
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="font-outfit text-2xl font-black">Portal modules</h2>
            <div className="mt-5 grid gap-2">
              {portalModules.map((module) => <Link key={module} href={`/portal/${slug(module)}`} className="rounded-md border border-slate-200 p-3 text-sm font-bold transition hover:border-cyan-400 dark:border-white/10">{module}</Link>)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <LifeBuoy className="mb-4 h-8 w-8 text-cyan-500" />
            <h2 className="font-outfit text-2xl font-black">Security recommendations</h2>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              <li>Review MFA coverage for all privileged accounts.</li>
              <li>Confirm backup restore tests for business-critical data.</li>
              <li>Keep onboarding and offboarding contacts current.</li>
              <li>Use the support ticket workflow for auditable changes.</li>
            </ul>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <PortalPanel title="Active CYVRIX services" icon={<ShieldCheck className="h-5 w-5 text-cyan-500" />} items={["Managed IT Support", "Microsoft 365 security baseline", "Backup and recovery review"]} />
          <PortalPanel title="Quote and proposal status" icon={<FileText className="h-5 w-5 text-cyan-500" />} items={["Security audit proposal: awaiting review", "Cloud migration scoping: draft", "Support package: active"]} />
          <PortalPanel title="Company profile" icon={<Building2 className="h-5 w-5 text-cyan-500" />} items={["Billing contact placeholder", "Security contact placeholder", "Document visibility managed by admin"]} />
        </section>
      </div>
    </main>
  );
}

function PortalPanel({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="font-outfit text-xl font-black">{title}</h2>
      </div>
      <ul className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-400">
        {items.map((item) => <li key={item} className="rounded-md bg-slate-50 p-3 dark:bg-white/[0.04]">{item}</li>)}
      </ul>
    </div>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
