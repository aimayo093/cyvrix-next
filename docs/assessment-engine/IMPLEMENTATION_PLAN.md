# Implementation Plan

Status: proposed. Eleven milestones, matching specification section 115.
Acceptance criteria are in `ARCHITECTURE.md` §K; this is the sequencing and the
reasoning behind it.

---

## Ordering principle

Each milestone ends with something demonstrable, and nothing is half of two
things. The order is driven by one question: what is the earliest point at which
a real customer could receive genuine value?

The answer is **milestone 8**. Milestones 1–8 are the smallest set that produces
a Microsoft 365 security assessment a customer could be charged for. Everything
before that is necessary and none of it is sellable, which is worth saying
plainly rather than discovering at milestone 6.

---

## Milestones

### M1 — Foundation
Monorepo, Postgres with RLS scaffolding, Prisma with migration tooling,
container definitions, CI pipeline, structured logging with correlation IDs,
configuration validation that refuses to boot on a missing secret, health
checks.

*No product surface. This is the floor everything else stands on, and
retrofitting RLS or correlation IDs later is far more expensive than starting
with them.*

### M2 — Authentication and tenancy
Registration, mandatory TOTP MFA, organisations, invitations, the six roles,
`TenantContext`, and **the cross-tenant test suite**.

*The cross-tenant suite is written here, before there is much data to protect,
because it must be enumerated from the schema and running before the schema
grows. Adding it at M6 means auditing six milestones of accumulated code.*

### M3 — Assessment workflow
Templates, scope capture, the immutable authorisation record, the status
machine, the orchestrator, job tracking, progress UI over SSE.

*The workflow exists before there is anything to collect, so the state machine
is exercised against stub jobs rather than debugged through a live Graph call.*

### M4 — Evidence and rules
Evidence model, S3 storage with per-organisation prefixes, the rule interface,
versioning, the evaluator, findings with the evidence constraint, scoring,
coverage.

*Built against fixture evidence, with no connector. This is deliberate: the
engine's correctness should not depend on a provider being reachable, and
proving determinism is far easier with fixtures than with a live tenant.*

### M5 — Microsoft connector
Entra application registration, admin consent flow, token sealing with envelope
encryption, preflight, the ten collectors, throttling, revocation.

*The first point at which real customer data enters the system. The
permission-manifest gate and the no-token-in-logs test are both required to be
green before this milestone is considered complete.*

### M6 — Microsoft assessment
The fifteen-rule pack, end to end against a real tenant, findings dashboard,
consultant review.

*Validated by manual review of a test tenant. Every rule's output is checked by
hand against what the tenant actually looks like, once, before any customer sees
it. There is no substitute for this and it should not be compressed.*

### M7 — AI explanation
Provider abstraction, the guardrail validator, pseudonymisation, executive
summary, technical explanation, remediation prioritisation.

*Deliberately after M6. The platform produces correct findings without AI; AI
makes them readable. Building it in this order means an AI outage degrades the
product rather than breaking it, and that property is easy to lose if AI is
wired in earlier.*

### M8 — Reporting
Executive and technical reports, PDF renderer, remediation roadmap, version
history, the section 94 disclaimer.

*First sellable output.*

### M9 — Cyvrix admin
Staff portal, tenant overview, consultant note and edit, rule enable/disable and
threshold configuration, per-access audit logging of staff reads.

### M10 — Free IT Health Check
The public entry point, questionnaire plus light connector evidence, integrated
with the marketing site's existing `/assessments/*` cards.

*Sequenced late on purpose. It is the easiest milestone and the one most
tempting to ship first, and shipping it first would produce exactly the
questionnaire-wearing-platform-branding that specification section 107
prohibits. It ships when there is a platform behind it.*

### M11 — Hardening
External penetration test, load test at 50 concurrent assessments, disaster
recovery rehearsal with a timed restore, production readiness review.

---

## Then, and not before

Network discovery agent · Cloud connectors (Azure, AWS, GCP) · Continuous
assessment · Remediation automation.

The network agent is the highest-risk component in the system and the one most
likely to be wanted early. It should be built when there is a hardened platform
to enrol it into, not alongside one.

---

## Website integration

Specification section 87 requires the existing site's assessment cards to route
to the platform rather than to a contact form:

| Card | Destination |
| --- | --- |
| Free IT Health Check | `/assessments/it-health` |
| Microsoft 365 Security Assessment | `/assessments/microsoft-365` |
| Cybersecurity Assessment | `/assessments/cybersecurity` |
| Cloud Readiness Assessment | `/assessments/cloud-readiness` |
| Network Assessment | `/assessments/network` |

Until a given assessment is deliverable, its card must not imply otherwise.
`PRODUCT.md` in `cyvrix-main` already records that these five are advertised and
not yet deliverable; that record stays accurate until each one is, and it is
updated per milestone rather than in advance.

---

## Change control

After agreement, `docs/product/product-specification.md` is the canonical
requirement. Changes go through an ADR in `docs/adr/` — problem, existing
requirement, proposed change, reason, and the security, data and migration
implications — per specification section 106.

Section 107's prohibitions apply throughout: no silent simplification, no
unlabelled fake implementation, no removed module, no changed tenancy or
authentication model, no weakened security, no AI guess replacing a deterministic
finding, and no quiet retreat into a questionnaire.
