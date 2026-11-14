import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** The dark card the sign-in pages share, for pages that need no client script. */
export function AuthShell({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#041635] p-5 py-14 sm:p-10">
      <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-[#2691F0] opacity-10 blur-[150px]" />
      <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-[#2691F0] opacity-10 blur-[150px]" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/login" className="group mb-8 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          <span className="text-sm font-bold">Back to sign in</span>
        </Link>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="font-outfit text-2xl font-black text-white">{title}</h1>
          {intro && <div className="mt-2 text-sm leading-relaxed text-slate-400">{intro}</div>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const authInputClass =
  "autofill-dark w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white caret-white outline-none transition-all placeholder-slate-500 focus:border-transparent focus:ring-2 focus:ring-[#2691F0]";
export const authLabelClass = "ml-1 block text-xs font-black uppercase tracking-widest text-slate-400";
export const authButtonClass =
  "w-full rounded-xl bg-[#2691F0] py-3.5 font-bold text-white shadow-lg shadow-[#2691F0]/20 transition-colors hover:bg-[#1f7fd6]";
