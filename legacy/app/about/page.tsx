import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, FeatureList, PageShell, SectionHeader } from "@/components/site/Sections";

export const metadata = { title: "About CYVRIX Technologies" };

export default function AboutPage() {
  return (
    <div>
      <Navbar />
      <PageShell>
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">About CYVRIX Technologies</p>
          <h1 className="mt-4 max-w-4xl font-outfit text-4xl font-black tracking-tight md:text-6xl">A premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-400">CYVRIX Technologies helps UK businesses modernise infrastructure, improve security, support users, and make better technology decisions. The company is built around practical engineering, clear communication, and service discipline.</p>
        </section>

        <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 lg:grid-cols-3 lg:px-8">
            {[
              ["Mission", "Reduce IT risk and operational friction for growing UK organisations through dependable support, secure systems, and commercially grounded consultancy."],
              ["Vision", "To become a trusted technology partner for ambitious businesses that want enterprise-grade IT maturity without losing agility."],
              ["Values", "Clarity, security, ownership, responsiveness, and practical improvement. CYVRIX avoids jargon and focuses on outcomes."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-950">
                <h2 className="font-outfit text-2xl font-black">{title}</h2>
                <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeader eyebrow="Why businesses choose us" title="Senior thinking without unnecessary complexity" intro="CYVRIX is designed for leaders who want a partner that can operate support, advise on risk, and deliver transformation work." />
          </div>
          <FeatureList items={["UK-focused support and consultancy model", "Security and compliance considered across every service", "Admin-editable leadership, partner, certification, and proof sections", "Clear service desk, CRM, proposal, and client portal workflows", "Technical expertise across cloud, endpoint, networking, backup, and digital systems"]} />
        </section>

        <section className="bg-white py-16 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHeader eyebrow="Leadership and credentials" title="Editable company profile, leadership, certifications, and partner badges" intro="The admin CMS includes dedicated areas for founder profiles, partner logos, certification badges, testimonials, stats, and page-level SEO." />
          </div>
        </section>

        <CTASection title="Talk to CYVRIX about your technology roadmap" />
      </PageShell>
      <Footer />
    </div>
  );
}
