import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublicServicesData } from "@/lib/public-cache";
import { services as staticServices } from "@/lib/cyvrix-data";
import { findUnmappedServices, resolveEngines } from "@/lib/service-engines";

export const metadata: Metadata = {
  title: "Technology Services",
  description:
    "Managed services, cloud and cybersecurity, field engineering and professional technology projects for growing UK organisations.",
};

export default async function ServicesPage() {
  const dbServices = await getPublicServicesData();
  const services = dbServices.length > 0 ? dbServices : staticServices;

  const engines = resolveEngines(services);
  // Anything the CMS adds that no engine claims still gets a home on the page.
  const additional = findUnmappedServices(services);

  return (
    <div className="min-h-screen bg-[#020817] pb-28 text-white">
      <section className="border-b border-white/10 bg-[#041635] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">CYVRIX services</p>
              <h1 className="mt-4 font-outfit text-5xl font-black tracking-tight sm:text-6xl">
                Technology services built around how you need to buy.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Every engagement sits in one of four models. Choose an ongoing technology partner, specialist cloud and
                security support, skilled field delivery or a well-governed project team.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-sky-300 transition-colors hover:text-white"
            >
              View managed IT plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {engines.map((engine, index) => {
        const Icon = engine.icon;
        return (
          <section
            key={engine.title}
            className={index > 0 ? "border-t border-white/10 py-16 sm:py-20" : "py-16 sm:py-20"}
          >
            <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sky-300">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-7 text-xs font-black uppercase tracking-[0.14em] text-sky-300">{engine.engagement}</p>
                <h2 className="mt-3 font-outfit text-3xl font-black tracking-tight sm:text-4xl">{engine.title}</h2>
                <p className="mt-4 max-w-md text-base leading-7 text-slate-400">{engine.description}</p>
                <Link
                  href={engine.href}
                  className="mt-7 inline-flex items-center gap-2 text-sm font-black text-sky-300 transition-colors hover:text-white"
                >
                  {engine.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {engine.includes.length > 0 && (
                <div className="grid gap-x-8 sm:grid-cols-2">
                  {engine.includes.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/services/${item.slug}`}
                      className="group border-t border-white/10 py-6 transition-colors hover:border-sky-300/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-outfit text-lg font-black text-white group-hover:text-sky-300">
                            {item.title}
                          </h3>
                          {item.summary && (
                            <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
                          )}
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-sky-300 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {additional.length > 0 && (
        <section className="border-t border-white/10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Additional capabilities</p>
            <h2 className="mt-3 font-outfit text-3xl font-black tracking-tight sm:text-4xl">Further specialist services.</h2>
            <div className="mt-10 grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
              {additional.map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group border-t border-white/10 py-6 transition-colors hover:border-sky-300/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-outfit text-lg font-black text-white group-hover:text-sky-300">
                        {service.title}
                      </h3>
                      {service.summary && <p className="mt-2 text-sm leading-6 text-slate-400">{service.summary}</p>}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-sky-300 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {engines.every((engine) => engine.includes.length === 0) && additional.length === 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-slate-400">
              Contact us to discuss the right support model, delivery team or project scope for your organisation.
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
