/**
 * Parsing behind the live Security Center probes. Run: npm run test:appsec
 */
import { clientBundlePaths } from "../lib/appsec-probe-parse";
import { upgradeTarget } from "../lib/dependency-freshness";
import { countHit, MemoryStore, RateLimitError, type RateLimitStore } from "../lib/rate-limit-core";
import { needsSecondFactor, sessionVersionMatches } from "../lib/session-rules";
import fs from "node:fs";
import path from "node:path";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

// The shape production serves since skew protection was switched on.
const skewProtected = `
<script src="/_next/static/chunks/5d015edf-de95126d3f5ba313.js?dpl=dpl_7qCWrNzqSC4gu1GrJ2Qigacd1Y9k" async=""></script>
<script src="/_next/static/chunks/4bd1b696-1b0b75b16103c4e4.js?dpl=dpl_7qCWrNzqSC4gu1GrJ2Qigacd1Y9k" async=""></script>
<script src="/_next/static/chunks/4806-b9dc04d1bf225fb6.js?dpl=dpl_7qCWrNzqSC4gu1GrJ2Qigacd1Y9k" async=""></script>
<script src="/_next/static/chunks/main-app-376726c46f87c484.js?dpl=dpl_7qCWrNzqSC4gu1GrJ2Qigacd1Y9k" async=""></script>`;

check("skew-protected bundles found, query dropped", clientBundlePaths(skewProtected), [
  "/_next/static/chunks/5d015edf-de95126d3f5ba313.js",
  "/_next/static/chunks/4bd1b696-1b0b75b16103c4e4.js",
  "/_next/static/chunks/4806-b9dc04d1bf225fb6.js",
]);
check("plain bundles still found", clientBundlePaths(`<script src="/_next/static/chunks/main-abc.js" async></script>`), [
  "/_next/static/chunks/main-abc.js",
]);
check("duplicates counted once", clientBundlePaths(`<script src="/_next/static/a.js"></script><script src="/_next/static/a.js?x=1"></script>`), [
  "/_next/static/a.js",
]);
check("third-party scripts ignored", clientBundlePaths(`<script src="https://cdn.example.com/_next/static/x.js"></script>`), []);
check("stylesheets ignored", clientBundlePaths(`<link href="/_next/static/css/a.css?dpl=1">`), []);
check("no scripts → empty", clientBundlePaths("<html></html>"), []);

// Dependency freshness, as the Security Center reports it.
check("newer major is flagged", upgradeTarget("framer-motion", "^12.43.0", "14.12.0", 24), "14.12.0");
check("same version is current", upgradeTarget("next", "^16.4.6", "16.4.6", 24), null);
check("pre-release is not a target", upgradeTarget("prisma", "^7.10.1", "8.0.0-rc.33", 24), null);
check("@types/node on runtime major is current", upgradeTarget("@types/node", "^24.19.2", "26.6.6", 24), null);
check("@types/node off runtime major is flagged", upgradeTarget("@types/node", "^20.19.43", "26.6.6", 24), "24.x (the Node.js runtime)");
check("unpinned range is skipped", upgradeTarget("@types/react", "^19", "19.3.0", 24), null);

// Rate limiting.
async function attempts(store: RateLimitStore, fallback: RateLimitStore, n: number, limit: number) {
  let allowed = 0;
  for (let i = 0; i < n; i++) {
    try {
      await countHit(store, fallback, "k", { limit, windowMs: 60_000 }, 1_000_000);
      allowed += 1;
    } catch (error) {
      if (!(error instanceof RateLimitError)) throw error;
    }
  }
  return allowed;
}
const broken: RateLimitStore = { hit: async () => { throw new Error("db down"); }, reset: async () => {} };
check("limit of 5 allows exactly 5", await attempts(new MemoryStore(), new MemoryStore(), 8, 5), 5);
check("store down falls back to counting, not allowing", await attempts(broken, new MemoryStore(), 8, 5), 5);
{
  const store = new MemoryStore();
  await attempts(store, store, 5, 5);
  let retry = 0;
  try { await countHit(store, store, "k", { limit: 5, windowMs: 60_000 }, 1_000_000 + 20_000); } catch (e) { retry = (e as RateLimitError).retryAfterSeconds; }
  check("retry-after counts down the window", retry, 40);
  const after = await countHit(store, store, "k", { limit: 5, windowMs: 60_000 }, 1_000_000 + 61_000);
  check("a new window starts after the old one ends", after.remaining, 4);
}

// Session rules.
check("old token without a version still works at 0", sessionVersionMatches(undefined, 0), true);
check("token is refused once the version moves on", sessionVersionMatches(0, 1), false);
check("token at the current version works", sessionVersionMatches(3, 3), true);
check("super admin without 2FA must set it up", needsSecondFactor("SUPER_ADMIN", null), true);
check("admin without 2FA must set it up", needsSecondFactor("ADMIN", null), true);
check("enrolled admin is through", needsSecondFactor("ADMIN", new Date()), false);
check("client is not required to", needsSecondFactor("CLIENT", null), false);

// Every rate-limit call must be awaited: an un-awaited one never throws, so
// the limit silently stops applying.
{
  const root = path.resolve(import.meta.dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, "app"));
  walk(path.join(root, "lib"));
  const unawaited: string[] = [];
  for (const file of files) {
    if (/rate-limit(-core)?\.ts$/.test(file)) continue;
    fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
      const calls = /\b(enforceRateLimit|resetRateLimit|enforcePublicSubmissionRateLimit)\(/.test(line);
      const isImport = /^\s*import\b|\}\s*from\s*["']/.test(line);
      if (calls && !isImport && !/\bawait\s/.test(line)) {
        unawaited.push(`${path.relative(root, file)}:${i + 1}`);
      }
    });
  }
  check("every rate-limit call is awaited", unawaited, []);
}

if (failures) {
  console.error(`\n  ${failures} appsec probe check(s) failed.`);
  process.exit(1);
}
console.log("\n  All appsec probe checks passed.");
