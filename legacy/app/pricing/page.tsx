import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, FeatureList, Hero } from "@/components/site/Sections";
import { pricingPackages } from "@/lib/cyvrix-data";

export const metadata = { title: "Pricing and Engagement Models" };

export default function PricingPage() {
  return (
    <div>
      <Navbar />
      <Hero eyebrow="Pricing and engagement" title="Flexible IT support, cybersecurity, cloud, and consultancy packages" subtitle="CYVRIX does not publish fixed prices unless admin enables them. Packages are scoped around users, sites, risk, urgency, and service outcomes." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {pricingPackages.map((plan) => (
            <div key={plan.name} className={`rounded-lg border p-6 ${plan.visible ? "border-slate-200 dark:border-white/10" : "border-dashed border-slate-300 opacity-80 dark:border-white/20"}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-outfit text-xl font-black">{plan.name}</h2>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{plan.visible ? "Visible" : "Admin hidden"}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-cyan-600 dark:text-cyan-300">{plan.cadence}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{plan.summary}</p>
              <div className="mt-5"><FeatureList items={plan.features} /></div>
              <a href="/request-quote" className="mt-6 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white dark:bg-cyan-400 dark:text-slate-950">{plan.cta}</a>
            </div>
          ))}
        </div>
      </section>
      <CTASection title="Request a custom CYVRIX quote" />
      <Footer />
    </div>
  );
}
