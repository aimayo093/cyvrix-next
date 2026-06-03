"use client";

import React, { useState, useCallback } from "react";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────────── */
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
type ScanState = "idle" | "scanning" | "done" | "error";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const STATUS = {
  pass: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Passed" },
  warn: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Warning" },
  fail: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Failed" },
};

const RING_STROKE = { pass: "#34d399", warn: "#fbbf24", fail: "#f87171" };

function ScoreRing({ score, status }: { score: number; status: "pass" | "warn" | "fail" }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          stroke={RING_STROKE[status]}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white leading-none">{score}%</span>
        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Score</span>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function SecurityScanCard() {
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const runScan = useCallback(async () => {
    setState("scanning");
    setProgress(0);
    setExpanded(false);

    /* Animate progress bar while request runs */
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 82) { clearInterval(interval); return 82; }
        return Math.min(82, p + Math.random() * 14);
      });
    }, 280);

    try {
      const res = await fetch("/api/admin/security-scan", { method: "POST" });
      clearInterval(interval);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: ScanResult = await res.json();
      setProgress(100);
      await new Promise((r) => setTimeout(r, 350));
      setResult(data);
      setState("done");
      setExpanded(true);
    } catch (err: any) {
      clearInterval(interval);
      setError(err?.message ?? "Scan failed. Please try again.");
      setState("error");
    }
  }, []);

  const overall = result ? STATUS[result.overallStatus] : null;
  const passes = result?.checks.filter((c) => c.status === "pass").length ?? 0;
  const fails = result?.checks.filter((c) => c.status === "fail").length ?? 0;
  const warns = result?.checks.filter((c) => c.status === "warn").length ?? 0;

  return (
    <div className="bg-[#041635] text-white rounded-2xl relative overflow-hidden border border-white/5">
      {/* Decorative shield */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.07] pointer-events-none">
        <Shield className="h-24 w-24" />
      </div>

      {/* Header */}
      <div className="p-6 pb-4 relative z-10">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-outfit text-lg font-bold">Security Scan</h3>
          {result && (
            <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", overall?.bg, overall?.color)}>
              {result.overallStatus === "pass" ? "Secure" : result.overallStatus === "warn" ? "Warnings" : "Issues"}
            </span>
          )}
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          {state === "idle" && "Initialize a full environment security audit and compliance check."}
          {state === "scanning" && "Scanning environment — checking database, services, and compliance…"}
          {state === "done" && result && `Last scanned ${new Date(result.timestamp).toLocaleTimeString()} · ${result.durationMs}ms`}
          {state === "error" && <span className="text-rose-400">{error}</span>}
        </p>
      </div>

      {/* Progress bar (scanning only) */}
      {state === "scanning" && (
        <div className="px-6 pb-2 relative z-10">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Running checks…</span>
            <span className="text-[10px] text-[#2691F0] font-black">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #2691F0, #06b6d4)",
              }}
            />
          </div>
        </div>
      )}

      {/* Score + summary row (done state) */}
      {state === "done" && result && overall && (
        <div className="px-6 pb-4 relative z-10">
          <div className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/8">
            <ScoreRing score={result.score} status={result.overallStatus} />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" />{passes} passed</span>
                {warns > 0 && <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="h-3 w-3" />{warns} warn</span>}
                {fails > 0 && <span className="flex items-center gap-1 text-rose-400"><XCircle className="h-3 w-3" />{fails} failed</span>}
              </div>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors font-bold uppercase tracking-wider"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "Hide details" : "View details"}
              </button>
            </div>
          </div>

          {/* Expandable check list */}
          {expanded && (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
              {result.checks.map((check) => {
                const meta = STATUS[check.status];
                return (
                  <div key={check.id} className={cn("flex items-start gap-2.5 p-2.5 rounded-xl border", meta.bg)}>
                    <meta.icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", meta.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-200 leading-none">{check.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">{check.detail}</p>
                    </div>
                    <span className={cn("text-[9px] font-black uppercase tracking-wider shrink-0", meta.color)}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      <div className="px-6 pb-6 relative z-10">
        <button
          id="security-scan-btn"
          onClick={runScan}
          disabled={state === "scanning"}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2",
            state === "scanning"
              ? "bg-white/10 text-slate-400 cursor-not-allowed"
              : state === "done"
              ? "bg-white/10 border border-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
              : "bg-gradient-to-r from-[#2691F0] to-[#0f5aab] text-white hover:opacity-90 shadow-lg shadow-blue-900/30"
          )}
        >
          {state === "scanning" ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Scanning…</>
          ) : state === "done" ? (
            <><RefreshCw className="h-4 w-4" />Re-run Scan</>
          ) : state === "error" ? (
            <><RefreshCw className="h-4 w-4" />Retry Scan</>
          ) : (
            <>Run Scan Now</>
          )}
        </button>
      </div>
    </div>
  );
}
