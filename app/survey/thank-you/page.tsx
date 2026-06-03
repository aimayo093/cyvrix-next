import * as React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Thank You | CYVRIX Technologies Feedback",
  description: "Thank you for sharing your experience with us.",
};

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-inter text-slate-100">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 text-center space-y-8">
        <div className="flex justify-center">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse">
            <CheckCircle2 className="h-16 w-16 text-emerald-400" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-black tracking-widest uppercase">
            FEEDBACK SUBMITTED
          </div>
          <h1 className="font-outfit text-3xl font-black text-white">
            Thank You!
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your response has been securely recorded. Feedback like yours is vital to how we shape and refine our managed IT and cybersecurity services.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 text-xs text-left max-w-sm mx-auto">
          <p className="font-bold text-slate-300">What happens next?</p>
          <ul className="space-y-2.5 text-slate-400">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              Our Customer Experience and Account managers review all feedback weekly.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              If you permitted a follow-up, an analyst may reach out to explore how we can optimize your environment.
            </li>
          </ul>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 px-6 py-3.5 rounded-2xl text-xs font-black transition-colors"
          >
            Visit Our Main Website
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="text-slate-600 text-[10px] uppercase font-bold tracking-widest pt-8">
          CYVRIX Technologies Ltd
        </div>
      </div>
    </main>
  );
}
