/**
 * Parsing behind the live Security Center probes. Run: npm run test:appsec
 */
import { clientBundlePaths } from "../lib/appsec-probe-parse";
import { heldBackBy, upgradeTarget } from "../lib/dependency-freshness";
import { countHit, MemoryStore, RateLimitError, type RateLimitStore } from "../lib/rate-limit-core";
import { needsSecondFactor, sessionVersionMatches } from "../lib/session-rules";
import { deviceLabel } from "../lib/device-label";
import { verifySessionToken as verifyAtProxy } from "../lib/auth-edge";
import { createHmac } from "node:crypto";
import { botProtectionUpdate, parseBotProtection } from "../lib/bot-protection-parse";
import { staticAppSecChecks } from "../lib/appsec-checks";
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
check("a declared pre-release is older than its release", upgradeTarget("prisma", "^8.0.0-rc.33", "8.0.0", 24), "8.0.0");
check("@types/node target is held by a peer ceiling", heldBackBy("24.x (the Node.js runtime)", [{ by: "x", range: "<23", maxMajor: 22 }]).length, 1);
check("unpinned range is skipped", upgradeTarget("@types/react", "^19", "19.3.0", 24), null);

// Device names in the Security Center.
check("Chrome on Windows", deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"), "Chrome on Windows");
check("Edge is not mistaken for Chrome", deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"), "Edge on Windows");
check("Safari on iPhone", deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1"), "Safari on iPhone");
check("Chrome on Android", deviceLabel("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36"), "Chrome on Android");
check("Firefox on Mac", deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 15.1; rv:140.0) Gecko/20100101 Firefox/140.0"), "Firefox on Mac");
check("Edge on Android", deviceLabel("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36 EdgA/142.0.0.0"), "Edge on Android");
check("Edge on iPhone", deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 EdgiOS/142.0 Mobile/15E148 Safari/605.1.15"), "Edge on iPhone");
check("a script is named as one", deviceLabel("curl/8.9.1"), "Script on unknown system");
check("no user agent", deviceLabel(null), "Unknown device");

// The proxy's cookie check. A cookie the server refuses must read as signed
// out at the proxy too, or /login and /admin redirect to each other forever.
{
  process.env.AUTH_SECRET = "test-secret-for-proxy-check-0000000000000000";
  const mint = (payload: object) => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${body}.${createHmac("sha256", process.env.AUTH_SECRET!).update(body).digest("base64url")}`;
  };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const legacy = mint({ sub: "u1", email: "a@b.c", role: "SUPER_ADMIN", exp, sv: 0 });
  const current = mint({ sub: "u1", email: "a@b.c", role: "SUPER_ADMIN", exp, sv: 0, sid: "abcdefghijklmnopqrstuvwx" });
  check("proxy refuses a cookie with no device row (the loop)", await verifyAtProxy(legacy), null);
  check("proxy accepts a cookie naming a device row", (await verifyAtProxy(current))?.sid, "abcdefghijklmnopqrstuvwx");
  check("proxy refuses a tampered cookie", await verifyAtProxy(current.slice(0, -2) + "xx"), null);
}

// Bot protection, as the firewall reports it.
check("challenge active reads as on", parseBotProtection(200, { managedRules: { bot_protection: { active: true, action: "challenge", updatedAt: "2026-11-10T12:00:00Z" } } }), { state: "on", mode: "challenge", updatedAt: "2026-11-10T12:00:00Z" });
check("inactive reads as off", parseBotProtection(200, { managedRules: { bot_protection: { active: false } } }), { state: "off", mode: null, updatedAt: null });
check("log-only is not protection", parseBotProtection(200, { managedRules: { bot_protection: { active: true, action: "log" } } }).state, "off");
check("a 404 is not shown as off (could be a wrong id)", parseBotProtection(404, null).state, "unavailable");
check("a config without the ruleset reads as off", parseBotProtection(200, { managedRules: {} }).state, "off");
check("unreadable JSON is not shown as off", parseBotProtection(200, "unreadable").state, "unavailable");
check("active in an unknown mode is not shown as on", parseBotProtection(200, { managedRules: { bot_protection: { active: true, action: "mystery" } } }).state, "unavailable");
check("a bad timestamp is dropped, not rendered", parseBotProtection(200, { managedRules: { bot_protection: { active: true, action: "challenge", updatedAt: "not a date" } } }), { state: "on", mode: "challenge", updatedAt: null });
check("refused token is not shown as off", parseBotProtection(403, null).state, "unavailable");
check("server error is not shown as off", parseBotProtection(500, { error: "x" }).state, "unavailable");
check("turn-on body", botProtectionUpdate(true), { action: "managedRules.update", id: "bot_protection", value: { active: true, action: "challenge" } });
check("turn-off body", botProtectionUpdate(false).value.active, false);

// Features the site does not have are "not applicable": not a pass, not a
// blind spot, never a warning, and out of the score.
{
  const checks = staticAppSecChecks();
  const reset = checks.find((check) => check.id === "appsec_password_reset");
  const webhooks = checks.find((check) => check.id === "appsec_webhooks");
  check("password reset is not applicable", [reset?.notApplicable, reset?.assessed, reset?.detail.startsWith("Not applicable.")], [true, false, true]);
  check("webhooks are not applicable", [webhooks?.notApplicable, webhooks?.assessed], [true, false]);
  check("no unanswered static check is left as a warning", checks.filter((c) => c.assessed === false && !c.notApplicable && c.status === "warn").map((c) => c.id), []);
}

// Held-back majors.
const eslintHolds = [
  { by: "eslint-plugin-react", range: "^3 || ^9.7", maxMajor: 9 },
  { by: "typescript-eslint", range: "^8.57.0 || ^9.0.0 || ^10.0.0", maxMajor: 10 },
];
check("ESLint 10 is held by the plugin capped at 9", heldBackBy("10.14.0", eslintHolds).map((h) => h.by), ["eslint-plugin-react"]);
check("a target every peer admits is not held", heldBackBy("9.40.0", eslintHolds), []);
check("no recorded peers: not held", heldBackBy("14.12.0", undefined), []);

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
