/**
 * Parsing behind the live Security Center probes. Run: npm run test:appsec
 */
import { clientBundlePaths } from "../lib/appsec-probe-parse";
import { upgradeTarget } from "../lib/dependency-freshness";

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

if (failures) {
  console.error(`\n  ${failures} appsec probe check(s) failed.`);
  process.exit(1);
}
console.log("\n  All appsec probe checks passed.");
