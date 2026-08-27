import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Cloud, ShieldCheck } from "lucide-react";
import { resolveEngines, type EngineImageOverrides } from "@/lib/service-engines";

type Service = {
  slug: string;
  summary?: string | null;
  title: string;
};

const DEFAULT_HERO_IMAGE =
  "/uploads/1780490490158-59620428-christina-wocintechchat-com-m-bPVM4nOy0Rg-unsplash.jpg";

/**
 * Hero content an administrator can change in Home Page CMS.
 *
 * Every field falls back to the reviewed wording, so an empty CMS renders the
 * page as written rather than an empty hero. Home Page CMS previously wrote
 * these into page sections that this component never read, so editing them
 * changed nothing.
 */
export type HomeHeroContent = {
  eyebrow?: string;
  title?: string;
  body?: string;
  primaryLabel?: string;
  primaryUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
};

type PremiumHomeProps = {
  services: Service[];
  engineImages?: EngineImageOverrides;
  /** Replaceable from the CMS via the `site_images` setting. */
  heroImage?: string;
  hero?: HomeHeroContent;
};

/** The reviewed hero, used wherever the CMS leaves a field empty. */
const DEFAULT_HERO = {
  eyebrow: "Technology partnership for growing UK organisations",
  title: "Technology that runs quietly. Security that stands up.",
  body: "CYVRIX manages, secures and modernises the technology behind ambitious organisations — with ongoing support, expert projects and practical field delivery.",
  primaryLabel: "Choose an assessment",
  primaryUrl: "/assessments",
  secondaryLabel: "Explore services",
  secondaryUrl: "/services",
} as const;

const deliverySteps = [
  "Discover the business context and current estate.",
  "Assess the practical risks, opportunities and priorities.",
  "Design a proportionate plan with clear ownership.",
  "Implement with careful communication and control.",
  "Support, review and improve as the business changes.",
];

const commercialOffers = [
  { title: "Free IT Health Check", href: "/assessments/it-health-check" },
  { title: "Microsoft 365 Security Assessment", href: "/assessments/microsoft-365-security" },
  { title: "Cybersecurity Assessment", href: "/assessments/cybersecurity-assessment" },
  { title: "Cloud Readiness Assessment", href: "/assessments/cloud-readiness" },
  { title: "Network Assessment", href: "/assessments/network-assessment" },
];

