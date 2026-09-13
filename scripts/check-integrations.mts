/**
 * Proves the integration registry cannot be turned into script injection.
 *
 * Identifiers from the Integrations CMS are placed inside inline scripts, so the
 * patterns in lib/integrations.ts are the only thing between a stored value and
 * code running in a visitor's browser. This checks each pattern against its own
 * example and against values shaped like an attack, confirms the script sources
 * stay narrow, and confirms a bad stored value is dropped on read.
 */
import { INTEGRATIONS, integrationScriptSources, readActiveIntegrations } from "../lib/integrations";

const failures: string[] = [];

function check(condition: boolean, label: string) {
  if (condition) {
    console.log(`  pass  ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures.push(label);
  }
}

const hostile = [
  "",
  " ",
  "<script>alert(1)</script>",
  "G-ABC123'});alert(1);//",
  "abc\" onload=\"alert(1)",
  "javascript:alert(1)",
  "x y",
  "%3Cscript%3E",
  "../../etc/passwd",
  "cyvrix.co.uk/evil",
  "G-ABC123\n",
];

for (const integration of INTEGRATIONS) {
  check(integration.pattern.test(integration.example), `${integration.id}: accepts its own example`);
  const leaked = hostile.filter((value) => integration.pattern.test(value));
  check(leaked.length === 0, `${integration.id}: rejects all ${hostile.length} hostile values`);
  check(!integration.pattern.global && !integration.pattern.sticky, `${integration.id}: pattern is stateless`);
}

const sources = integrationScriptSources();
check(sources.every((source) => source.startsWith("https://")), "every script source is https");
check(sources.every((source) => !source.includes("*")), "no wildcard script sources");
check(
  !sources.includes("https://www.googletagmanager.com") && !sources.includes("https://www.googletagmanager.com/"),
  "the Tag Manager host is not allowed whole",
);
check(new Set(sources).size === sources.length, "script sources are unique");

const active = readActiveIntegrations({
  "google-analytics": { enabled: true, value: "G-ABC123DEF4" },
  "microsoft-clarity": { enabled: false, value: "abcde12345" },
  plausible: { enabled: true, value: "<script>" },
  "google-site-verification": { enabled: true, value: "  abc123DEF456ghi789JKL012  " },
  "not-a-service": { enabled: true, value: "x" },
});
check(active.some((item) => item.id === "google-analytics"), "keeps an enabled service with a valid ID");
check(!active.some((item) => item.id === "microsoft-clarity"), "drops a disabled service");
check(!active.some((item) => item.id === "plausible"), "drops a stored value that fails its pattern");
check(
  active.find((item) => item.id === "google-site-verification")?.value === "abc123DEF456ghi789JKL012",
  "trims surrounding whitespace",
);
check(!active.some((item) => (item.id as string) === "not-a-service"), "ignores keys not in the registry");
check(
  readActiveIntegrations(null).length === 0 &&
    readActiveIntegrations("x").length === 0 &&
    readActiveIntegrations([]).length === 0,
  "treats a malformed setting as nothing enabled",
);

if (failures.length > 0) {
  console.error(`\n  Integration check failed: ${failures.length} case(s).\n`);
  process.exit(1);
}
console.log("\n  Integration check passed.\n");
