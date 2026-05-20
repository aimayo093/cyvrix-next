import Link from "next/link";
import Image from "next/image";
import { subscribeNewsletter } from "@/lib/actions";
import { industries, legalPages, services, siteSettings } from "@/lib/cyvrix-data";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]">
          <div>
            <Link href="/" className="mb-5 inline-flex" aria-label="CYVRIX Technologies home">
              <Image
                src="/brand/cyvrix-logo-black.png"
                alt="CYVRIX Technologies"
                width={221}
                height={80}
                className="h-14 w-auto dark:invert"
              />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
              Premium managed IT support, cybersecurity, cloud, infrastructure, and digital transformation consultancy for ambitious UK businesses.
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{siteSettings.coverage}</p>
          </div>

          <FooterColumn title="Services" links={services.slice(0, 6).map((service) => ({ label: service.title, href: `/services/${service.slug}` }))} />
          <FooterColumn title="Industries" links={industries.slice(0, 6).map((industry) => ({ label: industry.title, href: `/industries/${industry.slug}` }))} />
          <FooterColumn title="Support" links={[
            { label: "Request IT Support", href: "/support" },
            { label: "Request Quote", href: "/request-quote" },
            { label: "FAQ", href: "/faq" },
            { label: "Careers", href: "/careers" },
            { label: "Client Login", href: "/login" },
          ]} />

          <div>
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white">Newsletter</h3>
            <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-400">Security, cloud, and managed IT guidance for UK operators. No filler.</p>
            <form action={subscribeNewsletter} className="space-y-3">
              <input name="email" type="email" required placeholder="work email" className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/5" />
              <input type="hidden" name="source" value="footer" />
              <label className="flex items-start gap-2 text-xs text-slate-500">
                <input name="consent" type="checkbox" required className="mt-1" />
                I consent to receive CYVRIX updates and understand I can unsubscribe.
              </label>
              <button className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-slate-200 pt-8 text-xs text-slate-500 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <p>Copyright 2026 CYVRIX Technologies. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            {legalPages.slice(0, 4).map((page) => (
              <Link key={page.slug} href={`/legal/${page.slug}`} className="hover:text-cyan-500">{page.title}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white">{title}</h3>
      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition hover:text-cyan-500">{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
