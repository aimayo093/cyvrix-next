import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-white pt-28 text-slate-950 dark:bg-slate-950 dark:text-white">{children}</main>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-cyan-500">{children}</p>;
}

export function SectionHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-outfit text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
      {intro ? <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-400">{intro}</p> : null}
    </div>
  );
}

export function Hero({ eyebrow, title, subtitle, primary = "Book a Free Consultation", secondary = "Explore Services" }: { eyebrow: string; title: string; subtitle: string; primary?: string; secondary?: string }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 py-20 dark:border-white/10 dark:bg-slate-950">
      <div className="cyber-grid absolute inset-0 opacity-80" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.2),transparent_55%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="max-w-4xl font-outfit text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">{subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/request-quote" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:bg-cyan-300">
              {primary}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/services" className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-5 py-3 font-bold transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/15 dark:hover:text-cyan-300">
              {secondary}
            </Link>
            <Link href="/support" className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-5 py-3 font-bold transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/15 dark:hover:text-cyan-300">
              Request IT Support
            </Link>
          </div>
        </div>
        <DashboardVisual />
      </div>
    </section>
  );
}

export function DashboardVisual() {
  const rows = ["Identity posture", "Endpoint health", "Backup coverage", "Ticket SLA"];
  return (
    <div className="relative rounded-lg border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-cyan-950/30">
      <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-cyan-400/30 via-blue-500/20 to-violet-500/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-md border border-white/10 bg-slate-950">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">CYVRIX Command View</p>
            <p className="text-sm text-slate-400">Security, support, and service intelligence</p>
          </div>
          <ShieldCheck className="h-8 w-8 text-cyan-300" />
        </div>
        <div className="grid gap-3 p-4">
          {rows.map((row, index) => (
            <div key={row} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">{row}</span>
                <span className="text-xs font-black text-cyan-300">Live</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-blue-500" style={{ width: `${82 - index * 9}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 border-t border-white/10">
          {["Leads", "Tickets", "Risk"].map((item, index) => (
            <div key={item} className="p-4">
              <p className="text-xs text-slate-500">{item}</p>
              <p className="font-outfit text-2xl font-black text-white">{["18", "7", "Low"][index]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CTASection({ title = "Ready to build a stronger technology operation?", copy = "Tell CYVRIX what you need to improve. We will help you turn the next step into a practical plan." }: { title?: string; copy?: string }) {
  return (
    <section className="bg-slate-950 py-16 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Next step</p>
          <h2 className="mt-3 max-w-3xl font-outfit text-3xl font-black md:text-5xl">{title}</h2>
          <p className="mt-4 max-w-2xl text-slate-300">{copy}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/request-quote" className="rounded-md bg-cyan-400 px-5 py-3 text-center font-black text-slate-950">Book consultation</Link>
          <Link href="/support" className="rounded-md border border-white/15 px-5 py-3 text-center font-bold">Request support</Link>
        </div>
      </div>
    </section>
  );
}
