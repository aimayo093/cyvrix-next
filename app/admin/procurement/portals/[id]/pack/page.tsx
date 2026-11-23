import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { card, pill, when } from "@/components/admin/procurement/ui";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrationPack } from "@/lib/procurement/partnerships";
import { procurementEnabled } from "@/lib/procurement/switch";

export const metadata = { title: "Registration pack" };

type Props = { params: Promise<{ id: string }> };

/**
 * Everything a portal's registration form asks for, in one place: verified
 * company facts to copy across and the current evidence documents to upload.
 * The founder registers by hand (D8); nothing here is sent anywhere.
 * Founder only, because company facts include details kept off the website.
 */
export default function RegistrationPackPage(props: Props) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <PackContent {...props} />
    </React.Suspense>
  );
}

const STATE_LABEL = {
  ready: ["ready", "bg-emerald-50 text-emerald-700"],
  unverified: ["not verified yet", "bg-amber-50 text-amber-800"],
  missing: ["missing", "bg-rose-50 text-rose-700"],
  answer_yourself: ["answer from the certificate", "bg-slate-100 text-slate-700"],
} as const;

async function PackContent({ params }: Props) {
  await connection();
  if (!procurementEnabled()) notFound();
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const portal = await prisma.supplierPortal.findUnique({ where: { id }, include: { Organisation: { select: { name: true } } } });
  if (!portal) notFound();
  const now = new Date();
  const [facts, docs] = await Promise.all([
    prisma.companyFact.findMany({ where: { key: { in: portal.requiredFacts } }, select: { key: true, label: true, value: true, verifiedAt: true } }),
    prisma.companyDocument.findMany({
      select: { id: true, kind: true, title: true, Version: { select: { id: true, filename: true, status: true, expiresAt: true, version: true } } },
    }),
  ]);
  const documents = docs.flatMap((d) =>
    d.Version.map((v) => ({ documentId: d.id, kind: d.kind, title: d.title, versionId: v.id, filename: v.filename, status: v.status, expiresAt: v.expiresAt, version: v.version }))
  );
  const pack = registrationPack({ requiredFacts: portal.requiredFacts, requiredDocuments: portal.requiredDocuments, facts, documents, now });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Link href="/admin/procurement?tab=accounts" className="text-sm font-semibold text-[#0f5aab] hover:underline">← Accounts</Link>
      <header className="space-y-2">
        <h1 className="font-outfit text-2xl font-black text-[#041635]">Registration pack: {portal.name}</h1>
        <p className="text-sm text-slate-600">
          {portal.Organisation ? `${portal.Organisation.name} · ` : ""}
          <a href={portal.url} target="_blank" rel="noreferrer noopener" className="text-[#0f5aab] hover:underline">{portal.url}</a>
        </p>
        <p className="max-w-3xl text-sm text-slate-500">
          Copy these into the portal&apos;s form yourself. Only verified facts and current evidence are offered. Questions about
          certifications, accreditations or clearance are left for you to answer from the certificate itself. Any declaration
          the portal asks you to make, or any fee, needs your approval first; record the account afterwards on the Accounts tab.
        </p>
        <span className={`${pill} ${pack.complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          {pack.complete ? "Everything required is recorded and current" : "Not ready yet: something is missing, not verified or out of date"}
        </span>
      </header>

      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold text-[#041635]">Company details</h2>
        {pack.facts.length === 0 ? (
          <p className="text-sm text-slate-600">This portal lists no required details. Add them under “Edit the portal” on the Accounts tab.</p>
        ) : (
          <dl className="divide-y divide-slate-100 text-sm">
            {pack.facts.map((f) => (
              <div key={f.key} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <dt className="font-semibold text-slate-700">{f.label}</dt>
                <dd className="flex items-center gap-2">
                  {f.value && <span className="select-all font-mono text-slate-900">{f.value}</span>}
                  <span className={`${pill} ${STATE_LABEL[f.state][1]}`}>{STATE_LABEL[f.state][0]}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold text-[#041635]">Documents to upload</h2>
        {pack.documents.length === 0 ? (
          <p className="text-sm text-slate-600">This portal lists no required documents.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {pack.documents.map((d) => (
              <li key={d.kind} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold text-slate-700">{d.kind.replace(/_/g, " ")}</span>
                  {d.versionId && (
                    <span className="block text-xs text-slate-500">
                      {d.title} · {d.filename}{d.expiresAt ? ` · valid until ${when(d.expiresAt)}` : ""}
                    </span>
                  )}
                </span>
                {d.versionId ? (
                  <a href={`/api/admin/procurement/documents/${d.versionId}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#0f5aab] hover:underline">Open</a>
                ) : (
                  <span className={`${pill} ${STATE_LABEL.missing[1]}`}>missing: upload it on the Documents tab</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
