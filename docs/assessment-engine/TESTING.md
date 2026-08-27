# Testing Strategy

Status: proposed.

Specification section 77 lists eleven kinds of test and marks one as critical.
That emphasis is right, and this document is organised around it: the
cross-tenant suite is not one test among many, it is the test the pipeline
exists to run.

---

## The critical test

> *Create automated tests proving Tenant A cannot retrieve Tenant B data.*

**Shape.** Seed two organisations with full, distinguishable data — assessments,
findings, evidence, connectors, reports, agents, audit entries. Authenticate as
tenant A. Then, for **every tenant-owned table**, attempt to read tenant B's
rows by identifier, through every route that touches that table.

**Enumerated, not hand-written.** The suite reads the table list from the Prisma
schema. A new tenant-owned table is automatically in scope, so adding one
without isolation fails the build rather than quietly widening the gap. A
hand-maintained list of tables to check is a list that will fall behind.

**Runs on every commit**, not nightly. A cross-tenant regression that survives a
day survives into a deploy.

**Passing means:** every attempt returns 403 or an empty result. Any attempt
returning a tenant B row fails the build, with no override.

It runs at three layers, because each catches a different class of mistake:

| Layer | Catches |
| --- | --- |
| HTTP | A handler trusting a request parameter |
| Repository | A query built without `TenantContext` |
| SQL, direct | An RLS policy missing, or `FORCE` not set |

The SQL layer is the one that matters most: it is the only layer that tests the
backstop, and the backstop is what saves you when the other two are wrong.

---

## Everything else

| Kind | Scope | Notes |
| --- | --- | --- |
| Unit | Rules, scoring, crypto, evidence normalisation, validators | Pure functions, no I/O, fast |
| Integration | API against a real Postgres in a container | Never a mocked database — RLS is the thing under test |
| API contract | Generated from the OpenAPI schema | Catches drift between contract and implementation |
| RBAC | Every role against every endpoint | A matrix, generated, not enumerated by hand |
| Connector | Recorded provider fixtures | Real Graph responses, recorded once, replayed |
| Rules | Per rule: pass, fail, absent evidence, malformed evidence | Four cases minimum, no exceptions |
| Report | 0, 1 and 500 findings | The zero and the many are where renderers break |
| End to end | Register → connect → assess → report | Against a mock tenant |
| Security | SAST, dependency scan, secret scan, header assertions | Build gates |
| Load | 50 concurrent assessments | M11 |

**Rules get four cases each because three of them are the interesting ones.**
A rule that passes its happy path and reports a clean result on missing evidence
is worse than no rule. The absent-evidence case asserts `not_applicable`, and it
is the case most likely to be omitted if it is not mandatory.

**Connector tests replay recorded fixtures.** Live Graph calls in CI are slow,
flaky, and require a real tenant. Fixtures are recorded once from a real tenant,
scrubbed of identifiers, and committed. Re-recording is a deliberate act with a
changelog entry — otherwise the fixtures drift from Microsoft's actual responses
and the tests certify a world that no longer exists.

---

## Guardrail tests

These prove properties the design depends on. Each one exists because its
absence would be invisible.

| Property | Test |
| --- | --- |
| No token in any log | Run a representative request set with a sentinel token value; assert it never appears in captured output at any level |
| No write scope requested | Parse the permission manifest; fail on any `.ReadWrite.` |
| Finding requires evidence | Attempt to insert a finding with no evidence; assert the transaction fails |
| Rules are deterministic | Run the pack twice over identical evidence; assert byte-identical results |
| Rule versions are immutable | Publish a new version; assert prior assessment results are unchanged |
| AI cannot invent | Feed the validator output referencing an unknown finding ID; assert rejection and fallback to template |
| AI sees no customer identifiers | Assert the outbound payload contains no email address, UPN or hostname |
| Mock mode is visible | Assert a mock-run report carries the label in rendered text, not only metadata |
| Config fails closed | Boot with a missing secret; assert startup refuses rather than defaulting |

---

## Security testing

Per specification section 78: SAST and dependency scanning on every build,
secret scanning on every commit, container image scanning before publish, and an
external penetration test at M11 with no unresolved high or critical findings
before production.

The 18-check application security scanner already running in `cyvrix-main`
carries across, extended with the four platform-specific gates named in
`SECURITY.md`.

---

## Performance

Specification section 95 is explicit that no fixed completion time should be
promised, and the product should not display one. Targets are internal:

| Action | Target |
| --- | --- |
| Web interaction | p95 under 300ms |
| API read | p95 under 200ms |
| Collection, small tenant (< 100 users) | Typically under 5 minutes |
| Collection, medium tenant (100–1000) | Typically 5–20 minutes |
| Rules over a full evidence set | Under 30 seconds |
| Report generation | Under 60 seconds |

The customer sees real progress against real job state — collectors completed,
evidence gathered — never a synthetic percentage or an estimated finish time.
Throttling by a provider is outside the platform's control, and a progress bar
that pretends otherwise is a small dishonesty in a product sold on not telling
those.
