import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, Hero } from "@/components/site/Sections";
import { faqs } from "@/lib/cyvrix-data";

export const metadata = { title: "FAQ" };

export default function FAQPage() {
  const categories = Array.from(new Set(faqs.map((faq) => faq.category)));
  return (
    <div>
      <Navbar />
      <Hero eyebrow="FAQ" title="Clear answers about CYVRIX support, security, cloud, contracts, and onboarding" subtitle="FAQs are stored as editable CMS content and grouped for buyers, clients, and support users." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:px-8">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="mb-4 font-outfit text-2xl font-black">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {faqs.filter((faq) => faq.category === category).map((faq) => (
                  <details key={faq.question} className="rounded-lg border border-slate-200 p-5 dark:border-white/10">
                    <summary className="cursor-pointer font-bold">{faq.question}</summary>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <CTASection />
      <Footer />
    </div>
  );
}
