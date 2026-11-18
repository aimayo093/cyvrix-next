/**
 * The dependency audit gate's rules (scripts/audit-gate.mts), on fixed reports.
 * Run with: npm run test:audit-gate
 */
import { evaluate, type AuditReport, type Exception } from "./audit-gate.mjs";

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

const GHSA = "https://github.com/advisories/GHSA-fc5q-39xc-vjpf";
const today = "2026-11-19";
const reason = "Reached only at build time through the bundler plugin; no request supplies a pattern.";
const exception: Exception = { advisory: "GHSA-fc5q-39xc-vjpf", packages: ["picomatch", "fdir", "@rollup/pluginutils", "@rollup/plugin-commonjs", "@sentry/nextjs"], reviewBy: "2027-01-15", reason };
const current: AuditReport = {
  vulnerabilities: {
    picomatch: { severity: "high", via: [{ source: 1, title: "ReDoS", url: GHSA, severity: "high" }] },
    fdir: { severity: "high", via: ["picomatch"] },
    "@rollup/pluginutils": { severity: "high", via: ["picomatch"] },
    "@rollup/plugin-commonjs": { severity: "high", via: ["@rollup/pluginutils", "fdir", "picomatch"] },
    "@sentry/nextjs": { severity: "high", via: ["@rollup/plugin-commonjs"] },
  },
};

check("today's report passes with the exception", evaluate(current, [exception], today), { failures: [], notes: [] });
check("and fails without it", evaluate(current, [], today).failures.length, 5);
check("an expired exception fails", evaluate(current, [{ ...exception, reviewBy: "2026-11-18" }], today).failures.some((f) => f.includes("expired")), true);
check("an exception without a real reason fails", evaluate(current, [{ ...exception, reason: "build only" }], today).failures.some((f) => f.includes("reason")), true);
const newPath: AuditReport = { vulnerabilities: { ...current.vulnerabilities, "some-runtime-lib": { severity: "high", via: ["picomatch"] } } };
check("the same advisory through a new package fails", evaluate(newPath, [exception], today).failures, ["some-runtime-lib (high): GHSA-fc5q-39xc-vjpf is not excepted for this package."]);
const another: AuditReport = { vulnerabilities: { ...current.vulnerabilities, next: { severity: "moderate", via: [{ url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "moderate" }] } } };
check("any other advisory fails", evaluate(another, [exception], today).failures, ["next (moderate): GHSA-aaaa-bbbb-cccc is not excepted for this package."]);
const low: AuditReport = { vulnerabilities: { next: { severity: "low", via: [{ url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "low" }] } } };
check("a low advisory does not block (as before)", evaluate(low, [], today).failures, []);
check("a fixed advisory leaves a note to remove the exception", evaluate({ vulnerabilities: {} }, [exception], today), { failures: [], notes: ["Exception GHSA-fc5q-39xc-vjpf is no longer needed. Remove it from scripts/audit-exceptions.json."] });
const cycle: AuditReport = { vulnerabilities: { a: { severity: "high", via: ["b"] }, b: { severity: "high", via: ["a"] } } };
check("a dependency cycle does not hang", evaluate(cycle, [], today).failures, []);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
