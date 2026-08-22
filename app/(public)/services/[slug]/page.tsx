import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  ShieldCheck,
  Target,
} from "lucide-react";
import { findService as findStaticService, services as staticServices } from "@/lib/cyvrix-data";
import { getPublicServiceDetail, getSiteImages, type SiteImages } from "@/lib/public-cache";
import { getServiceJourney } from "@/lib/service-journeys";
import { PageHeroImage } from "@/components/public/PageHeroImage";
import { getServiceDetailContent } from "@/lib/service-detail-content";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

type ServiceContent = {
  includes: string[];
  features: string[];
  process: string[];
  faqs: { question: string; answer: string }[];
  body: string;
};

export async function generateMetadata({ params }: ServicePageProps) {
  const { slug } = await params;
  const { service: dbService } = await getPublicServiceDetail(slug);
  const service = dbService ?? findStaticService(slug);

  return {
    title: service ? service.title : "Service not found",
    description: service?.summary ?? "Explore CYVRIX technology services.",
  };
}

export function generateStaticParams() {
  return staticServices.map((service) => ({ slug: service.slug }));
}

export default function ServiceDetailPage(props: ServicePageProps) {
  return (
    <React.Suspense fallback={<ServiceDetailFallback />}>
      <ServiceDetailContent {...props} />
    </React.Suspense>
  );
}

