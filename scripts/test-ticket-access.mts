/**
 * The ticket access rule, exercised directly.
 *
 * `canAccessTicket` decides whether a person may read a support conversation,
 * and the case that matters is the one the previous inline check got wrong: a
 * ticket raised through the public contact form has no `clientCompanyId`, and a
 * portal user without a company has none either. Comparing the two for
 * inequality let `null === null` through, so any signed-in portal user could
 * read — and reply to — every company-less ticket.
 *
 * Run with `npx tsx scripts/test-ticket-access.mts`.
 */
import { canAccessTicket, visibilityFilterFor, type ThreadViewer } from "../lib/ticket-access";
import { canAccessClientRecord } from "../lib/client-access";

type Case = {
  name: string;
  viewer: ThreadViewer;
  ticket: { clientCompanyId: string | null } | null;
  expected: boolean;
};

const ACME = "company-acme";
const OTHER = "company-other";

const client = (clientCompanyId: string | null): ThreadViewer => ({
  id: "user-1",
  role: "CLIENT",
  clientCompanyId,
});

const cases: Case[] = [
  {
    name: "client reads their own company's ticket",
    viewer: client(ACME),
    ticket: { clientCompanyId: ACME },
    expected: true,
  },
  {
    name: "client cannot read another company's ticket",
    viewer: client(ACME),
    ticket: { clientCompanyId: OTHER },
    expected: false,
  },
  {
    name: "client with no company cannot read a company-less ticket",
    viewer: client(null),
    ticket: { clientCompanyId: null },
    expected: false,
  },
  {
    name: "client with a company cannot read a company-less ticket",
    viewer: client(ACME),
    ticket: { clientCompanyId: null },
    expected: false,
  },
  {
    name: "client with no company cannot read a company's ticket",
    viewer: client(null),
    ticket: { clientCompanyId: ACME },
    expected: false,
  },
  {
    name: "a missing ticket is not accessible",
    viewer: client(ACME),
    ticket: null,
    expected: false,
  },
  {
    name: "support agent reads any ticket",
    viewer: { id: "staff-1", role: "SUPPORT_AGENT", clientCompanyId: null },
    ticket: { clientCompanyId: ACME },
    expected: true,
  },
  {
    name: "admin reads a company-less ticket",
    viewer: { id: "staff-2", role: "ADMIN", clientCompanyId: null },
    ticket: { clientCompanyId: null },
    expected: true,
  },
];

let failures = 0;

for (const testCase of cases) {
  const actual = canAccessTicket(testCase.viewer, testCase.ticket);
  const ok = actual === testCase.expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${testCase.name}`);
  if (!ok) console.log(`          expected ${testCase.expected}, got ${actual}`);
}

// Staff see internal notes; a client sees only what was addressed to them. The
// admin's note form defaults to "Internal note", so an unfiltered client view
// meant private remarks reaching the customer by default rather than by
// mistake.
const clientFilter = visibilityFilterFor(client(ACME));
const staffFilter = visibilityFilterFor({ id: "s", role: "SUPPORT_AGENT", clientCompanyId: null });

const clientFilterOk = (clientFilter as { visibility?: string }).visibility === "client";
const staffFilterOk = Object.keys(staffFilter).length === 0;

if (!clientFilterOk) failures += 1;
if (!staffFilterOk) failures += 1;
console.log(`  ${clientFilterOk ? "pass" : "FAIL"}  a client's query is restricted to client-visible messages`);
console.log(`  ${staffFilterOk ? "pass" : "FAIL"}  staff see every message including internal notes`);

// The same predicate guards proposal acceptance, where the consequence of
// getting it wrong is a commercial commitment rather than a message. Exercised
// through its own name so a future refactor cannot quietly unhook one caller.
const proposalCases: Array<{ name: string; viewer: ThreadViewer; record: { clientCompanyId: string | null } | null; expected: boolean }> = [
  {
    name: "client accepts their own company's proposal",
    viewer: client(ACME),
    record: { clientCompanyId: ACME },
    expected: true,
  },
  {
    name: "client cannot accept a company-less proposal",
    viewer: client(ACME),
    record: { clientCompanyId: null },
    expected: false,
  },
  {
    name: "client with no company cannot accept a company-less proposal",
    viewer: client(null),
    record: { clientCompanyId: null },
    expected: false,
  },
  {
    name: "client cannot accept another company's proposal",
    viewer: client(ACME),
    record: { clientCompanyId: OTHER },
    expected: false,
  },
];

for (const testCase of proposalCases) {
  const actual = canAccessClientRecord(testCase.viewer, testCase.record);
  const ok = actual === testCase.expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${testCase.name}`);
  if (!ok) console.log(`          expected ${testCase.expected}, got ${actual}`);
}

const total = cases.length + proposalCases.length + 2;
if (failures > 0) {
  console.error(`\n  ${failures} of ${total} checks failed.\n`);
  process.exit(1);
}
console.log(`\n  All ${total} ticket access checks passed.\n`);
