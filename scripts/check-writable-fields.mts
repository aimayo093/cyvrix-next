/**
 * The CMS API must not be able to set its own verification status.
 *
 * `docs/DECISIONS.md` records that testimonials, partner logos and client
 * logos stay unpublished until each record has been checked for evidence,
 * permission to name the client, and expiry. That gate is the reason the site
 * shows none of them today.
 *
 * The CMS route used to spread the request body straight into `create`, so a
 * body carrying `verificationStatus: "VERIFIED"` would have walked past it and
 * published a claim nobody checked. `filterWritableFields` closes that.
 *
 * This runs in the build because the failure is silent: nothing errors, a
 * testimonial simply appears on the site. Two of the cases below assert the
 * gate specifically, and one asserts a differently-named gate is caught too,
 * because the next model to need review will not reuse these column names.
 */
import { filterWritableFields, refusalMessage } from "../lib/cms-writable-fields.ts";

type Case = { name: string; body: Record<string, unknown>; writable: string[]; refused: string[] };

const cases: Case[] = [
  {
    name: "ordinary content passes untouched",
    body: { title: "A heading", body: "Some copy", order: 3, published: true },
    writable: ["title", "body", "order", "published"],
    refused: [],
  },
  {
    name: "the trust gate is refused",
    body: { quote: "They were great", verificationStatus: "VERIFIED", verifiedAt: "2026-01-01" },
    writable: ["quote"],
    refused: ["verificationStatus", "verifiedAt"],
  },
  {
    name: "permission to name a client is refused",
    body: { name: "Acme", permissionConfirmed: true, permissionEvidenceUrl: "https://x" },
    writable: ["name"],
    refused: ["permissionConfirmed", "permissionEvidenceUrl"],
  },
  {
    name: "identity and audit columns are refused",
    body: { label: "x", id: "forged", createdAt: "2020-01-01", createdBy: "someone-else" },
    writable: ["label"],
    refused: ["id", "createdAt", "createdBy"],
  },
  {
    name: "a differently-named gate is still caught",
    body: { copy: "x", reviewedByUserId: "u1", signedOffAt: "2026-01-01", approvedByName: "n" },
    writable: ["copy"],
    refused: ["reviewedByUserId", "signedOffAt", "approvedByName"],
  },
];

const failures: string[] = [];

for (const testCase of cases) {
  const { data, refused } = filterWritableFields(testCase.body);
  const gotWritable = Object.keys(data).sort().join(",");
  const wantWritable = [...testCase.writable].sort().join(",");
  const gotRefused = [...refused].sort().join(",");
  const wantRefused = [...testCase.refused].sort().join(",");

  if (gotWritable !== wantWritable || gotRefused !== wantRefused) {
    failures.push(
      `    ${testCase.name}\n` +
        `      writable: got [${gotWritable}] want [${wantWritable}]\n` +
        `      refused:  got [${gotRefused}] want [${wantRefused}]`
    );
  } else {
    console.log(`  pass  ${testCase.name}`);
  }
}

// The refusal has to name what it dropped. An administrator who set a field and
// saw it silently ignored would reasonably report it as data loss.
if (!refusalMessage(["verificationStatus"]).includes("verificationStatus")) {
  failures.push("    the refusal message does not name the field it refused");
}

if (failures.length === 0) {
  console.log(`\n  Writable-field check passed. ${cases.length} cases.\n`);
  process.exit(0);
}

console.error(`\n  Writable-field check failed: ${failures.length} case(s).\n`);
for (const failure of failures) console.error(failure);
console.error(
  "\n  This filter is what stops a CMS API body setting its own verification\n" +
    "  status. Weakening it publishes claims nobody checked — see docs/DECISIONS.md.\n"
);
process.exit(1);
