"use client";

import React, { useState } from "react";
import { Shield, CheckCircle2, AlertTriangle, XCircle, Loader2, X, Clock } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

interface ScanCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

interface ScanResult {
  score: number;
  overallStatus: "pass" | "warn" | "fail";
  checks: ScanCheck[];
  durationMs: number;
  timestamp: string;
}

const STATUS_META = {
  pass: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Passed" },
  warn: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Warning" },
  fail: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Failed" },
};

const SCORE_RING = {
  pass: "stroke-emerald-400",
  warn: "stroke-amber-400",
  fail: "stroke-rose-400",
};

function ScoreRing({ score, status }: { score: number; status: "pass" | "warn" | "fail" }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className={cn("transition-all duration-1000", SCORE_RING[status])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white">{score}%</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Score</span>
      </div>
    </div>
  );
}

export function SecurityScanButton() {
  const [state, setState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  async function runScan() {
    setState("scanning");
    setProgress(0);
    setOpen(false);

    // Fake progress animation while the API request runs
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) { clearInterval(interval); return 85; }
        return p + Math.random() * 12;
      });
    }, 300);

    try {
      const res = await fetch("/api/admin/security-scan", { method: "POST" });
      clearInterval(interval);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: ScanResult = await res.json();
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400)); // let bar fill
      setResult(data);
      setState("done");
      setOpen(true);
    } catch (err: any) {
      clearInterval(interval);
      setErrorMsg(err?.message || "Scan failed. Please try again.");
      setState("error");
    }
  }

  function dismiss() {
    setOpen(false);
    setState("idle");
    setResult(null);
    setProgress(0);
  }

  const overall = result ? STATUS_META[result.overallStatus] : null;

  return (
    <>
      {/* ── Button ── */}
      <div className="relative">
        {state === "scanning" && (
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-bold">Scanning environment…</span>
              <span className="text-xs text-[#2691F0] font-black">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2691F0] to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button
          variant="premium"
          size="sm"
          className="w-full relative z-10"
          onClick={runScan}
          disabled={state === "scanning"}
          id="security-scan-btn"
        >
          {state === "scanning" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning…
            </>
          ) : state === "done" ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              View Last Report
            </>
          ) : (
            "Run Scan Now"
          )}
        </Button>

        {state === "error" && (
          <p className="mt-2 text-xs text-rose-400 text-center relative z-10">{errorMsg}</p>
        )}

        {state === "done" && result && !open && (
          <button
            onClick={() => setOpen(true)}
            className="mt-2 text-xs text-[#2691F0] hover:underline w-full text-center relative z-10"
          >
            Re-open report
          </button>
        )}
      </div>

      {/* ── Results Modal ── */}
      {open && result && overall && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={dismiss}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative z-10 bg-[#041635] border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#2691F0]/10 border border-[#2691F0]/20">
                  <Shield className="h-5 w-5 text-[#2691F0]" />
                </div>
                <div>
                  <h2 className="font-outfit text-lg font-black text-white">Security Scan Report</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {new Date(result.timestamp).toLocaleString()} &bull; {result.durationMs}ms
                  </p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Score summary */}
            <div className="px-6 py-5 flex items-center gap-6 border-b border-white/5">
              <ScoreRing score={result.score} status={result.overallStatus} />
              <div className="flex-1">
                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider mb-2", overall.bg, overall.color)}>
                  <overall.icon className="h-3.5 w-3.5" />
                  {result.overallStatus === "pass" ? "All Systems Secure" : result.overallStatus === "warn" ? "Warnings Detected" : "Issues Found"}
                </div>
                <p className="text-sm text-slate-400 font-medium">
                  {result.checks.filter((c) => c.status === "pass").length} of {result.checks.length} checks passed.
                  {result.checks.some((c) => c.status === "fail") && (
                    <span className="text-rose-400 font-bold"> Action required.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Check list */}
            <div className="px-6 py-4 space-y-3">
              {result.checks.map((check) => {
                const meta = STATUS_META[check.status];
                return (
                  <div
                    key={check.id}
                    className={cn("flex items-start gap-3 p-3 rounded-xl border", meta.bg)}
                  >
                    <meta.icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-200 leading-none">{check.label}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1 leading-snug">{check.detail}</p>
                    </div>
                    <span className={cn("text-[10px] font-black uppercase tracking-wider shrink-0", meta.color)}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={dismiss}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