async function ServiceDetailContent({ params }: ServicePageProps) {
  const { slug } = await params;
  const [{ service: dbService, related: dbRelated }, siteImages] = await Promise.all([
    getPublicServiceDetail(slug),
    getSiteImages().catch((): SiteImages => ({ engines: {}, industries: {} })),
  ]);
  const staticService = findStaticService(slug);
  const service = dbService ?? staticService;

  if (!service) {
    notFound();
  }

  const content = readServiceContent(dbService?.content, staticService);
  const journey = getServiceJourney(service.slug);
  const detail = getServiceDetailContent(service.slug, siteImages.services?.[service.slug]);
  const related = dbRelated.length > 0
    ? dbRelated
    : staticServices.filter((candidate) => candidate.slug !== service.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#041635] pb-20 pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(38,145,240,0.24),transparent_34%)]" />
        <div className="absolute inset-0 bg-corporate-grid opacity-40" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <Link href="/services" className="inline-flex items-center gap-2 text-sm font-bold text-sky-300 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            All services
          </Link>
          <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">{journey.category}</p>
              <h1 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">{service.title}</h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">{service.summary}</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href={journey.primaryHref} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#2691F0] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635]">
                  {journey.primaryLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={journey.secondaryHref} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-black text-white transition-colors hover:border-sky-300/60 hover:bg-white/10">
                  {journey.secondaryLabel}
                </Link>
              </div>
            </div>
            <PageHeroImage src={detail.image} alt={detail.imageAlt} priority />
          </div>
        </div>
      </section>

      {/* Why this service exists, in plain terms. */}
      <section className="border-b border-white/10 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">What this is for</p>
            <h2 className="mt-4 font-outfit text-3xl font-black tracking-tight sm:text-4xl">
              The problem behind the requirement.
            </h2>
            <div className="mt-7 space-y-5">
              {detail.overview.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 lg:mt-16">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">This is the right conversation when</p>
            <ul className="mt-6 space-y-4">
              {detail.rightWhen.map((signal) => (
                <li key={signal} className="flex gap-3 text-sm leading-6 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                  {signal}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">
        <InsightPanel icon={ClipboardCheck} title="What the work can include">
          <BulletList items={content.includes} emptyMessage="The scope is agreed around your current estate, users and project objectives." />
        </InsightPanel>
        <InsightPanel icon={Target} title="Where it is most useful">
          <p className="text-sm leading-7 text-slate-300">{staticService?.audience ?? "Organisations that need a clear, proportionate route through a technology change or operational priority."}</p>
        </InsightPanel>
        <InsightPanel icon={Compass} title="Questions it can address">
          <BulletList items={staticService?.problems ?? []} emptyMessage="We use discovery to understand the operational context and the priority to address first." />
        </InsightPanel>
      </section>

      <section className="border-y border-white/10 bg-[#041635] py-20">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <DetailList eyebrow="Capabilities" heading="Practical detail, shaped around the scope." items={content.features} emptyMessage="The appropriate technical activities are confirmed once the estate, dependencies and delivery constraints are understood." />
          <DetailList eyebrow="Delivery approach" heading="A clear route from discovery to next steps." items={content.process} emptyMessage="We begin with discovery, agree the priority and then define the most suitable delivery approach." numbered />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="rounded-3xl border border-sky-300/20 bg-sky-300/10 p-8 sm:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Security and governance</p>
            <h2 className="mt-4 font-outfit text-3xl font-black">Consider risk early, then agree the right controls.</h2>
            <p className="mt-5 text-base leading-7 text-slate-300">{staticService?.compliance ?? "Security, resilience, access control and data handling should be considered in the scope before production work begins."}</p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-sky-100"><ShieldCheck className="h-4 w-4 text-sky-300" /> Any formal certification, legal advice or independent testing is agreed separately where required.</p>
          </div>
        </div>
      </section>

      {(content.body || content.faqs.length > 0) && (
        <section className="border-y border-white/10 bg-white/[0.02] py-20">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Service context</p>
              <h2 className="mt-4 font-outfit text-3xl font-black">What happens next</h2>
              <p className="mt-5 text-base leading-7 text-slate-300">{content.body || "Tell us what needs attention. We will use the initial context to identify whether this service, a focused assessment or a scoped project is the right next step."}</p>
            </div>
            {content.faqs.length > 0 && (
              <div className="space-y-3">
                {content.faqs.map((faq) => (
                  <details key={faq.question} className="group rounded-2xl border border-white/10 bg-[#020817] p-5">
                    <summary className="cursor-pointer list-none pr-8 text-sm font-black text-white">{faq.question}</summary>
                    <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-slate-400">{faq.answer}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Related capabilities</p>
          <h2 className="mt-4 font-outfit text-3xl font-black">Often considered alongside this service.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <Link key={item.slug} href={`/services/${item.slug}`} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-sky-300/50 hover:bg-white/[0.06]">
                <span className="font-outfit text-xl font-black">{item.title}</span>
                <ArrowRight className="h-4 w-4 text-sky-300 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function readServiceContent(value: unknown, fallback: ReturnType<typeof findStaticService>): ServiceContent {
  const content = isRecord(value) ? value : {};
  return {
    includes: readStringList(content.includes, fallback?.includes ?? []),
    features: readStringList(content.features, fallback?.features ?? []),
    process: readStringList(content.process, fallback?.process ?? []),
    faqs: readFaqs(content.faqs, fallback?.faqs ?? []),
    body: readText(content.body),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string").map(readText).filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function readFaqs(value: unknown, fallback: { question: string; answer: string }[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const question = readText(item.question);
    const answer = readText(item.answer);
    return question && answer ? [{ question, answer }] : [];
  });
  return items.length > 0 ? items : fallback;
}

function readText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function ServiceDetailFallback() {
  return <div className="min-h-screen bg-[#020817]" />;
}

function InsightPanel({ icon: Icon, title, children }: { icon: typeof ClipboardCheck; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <Icon className="h-5 w-5 text-sky-300" />
      <h2 className="mt-6 font-outfit text-xl font-black">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function DetailList({ eyebrow, heading, items, emptyMessage, numbered = false }: { eyebrow: string; heading: string; items: string[]; emptyMessage: string; numbered?: boolean }) {
  const displayItems = items.length > 0 ? items : [emptyMessage];
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">{eyebrow}</p>
      <h2 className="mt-4 font-outfit text-3xl font-black">{heading}</h2>
      <ol className="mt-8 space-y-3">
        {displayItems.map((item, index) => (
          <li key={item} className="flex gap-4 rounded-xl border border-white/10 bg-[#020817] p-4 text-sm leading-6 text-slate-300">
            {numbered ? <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2691F0] text-xs font-black text-white">{index + 1}</span> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />}
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function BulletList({ items, emptyMessage }: { items: string[]; emptyMessage: string }) {
  const displayItems = items.length > 0 ? items : [emptyMessage];
  return (
    <ul className="space-y-3">
      {displayItems.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />{item}</li>
      ))}
    </ul>
  );
}
