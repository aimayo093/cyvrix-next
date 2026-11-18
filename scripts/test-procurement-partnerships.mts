/**
 * Phase 3 rules that need no database: the credential-label guard (D7), the
 * standing registration policy (D13), registration readiness and the bid /
 * partnership scoring models.
 * Run with: npm run test:procurement-partnerships
 */
import {
  credentialLabelProblem,
  parseList,
  policyMustReset,
  registrationReadiness,
  scoreAssessment,
  sourceMatchesOrganisation,
  standingPolicyApplies,
  WEIGHTS,
} from "../lib/procurement/partnerships";

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

console.log("\n  Credential labels (D7)");
check("a password-manager entry name is fine", credentialLabelProblem("1Password: Cyvrix / Sell2Wales"), null);
check("a plain name is fine", credentialLabelProblem("Bitwarden - Find a Tender login"), null);
check("a long word without digits is fine", credentialLabelProblem("Cyvrix procurement-portals"), null);
check("a password-like string is refused", credentialLabelProblem("Tr0ub4dor&3xyzQ!")?.includes("password") ?? false, true);
check("an API-key-like string is refused", credentialLabelProblem("sk_live_51HabcDEF123456789")?.includes("password") ?? false, true);
check("a secret after a name is refused", credentialLabelProblem("Sell2Wales: hunter2hunter2!!")?.includes("password") ?? false, true);
check("too short is refused", credentialLabelProblem("ab") !== null, true);
check("a key with slashes is still a secret", credentialLabelProblem("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")?.includes("password") ?? false, true);
check("a key with colons is still a secret", credentialLabelProblem("token:abc123:XYZ789:def456")?.includes("password") ?? false, true);
check("a hyphenated name is not a secret", credentialLabelProblem("Bitwarden: tender-portal-accounts"), null);

console.log("\n  Portal changes and the standing policy (D13)");
const portal = { url: "https://contracts.mod.uk/", registrationUrl: null, cost: "free" };
check("an unchanged free portal keeps its policy", policyMustReset(portal, { ...portal }), false);
check("a new address ends it", policyMustReset(portal, { ...portal, url: "https://other.example/" }), true);
check("a new registration page ends it", policyMustReset(portal, { ...portal, registrationUrl: "https://contracts.mod.uk/register" }), true);
check("no longer free ends it", policyMustReset(portal, { ...portal, cost: "unknown" }), true);

console.log("\n  Form lists and programme sources");
check("a valid list is read", parseList("company_name, company_number\nvat_number", /^[a-z][a-z0-9_]{1,63}$/), { ok: true, values: ["company_name", "company_number", "vat_number"] });
check("a mistyped entry is an error, not dropped", parseList("company_name, Company Number!", /^[a-z][a-z0-9_]{1,63}$/).ok, false);
check("too many entries is an error", parseList(Array.from({ length: 31 }, (_, i) => `k${i}x`).join(","), /^[a-z][a-z0-9_]{1,63}$/).ok, false);
check("a source on the organisation's site matches", sourceMatchesOrganisation("https://partners.dell.com/uk/programme", "https://www.dell.com"), true);
check("a source elsewhere does not", sourceMatchesOrganisation("https://blog.example.com/dell-programme", "https://www.dell.com"), false);
check("a look-alike host does not", sourceMatchesOrganisation("https://dell.com.evil.example/x", "https://www.dell.com"), false);
check("with no known website, any source is accepted", sourceMatchesOrganisation("https://example.com/x", null), true);

