"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, ChevronDown, LockKeyhole, Menu, Moon, Sun, X } from "lucide-react";
import { industries, services } from "@/lib/cyvrix-data";

const primaryLinks = [
  { label: "Case Studies", href: "/case-studies" },
  { label: "Insights", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = stored ?? "dark";
    document.documentElement.dataset.theme = initial;
    const frame = window.requestAnimationFrame(() => {
      setTheme(initial);
      setIsMounted(true);
    });

    const handleScroll = () => setIsScrolled(window.scrollY > 18);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/85 py-3 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:bg-slate-950/85" : "py-5"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center rounded-md bg-white/95 px-2 py-1 shadow-sm shadow-slate-950/10 transition hover:bg-white" aria-label="CYVRIX Technologies home">
          <Image
            src="/brand/cyvrix-logo-color.png"
            alt="CYVRIX Technologies"
            width={221}
            height={80}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <MegaMenu label="Services" href="/services" items={services.map((service) => ({ label: service.title, href: `/services/${service.slug}` }))} />
          <MegaMenu label="Industries" href="/industries" items={industries.map((industry) => ({ label: industry.title, href: `/industries/${industry.slug}` }))} />
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-white/80 hover:text-blue-700 dark:text-white dark:hover:bg-white/10 dark:hover:text-cyan-200">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button onClick={toggleTheme} className="rounded-md border border-slate-300 bg-white/70 p-2 text-slate-900 transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:text-cyan-200" aria-label="Toggle theme">
            {isMounted && theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white/70 px-4 py-2 text-sm font-black text-slate-900 transition hover:border-cyan-400 hover:text-cyan-700 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:text-cyan-200">
            <LockKeyhole className="h-4 w-4" />
            Client Login
          </Link>
          <Link href="/request-quote" className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300">
            <CalendarCheck className="h-4 w-4" />
            Book Consultation
          </Link>
        </div>

        <button className="rounded-md border border-slate-200 p-2 lg:hidden dark:border-white/10" onClick={() => setIsMobileMenuOpen((value) => !value)} aria-label="Toggle menu">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="absolute left-0 right-0 top-full border-t border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950 lg:hidden">
          <div className="grid gap-2">
            {[{ label: "Services", href: "/services" }, { label: "Industries", href: "/industries" }, ...primaryLinks].map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="rounded-md px-3 py-3 font-bold text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10">
                {link.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Link href="/support" className="rounded-md border border-slate-200 px-4 py-3 text-center font-bold dark:border-white/10">Request IT Support</Link>
              <Link href="/request-quote" className="rounded-md bg-cyan-500 px-4 py-3 text-center font-black text-slate-950">Book Consultation</Link>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

function MegaMenu({ label, href, items }: { label: string; href: string; items: { label: string; href: string }[] }) {
  return (
    <div className="group relative">
      <Link href={href} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-white/80 hover:text-blue-700 dark:text-white dark:hover:bg-white/10 dark:hover:text-cyan-200">
        {label}
        <ChevronDown className="h-4 w-4" />
      </Link>
      <div className="invisible absolute left-0 top-full z-50 w-[42rem] translate-y-3 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-2xl shadow-slate-950/10 transition group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 dark:border-white/10 dark:bg-slate-950">
        <div className="grid grid-cols-2 gap-1">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md p-3 text-sm font-semibold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
