import * as React from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Survey Status Check | CYVRIX Technologies",
  description: "Secure survey request error validation page.",
};

export default async function SurveyErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const sp = await searchParams;
  const message = sp.message || "An unexpected error occurred while loading this survey feedback request.";

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-inter text-slate-100">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-rose-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 text-center space-y-8">
        <div className="flex justify-center">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-full animate-bounce">
            <AlertTriangle className="h-16 w-16 text-rose-400" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-black tracking-widest uppercase">
            VALIDATION WARNING
          </div>
          <h1 className="font-outfit text-2xl font-black text-white">
            Survey Request Inactive
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/85 rounded-2xl p-5 space-y-3 text-xs text-left max-w-sm mx-auto">
          <p className="font-bold text-slate-300">Why am I seeing this?</p>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
              Feedback links are one-time use only. If you already submitted feedback, it cannot be edited or resubmitted.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
              Survey invitations expire automatically after 7 days for security and database hygiene.
            </li>
          </ul>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 px-6 py-3.5 rounded-2xl text-xs font-black transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CYVRIX Home
          </Link>
        </div>

        <div className="text-slate-600 text-[10px] uppercase font-bold tracking-widest pt-8">
          CYVRIX Technologies Support
        </div>
      </div>
    </main>
  );
}
