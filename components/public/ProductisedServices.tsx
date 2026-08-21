import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Cloud, Headphones, ShieldCheck, Wrench } from "lucide-react";
import { productisedServicePlans, type ServiceProduct } from "@/lib/cyvrix-data";

const specialistRoutes = [
  {
    title: "Cloud and cybersecurity",
    description: "Assessment, hardening, migration and resilience work for organisations with a defined priority.",
    href: "/book-consultation?service=Cloud%20%26%20Cybersecurity",
    cta: "Discuss cloud or security",
    icon: ShieldCheck,
  },
  {
    title: "Field engineering",
    description: "Experienced onsite delivery for deployments, refreshes, surveys, smart hands and multi-site work.",
    href: "/book-consultation?service=Field%20Engineering",
    cta: "Request field delivery",
    icon: Wrench,
  },
  {
    title: "Professional services",
    description: "Migration, network, infrastructure and consultancy projects delivered with clear scope and control.",
    href: "/book-consultation?service=Professional%20Services",
    cta: "Discuss a project",
    icon: BriefcaseBusiness,
  },
];

function getPriceDisplay(plan: ServiceProduct) {
  if (plan.priceDisplayMode === "HIDDEN") return null;
  if (plan.priceDisplayMode === "REQUEST_PRICING" || !plan.pricingVisible) {
    return {
      title: "Request pricing",
      description: "We confirm the right commercial model after discovery rather than publishing a price that may not reflect the required scope.",
    };
  }

  const amount = plan.monthlyPrice ?? plan.annualPrice;
  if (!amount) {
    return {
      title: "Request pricing",
      description: "We confirm the right commercial model after discovery rather than publishing a price that may not reflect the required scope.",
    };
  }

  const cadence = plan.monthlyPrice ? "per month" : "per year";
  const formattedAmount = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(Number(amount));
  return {
    title: plan.priceDisplayMode === "FROM" ? `From ${formattedAmount} ${cadence}` : `${formattedAmount} ${cadence}`,
    description: "Public pricing is subject to the scope, service terms and information approved for this plan.",
  };
}

export function ProductisedServices({ plans = productisedServicePlans }: { plans?: ServiceProduct[] }) {
  return (
    <div className="overflow-hidden bg-[#020817] text-white">
      <section className="relative isolate border-b border-white/10 bg-[#041635]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(38,145,240,0.22),transparent_38%),radial-gradient(circle_at_82%_72%,rgba(6,182,212,0.12),transparent_38%)]" />
        <div className="absolute inset-0 -z-10 bg-corporate-grid opacity-40" />
        <div className="mx-auto max-w-7xl px-5 py-24 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-200">
              <Headphones className="h-4 w-4" />
              Managed service plans
            </p>
            <h1 className="mt-6 font-outfit text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              Managed IT that fits the way your organisation works.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Start with a support model that suits today, then add the security, cloud, infrastructure and project delivery capacity the work requires.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/book-consultation?service=Managed%20Services" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#2691F0] px-7 font-bold text-white shadow-lg shadow-[#2691F0]/20 transition-colors hover:bg-white hover:text-[#041635]">
                Discuss managed IT <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/assessments/it-health-check" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-white/20 px-7 font-bold text-white transition-colors hover:border-white/50 hover:bg-white/10">
                Start with an IT health check
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 text-slate-900 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1678cc]">Choose a starting point</p>
            <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Straightforward plans. Thoughtful scope.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">Each plan is shaped around your users, sites, technology estate and the responsibilities you want CYVRIX to own. Pricing is confirmed once that scope is understood.</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const price = getPriceDisplay(plan);

              return (
              <article key={plan.name} className={`relative flex min-h-full flex-col rounded-2xl border p-7 shadow-sm ${plan.featured ? "border-[#2691F0] bg-[#041635] text-white shadow-xl shadow-[#2691F0]/15" : "border-slate-200 bg-white"}`}>
                {plan.featured && <span className="absolute right-6 top-6 rounded-full bg-sky-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-200">Most selected</span>}
                <p className={`text-xs font-black uppercase tracking-[0.14em] ${plan.featured ? "text-sky-300" : "text-[#1678cc]"}`}>{plan.cadence}</p>
                <h3 className="mt-4 font-outfit text-2xl font-black">{plan.name}</h3>
                <p className={`mt-4 text-sm leading-6 ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>{plan.summary}</p>
                <p className={`mt-6 border-y py-5 text-sm font-semibold leading-6 ${plan.featured ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-700"}`}>{plan.recommendedCustomerSize}</p>
                <h4 className={`mt-6 text-xs font-black uppercase tracking-[0.14em] ${plan.featured ? "text-sky-300" : "text-[#1678cc]"}`}>What can be included</h4>
                <ul className="mt-4 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className={`flex gap-3 text-sm leading-6 ${plan.featured ? "text-slate-200" : "text-slate-700"}`}>
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-sky-300" : "text-[#1678cc]"}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                {price && (
                  <div className={`mt-8 rounded-xl p-4 text-sm ${plan.featured ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
                    <strong className={plan.featured ? "text-white" : "text-slate-900"}>{price.title}</strong>
                    <span className="block mt-1">{price.description}</span>
                  </div>
                )}
                <Link href={plan.href} className={`mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition-colors ${plan.featured ? "bg-[#2691F0] text-white hover:bg-white hover:text-[#041635]" : "bg-[#041635] text-white hover:bg-[#2691F0]"}`}>
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#020817] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Beyond managed support</p>
              <h2 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Specialist work with a clear commercial route.</h2>
            </div>
            <Link href="/services" className="inline-flex items-center gap-2 text-sm font-black text-sky-300 hover:text-white">Explore all services <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {specialistRoutes.map((route) => {
              const Icon = route.icon;
              return (
                <article key={route.title} className="group flex min-h-64 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all hover:-translate-y-1 hover:border-sky-300/50 hover:bg-white/[0.06]">
                  <Icon className="h-6 w-6 text-sky-300" />
                  <h3 className="mt-8 font-outfit text-2xl font-black">{route.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{route.description}</p>
                  <Link href={route.href} className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-black text-sky-300 group-hover:text-white">{route.cta} <ArrowRight className="h-4 w-4" /></Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#2691F0] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
          <Cloud className="mx-auto h-8 w-8 text-white/75" />
          <h2 className="mt-5 font-outfit text-4xl font-black tracking-tight sm:text-5xl">Not sure which route fits?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-50">Start with a free IT health check and we will help identify the most useful next conversation.</p>
          <Link href="/assessments/it-health-check" className="mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-white px-7 font-bold text-[#041635] transition-colors hover:bg-[#041635] hover:text-white">
            Choose an IT health check <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
