/**
 * CI's dependency audit (replaces a bare `npm audit --audit-level=moderate`).
 *
 * Runs `npm audit --omit=dev --json` and fails on any moderate, high or
 * critical advisory in a production dependency, exactly as before, except an
 * advisory listed in scripts/audit-exceptions.json for the packages it names,
 * until its reviewBy date. So:
 *   - a new advisory fails the build;
 *   - the excepted advisory reaching a package not named (a new path to it)
 *     fails the build;
 *   - an exception past its reviewBy date fails the build;
 *   - an exception that is no longer needed is reported, so it can be removed.
 *
 * `npm run audit:gate` runs it; `npm run test:audit-gate` tests the rules.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Exception = { advisory: string; packages: string[]; reviewBy: string; reason: string };
type Via = string | { source?: number; title?: string; url?: string; severity?: string };
export type AuditReport = { vulnerabilities?: Record<string, { severity: string; via: Via[] }> };

const BLOCKING = new Set(["moderate", "high", "critical"]);
const advisoryId = (url: string | undefined) => url?.match(/GHSA-[\w-]+/)?.[0] ?? url ?? "unknown advisory";

export function evaluate(report: AuditReport, exceptions: Exception[], today: string): { failures: string[]; notes: string[] } {
  const failures: string[] = [];
  const notes: string[] = [];
  const used = new Set<string>();

  for (const e of exceptions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.reviewBy)) failures.push(`Exception ${e.advisory} has no valid reviewBy date.`);
    else if (e.reviewBy < today) failures.push(`Exception ${e.advisory} expired on ${e.reviewBy}. Check for a fix and renew it or remove it.`);
    if (!e.reason || e.reason.trim().length < 40) failures.push(`Exception ${e.advisory} needs a reason a reviewer can check.`);
  }
  const live = exceptions.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.reviewBy) && e.reviewBy >= today);

  // Each vulnerable package is excused only if every advisory reaching it is
  // excepted for that package, directly or through another vulnerable package.
  const vulns = report.vulnerabilities ?? {};
  const advisoriesFor = (name: string, seen = new Set<string>()): string[] => {
    if (seen.has(name)) return [];
    seen.add(name);
    const v = vulns[name];
    if (!v) return [];
    return v.via.flatMap((via) => (typeof via === "string" ? advisoriesFor(via, seen) : [advisoryId(via.url)]));
  };
  for (const [name, v] of Object.entries(vulns)) {
    if (!BLOCKING.has(v.severity)) continue;
    for (const id of new Set(advisoriesFor(name))) {
      const ok = live.find((e) => e.advisory === id && e.packages.includes(name));
      if (ok) used.add(id);
      else failures.push(`${name} (${v.severity}): ${id} is not excepted for this package.`);
    }
  }
  for (const e of exceptions) if (!used.has(e.advisory)) notes.push(`Exception ${e.advisory} is no longer needed. Remove it from scripts/audit-exceptions.json.`);
  return { failures, notes };
}

function runAudit(): AuditReport {
  try {
    // A fixed command with no input from anywhere, so running it through the shell is safe.
    return JSON.parse(execSync("npm audit --omit=dev --json", { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
  } catch (error) {
    // npm audit exits non-zero when it finds anything; its JSON is still on stdout.
    const out = (error as { stdout?: string }).stdout;
    if (out) return JSON.parse(out);
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = JSON.parse(readFileSync(new URL("./audit-exceptions.json", import.meta.url), "utf8")) as { exceptions: Exception[] };
  const report = runAudit();
  if (!report.vulnerabilities) {
    console.error("npm audit returned no report. Failing closed.");
    process.exit(1);
  }
  const { failures, notes } = evaluate(report, file.exceptions, new Date().toISOString().slice(0, 10));
  for (const n of notes) console.log(`  note  ${n}`);
  for (const f of failures) console.error(`  FAIL  ${f}`);
  const excused = Object.keys(report.vulnerabilities).length;
  if (failures.length) process.exit(1);
  console.log(`  Dependency audit passed${excused ? ` (${excused} package(s) under a dated exception)` : ""}.`);
}
