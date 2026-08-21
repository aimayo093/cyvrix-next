import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type SiteMessageLink = {
  href: string;
  label: string;
  description?: string;
};

type SiteMessageScreenProps = {
  /** Short status label shown above the heading, e.g. "Error 404". */
  eyebrow: string;
  heading: string;
  description: string;
  icon: LucideIcon;
  /** Optional supporting note rendered in a highlighted panel. */
  note?: string;
  /** Suggested onward routes. Rendered as an accessible list of links. */
  links?: SiteMessageLink[];
  /** Optional interactive controls, such as a retry button. */
  children?: React.ReactNode;
};

/**
 * Shared branded shell for 404, 403, 500 and maintenance screens.
 *
 * Root-level error files render outside the public layout, so this component
 * carries its own heading structure and onward navigation. It never exposes
 * internal diagnostics.
 */
export function SiteMessageScreen({
  eyebrow,
  heading,
  description,
  icon: Icon,
  note,
  links,
  children,
}: SiteMessageScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#020817] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center px-5 py-6 lg:px-8">
          <Link
            href="/"
            className="font-outfit text-lg font-black tracking-tight text-white transition-colors hover:text-[#2691F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
          >
            CYVRIX
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center py-20 sm:py-28">
        <div className="mx-auto w-full max-w-3xl px-5 lg:px-8">
          <span
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sky-300"
            aria-hidden="true"
          >
            <Icon className="h-7 w-7" />
          </span>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-sky-300">{eyebrow}</p>
          <h1 className="mt-4 font-outfit text-4xl font-black tracking-tight sm:text-5xl">{heading}</h1>
          <p className="mt-5 text-base leading-7 text-slate-300">{description}</p>

          {note ? (
            <p className="mt-7 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-5 text-sm leading-7 text-sky-50">
              {note}
            </p>
          ) : null}

          {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}

          {links?.length ? (
            <nav className="mt-12" aria-label="Suggested pages">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Where to go next</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#2691F0]/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
                    >
                      <span className="font-outfit text-base font-black text-white">{link.label}</span>
                      {link.description ? (
                        <span className="mt-1 block text-sm leading-6 text-slate-400">{link.description}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </main>
    </div>
  );
}