console.log("\n  Standing registration policy (D13)");
const freeOn = { standingPolicy: true, cost: "free" };
const base = { portal: freeOn, actionType: "register_account", declarations: [], priceSnapshot: null };
check("free portal, policy on, plain package", standingPolicyApplies(base).applies, true);
check("not a registration", standingPolicyApplies({ ...base, actionType: "submit_tender" }).applies, false);
check("no portal", standingPolicyApplies({ ...base, portal: null }).applies, false);
check("policy off", standingPolicyApplies({ ...base, portal: { standingPolicy: false, cost: "free" } }).applies, false);
check("paid portal", standingPolicyApplies({ ...base, portal: { standingPolicy: true, cost: "paid" } }).applies, false);
check("unknown cost", standingPolicyApplies({ ...base, portal: { standingPolicy: true, cost: "unknown" } }).applies, false);
check("declarations come to the founder", standingPolicyApplies({ ...base, declarations: [{ text: "We hold X" }] }).applies, false);
check("a price comes to the founder", standingPolicyApplies({ ...base, priceSnapshot: { total: 0 } }).applies, false);
check("undefined declarations count as none", standingPolicyApplies({ ...base, declarations: undefined }).applies, true);

console.log("\n  Registration readiness");
const now = new Date("2026-11-18T12:00:00Z");
const ready = registrationReadiness({
  requiredFacts: ["company_number", "vat_number"],
  requiredDocuments: ["insurance"],
  facts: [
    { key: "company_number", verifiedAt: now },
    { key: "vat_number", verifiedAt: null },
  ],
  documents: [
    { kind: "Insurance", status: "verified", expiresAt: new Date("2027-01-01") },
  ],
  now,
});
check("an unverified fact is missing", ready, { ready: false, missingFacts: ["vat_number"], missingDocuments: [] });
check(
  "an expired document is missing",
  registrationReadiness({ requiredFacts: [], requiredDocuments: ["insurance"], facts: [], documents: [{ kind: "insurance", status: "verified", expiresAt: new Date("2026-01-01") }], now }).missingDocuments,
  ["insurance"]
);
check(
  "a draft document is missing",
  registrationReadiness({ requiredFacts: [], requiredDocuments: ["insurance"], facts: [], documents: [{ kind: "insurance", status: "draft", expiresAt: null }], now }).ready,
  false
);
check("nothing required is ready", registrationReadiness({ requiredFacts: [], requiredDocuments: [], facts: [], documents: [], now }).ready, true);

console.log("\n  Scoring");
for (const model of ["bid", "partnership"] as const) {
  check(`${model} weights sum to 100`, Object.values(WEIGHTS[model]).reduce((a, b) => a + b, 0), 100);
}
const all = (model: "bid" | "partnership", n: number) => Object.fromEntries(Object.keys(WEIGHTS[model]).map((k) => [k, n]));
check("all fives is 100 and pursue", scoreAssessment("bid", all("bid", 5), []), { total: 100, recommendation: "pursue", problems: [] });
check("all zeros is decline", scoreAssessment("partnership", all("partnership", 0), []).recommendation, "decline");
check("all threes is 60 and consider", scoreAssessment("bid", all("bid", 3), []), { total: 60, recommendation: "consider", problems: [] });
check("a disqualifier overrides a perfect score", scoreAssessment("bid", all("bid", 5), ["Needs SC clearance"]).recommendation, "disqualified");
check("blank disqualifier lines are ignored", scoreAssessment("bid", all("bid", 5), ["  ", ""]).recommendation, "pursue");
check("a missing category is a problem", scoreAssessment("bid", { technical_capability: 5 }, []).problems.length, 6);
check("6 is out of range", scoreAssessment("bid", { ...all("bid", 3), profitability: 6 }, []).problems.length, 1);
check("2.5 is not whole", scoreAssessment("bid", { ...all("bid", 3), profitability: 2.5 }, []).problems.length, 1);
check("an unknown category is a problem", scoreAssessment("bid", { ...all("bid", 3), luck: 5 }, []).problems, ["Unknown category: luck."]);
check("the pursue threshold is inclusive", scoreAssessment("bid", { ...all("bid", 4), technical_capability: 2, cash_flow_impact: 3 }, []), { total: 70, recommendation: "pursue", problems: [] });

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
