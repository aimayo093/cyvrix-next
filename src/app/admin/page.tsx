import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { saveCmsDraft } from "@/lib/actions";
import { adminModules } from "@/lib/cyvrix-data";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Activity, ArrowRight, FileText, Inbox, LayoutDashboard, Search, Settings, Ticket, Users } from "lucide-react";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  const user = await requireAdmin();
  const [leadCount, quoteCount, ticketCount, serviceCount, industryCount, blogCount, pageCount, recentLeads, recentTickets] = await Promise.all([
    prisma.lead.count().catch(() => 0),
    prisma.quoteRequest.count().catch(() => 0),
    prisma.ticket.count().catch(() => 0),
    prisma.service.count().catch(() => 0),
    prisma.industry.count().catch(() => 0),
    prisma.blogPost.count().catch(() => 0),
    prisma.cmsPage.count().catch(() => 0),
    prisma.lead.findMany({ take: 4, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.ticket.findMany({ take: 4, orderBy: { createdAt: "desc" } }).catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[18rem_1fr]">
        <aside className="hidden border-r border-white/10 bg-slate-950 p-5 text-white lg:block">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyvrix-gradient text-sm font-black">CX</div>
            <div>
              <p className="font-outfit text-lg font-black">CYVRIX</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300">Control Panel</p>
            </div>
          </Link>
          <nav className="mt-8 grid gap-1">
            {adminModules.slice(0, 14).map((module) => (
              <Link key={module} href={module === "Dashboard" ? "/admin" : `/admin/${slug(module)}`} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
                {module}
              </Link>
            ))}
          </nav>
        </aside>

        <section>
          <header className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">Admin dashboard</p>
                <h1 className="font-outfit text-3xl font-black">Website CMS and business control panel</h1>
                <p className="mt-1 text-sm text-slate-500">Signed in as {user.email}. Change the seeded password immediately.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="hidden items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 md:flex">
                  <Search className="h-4 w-4" />
                  Search CMS, leads, tickets
                </div>
                <Link href="/" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold">Public site</Link>
                <form action={signOut}><button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white">Sign out</button></form>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total leads", value: leadCount, Icon: Inbox, href: "/admin/leads-crm" },
                { label: "Quote requests", value: quoteCount, Icon: Activity, href: "/admin/quote-requests" },
                { label: "Support tickets", value: ticketCount, Icon: Ticket, href: "/admin/ticket-management" },
                { label: "Website pages", value: pageCount, Icon: FileText, href: "/admin/page-builder" },
                { label: "Blog posts", value: blogCount, Icon: FileText, href: "/admin/blog-and-insights" },
                { label: "Services", value: serviceCount, Icon: LayoutDashboard, href: "/admin/services-cms" },
                { label: "Industries", value: industryCount, Icon: Users, href: "/admin/industries-cms" },
                { label: "Settings", value: "Ready", Icon: Settings, href: "/admin/settings" },
              ].map(({ label, value, Icon, href }) => (
                <Link key={label} href={href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-cyan-600" />
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
                  <p className="mt-1 font-outfit text-3xl font-black">{value}</p>
                </Link>
              ))}
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr_0.8fr]">
              <Panel title="Recent enquiries">
                <div className="grid gap-3">
                  {recentLeads.length ? recentLeads.map((lead) => (
                    <div key={lead.id} className="rounded-md border border-slate-200 p-4">
                      <p className="font-bold">{lead.company || lead.name || lead.email || "Website enquiry"}</p>
                      <p className="text-sm text-slate-500">{lead.source || "website"} · {lead.status}</p>
                    </div>
                  )) : <Empty text="No leads yet. Contact and quote forms will appear here." />}
                </div>
              </Panel>

              <Panel title="Recent tickets">
                <div className="grid gap-3">
                  {recentTickets.length ? recentTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-md border border-slate-200 p-4">
                      <p className="font-bold">{ticket.ticketNumber} · {ticket.subject}</p>
                      <p className="text-sm text-slate-500">{ticket.priority} · {ticket.status}</p>
                    </div>
                  )) : <Empty text="No tickets yet. Public and client support requests will appear here." />}
                </div>
              </Panel>

              <Panel title="Quick CMS action">
                <form action={saveCmsDraft} className="grid gap-3">
                  <input name="module" defaultValue="Homepage CMS" className="rounded-md border border-slate-200 px-4 py-3 text-sm" />
                  <input name="title" placeholder="Content update title" required className="rounded-md border border-slate-200 px-4 py-3 text-sm" />
                  <select name="status" className="rounded-md border border-slate-200 px-4 py-3 text-sm"><option>draft</option><option>published</option></select>
                  <button className="rounded-md bg-cyan-600 px-5 py-3 text-sm font-black text-white">Save and audit</button>
                </form>
              </Panel>
            </section>

            <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-outfit text-2xl font-black">Activity feed</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["CMS draft saved", "Ticket status changed", "Settings updated"].map((item) => (
                  <div key={item} className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">{item}</div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-outfit text-xl font-black">{title}</h2><div className="mt-5">{children}</div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500">{text}</div>;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
