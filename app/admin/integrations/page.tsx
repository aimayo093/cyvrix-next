import * as React from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateIntegrations } from "@/lib/admin-actions";
import { INTEGRATIONS, readStoredIntegrations, type IntegrationCategory } from "@/lib/integrations";

export const metadata: Metadata = { title: "Integrations" };

type IntegrationsPageProps = { searchParams: Promise<{ status?: string; message?: string }> };

const GROUPS: { category: IntegrationCategory; title: string; description: string }[] = [
  {
    category: "verification",
    title: "Search engine verification",
    description:
      "Adds a verification tag to every page so a search engine will show you reports for this domain. No script, no cookies, and no consent needed.",
  },
  {
    category: "analytics",
    title: "Analytics",
    description:
      "Loads on public pages only, and only after a visitor allows Analytics in the cookie banner. Every service switched on here is listed on the Cookie Policy automatically.",
  },
];

export default function IntegrationsPage(props: IntegrationsPageProps) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <IntegrationsContent {...props} />
    </React.Suspense>
  );
}

async function IntegrationsContent({ searchParams }: IntegrationsPageProps) {
  await connection();
  const administrator = await requireAdmin();
  // Enabling a service puts another company's script on every public page, a
  // decision about what runs in visitors' browsers rather than a content edit.
  if (administrator.role !== "SUPER_ADMIN") redirect("/admin");

  const sp = await searchParams;
  // Read directly rather than through the public cache, so this page shows what
  // is stored even in the moment before the cache has been refreshed.
  const row = await prisma.siteSetting.findUnique({ where: { key: "integrations" } });
  const stored = readStoredIntegrations(row?.value);

  return (
    <div className="max-w-4xl space-y-8 pb-16">
      <div>
        <h1 className="font-outfit text-3xl font-black text-balance text-[#041635]">Integrations</h1>
        <p className="mt-1 max-w-2xl font-medium leading-relaxed text-slate-500">
          Connect approved services by entering the ID each one gives you. There is no box for custom
          code: a pasted script would run in every visitor&apos;s browser, and the site&apos;s security
          policy would block it anyway.
        </p>
      </div>

      {sp.status && sp.message && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            sp.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {sp.status === "success" ? (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          )}
          <p className="text-sm font-semibold leading-relaxed">{sp.message}</p>
        </div>
      )}

      <form action={updateIntegrations} className="space-y-8">
        {GROUPS.map((group) => (
          <section
            key={group.category}
            aria-labelledby={`group-${group.category}`}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <h2
                id={`group-${group.category}`}
                className="font-outfit text-xl font-black text-balance text-[#041635]"
              >
                {group.title}
              </h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">{group.description}</p>
            </div>

            <div className="divide-y divide-slate-100">
              {INTEGRATIONS.filter((integration) => integration.category === group.category).map(
                (integration) => {
                  const current = stored[integration.id];
                  const toggleId = `${integration.id}-enabled`;
                  const inputId = `${integration.id}-value`;
                  const hintId = `${integration.id}-hint`;

                  return (
                    <div
                      key={integration.id}
                      className="grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <input
                            id={toggleId}
                            name={`${integration.id}.enabled`}
                            type="checkbox"
                            defaultChecked={current.enabled}
                            className="h-5 w-5 shrink-0 accent-[#2691F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2"
                          />
                          <label htmlFor={toggleId} className="font-outfit text-base font-black text-[#041635]">
                            {integration.name}
                          </label>
                        </div>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                          {integration.purpose}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {integration.cookies.length > 0
                            ? `Sets cookies: ${integration.cookies.join(", ")}`
                            : integration.category === "analytics"
                              ? "Sets no cookies"
                              : "No script and no cookies"}
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor={inputId}
                          className="text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {integration.fieldLabel}
                        </label>
                        <input
                          id={inputId}
                          name={`${integration.id}.value`}
                          defaultValue={current.value}
                          placeholder={integration.example}
                          autoComplete="off"
                          spellCheck={false}
                          aria-describedby={hintId}
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
                        />
                        <p id={hintId} className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                          {integration.formatHint} {integration.whereToFind}
                        </p>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </section>
        ))}

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-slate-600">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#2691F0]" />
            Each ID is checked against its service&apos;s format when saved, and again before it reaches a page.
          </p>
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-xl bg-[#2691F0] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-[#1678CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2"
          >
            Save integrations
          </button>
        </div>
      </form>
    </div>
  );
}