export function PremiumHome({
  services,
  engineImages = {},
  heroImage = DEFAULT_HERO_IMAGE,
  hero,
}: PremiumHomeProps) {
  const engines = resolveEngines(services, engineImages);

  // A blank CMS field means "unset", not "render nothing".
  const pick = (value: string | undefined, fallback: string) => (value?.trim() ? value.trim() : fallback);
  const heroContent = {
    eyebrow: pick(hero?.eyebrow, DEFAULT_HERO.eyebrow),
    title: pick(hero?.title, DEFAULT_HERO.title),
    body: pick(hero?.body, DEFAULT_HERO.body),
    primaryLabel: pick(hero?.primaryLabel, DEFAULT_HERO.primaryLabel),
    primaryUrl: pick(hero?.primaryUrl, DEFAULT_HERO.primaryUrl),
    secondaryLabel: pick(hero?.secondaryLabel, DEFAULT_HERO.secondaryLabel),
    secondaryUrl: pick(hero?.secondaryUrl, DEFAULT_HERO.secondaryUrl),
  };

  return (
    <div className="overflow-hidden bg-[#020817] text-white">
      <section className="relative isolate border-b border-white/10 bg-[#041635]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(38,145,240,0.22),transparent_38%),radial-gradient(circle_at_80%_72%,rgba(6,182,212,0.12),transparent_38%)]" />
        <div className="absolute inset-0 -z-10 bg-corporate-grid opacity-40" />
        <div className="mx-auto max-w-7xl px-5 py-20 sm:py-24 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                {heroContent.eyebrow}
              </p>
              <h1 className="font-outfit text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl">
                {heroContent.title}
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
                {heroContent.body}
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={heroContent.primaryUrl}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#2691F0] px-7 font-bold text-white shadow-lg shadow-[#2691F0]/20 transition-colors hover:bg-white hover:text-[#041635]"
                >
                  {heroContent.primaryLabel} <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href={heroContent.secondaryUrl}
                  className="inline-flex min-h-14 items-center justify-center rounded-md border border-white/20 px-7 font-bold text-white transition-colors hover:border-white/50 hover:bg-white/10"
                >
                  {heroContent.secondaryLabel}
                </Link>
              </div>
            </div>

            <div className="relative">
              {/* Soft brand glow behind the image, kept subtle so the photo stays the focus. */}
              <div
                aria-hidden="true"
                className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_70%_30%,rgba(38,145,240,0.35),transparent_65%)] blur-2xl"
              />
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/50">
                <Image
                  src={heroImage}
                  alt="Two CYVRIX specialists reviewing technical work together on a laptop"
                  fill
                  priority
                  sizes="(min-width: 1280px) 620px, (min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#041635]/55 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#020817]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8">
          {[
            "UK-based technology delivery",
            "Security-first by design",
            "Clear commercial ownership",
          ].map((point) => (
            <p key={point} className="py-5 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              {point}
            </p>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20 text-slate-900 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1678cc]">What we do</p>
            <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">One accountable partner. Four ways to work with us.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Every engagement sits in one of four models, so you know from the outset how the work is scoped, delivered and bought.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {engines.map((engine) => {
              const Icon = engine.icon;
              return (
                <article key={engine.title} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl">
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <Image
                      src={engine.image}
                      alt={engine.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 620px, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#041635]/70 via-[#041635]/10 to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#1678cc]">
                      {engine.engagement}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-7">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2691F0]/10 text-[#1678cc]">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 font-outfit text-2xl font-black">{engine.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{engine.description}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{engine.detail}</p>

                  <ul className="mt-5 space-y-2">
                    {engine.outcomes.slice(0, 4).map((outcome) => (
                      <li key={outcome} className="flex gap-2.5 text-sm leading-6 text-slate-600">
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#1678cc]" />
                        {outcome}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 font-semibold text-slate-600">
                    <span className="text-slate-400">Typically suits: </span>
                    {engine.suitedTo}
                  </p>

                  {engine.includes.length > 0 && (
                  <ul className="mt-6 flex flex-col gap-px border-t border-slate-100 pt-1">
                    {engine.includes.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/services/${item.slug}`}
                          className="group/item flex items-center justify-between gap-3 rounded-lg py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:text-[#1678cc]"
                        >
                          {item.title}
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-all group-hover/item:translate-x-0.5 group-hover/item:text-[#1678cc]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-7">
                    <Link
                      href={engine.href}
                      className="inline-flex items-center gap-2 text-sm font-black text-[#1678cc] transition-colors hover:text-[#041635]"
                    >
                      {engine.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                    {engine.secondaryHref && engine.secondaryLabel && (
                      <Link
                        href={engine.secondaryHref}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-[#1678cc]"
                      >
                        {engine.secondaryLabel}
                      </Link>
                    )}
                  </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-20 text-slate-900 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1678cc]">Focused starting points</p>
              <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Choose an assessment that fits the work ahead.</h2>
            </div>
            <Link href="/assessments" className="inline-flex items-center gap-2 text-sm font-black text-[#1678cc] hover:text-[#041635]">
              View all assessments <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {commercialOffers.map((offer) => (
              <Link key={offer.title} href={offer.href} className="group flex min-h-40 flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-sm font-black shadow-sm transition-all hover:-translate-y-1 hover:border-[#2691F0]/50 hover:shadow-lg">
                <span>{offer.title}</span>
                <ArrowRight className="h-4 w-4 text-[#1678cc] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#020817] py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">A sensible delivery model</p>
            <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Calm, clear delivery from first conversation to ongoing improvement.</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
              The best technology work is measured by the confidence it gives your people — not by a wall of jargon or a dashboard of unsupported numbers.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {deliverySteps.map((step, index) => (
              <li key={step} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <span className="text-xs font-black tracking-[0.16em] text-sky-300">0{index + 1}</span>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>


      <section className="bg-[#2691F0] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
          <Cloud className="mx-auto h-8 w-8 text-white/75" />
          <h2 className="mt-5 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Start with the right conversation.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-50">
            Tell us what needs attention. We will help you identify the most useful next step.
          </p>
          <Link href="/assessments" className="mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-white px-7 font-bold text-[#041635] transition-colors hover:bg-[#041635] hover:text-white">
            Choose an assessment <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
