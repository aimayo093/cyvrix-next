# Cyvrix Assessment Engine — Architecture

Status: **proposed, not approved.** Nothing in this document has been built.

The specification (`product-specification.md`) asks for architecture before
implementation, and for a first response covering sections A–L. This is that
response. Section 105 of the specification is explicit that hundreds of files
should not appear before this is agreed, so no application code accompanies it.

---

## A. Product Architecture

The platform is four cooperating pieces, separated because they have genuinely
different security postures and failure modes — not because layering is tidy.

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  cyvrix.co.uk  (existing marketing site, Next.js on Vercel)      │
  │  /assessments/* cards link out. No customer evidence ever here.  │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │  link, not integration
  ┌───────────────────────────────▼─────────────────────────────────┐
  │  app.cyvrix.co.uk — Console (Next.js)                           │
  │  Sign-in, organisation, scope, authorisation, connector consent, │
  │  progress, findings, dashboards, report download.                │
  │  Holds a session. Holds no secrets and runs no collection.       │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │  HTTPS, session cookie → short-lived JWT
  ┌───────────────────────────────▼─────────────────────────────────┐
  │  api.cyvrix.co.uk — Core API (NestJS, containerised)            │
  │  AuthZ, tenancy, orchestration, rules, scoring, AI gateway.      │
  │  The only writer to Postgres. The only reader of the key store.  │
  └───────┬──────────────────────────────────────────┬──────────────┘
          │ enqueue                                  │
  ┌───────▼───────────────┐                  ┌───────▼──────────────┐
  │  Workers (BullMQ)     │                  │  PostgreSQL + RLS    │
  │  collectors, rules,   │                  │  S3 evidence store   │
  │  scoring, AI, reports │                  │  Redis queues        │
  └───────┬───────────────┘                  └──────────────────────┘
          │ outbound only
  ┌───────▼───────────────────────────┐   ┌─────────────────────────┐
  │  Microsoft Graph / Azure / AWS /  │   │  Network Agent          │
  │  Google Cloud  (read-only OAuth)  │   │  customer premises,     │
  └───────────────────────────────────┘   │  outbound mTLS, polls   │
                                          └─────────────────────────┘
```

**Why the console and the API are separate processes.** The console is a
rendering surface with a session. The API holds connector tokens, decrypts
secrets, and speaks to customer tenants. Merging them would put token decryption
in the same process as server-rendered marketing-adjacent pages, and would make
every UI dependency a dependency of the thing that reads customer environments.

**Why not on Vercel.** Section 46 of the specification says Vercel may host
frontend components but is not the platform. That is the right call for concrete
reasons: evidence collection from a large Microsoft tenant runs for minutes, not
seconds; BullMQ needs long-lived worker processes; and the network agent needs a
stable mTLS endpoint. The console can sit on Vercel. The API and workers are
containers on Azure Container Apps (chosen because the first connector is
Microsoft and Entra workload identity removes a class of secret handling).

**Why a new repository.** `cyvrix-main` is a marketing site whose administrators
edit page copy. This platform stores customer security findings. Sharing a
deployment would mean a CMS bug and a tenant-isolation bug live in the same
blast radius. Two repositories, one linked journey.

---

## B. Repository Structure

A pnpm + Turborepo monorepo in a new repository, `cyvrix-assessment-engine`.

```
cyvrix-assessment-engine/
├── apps/
│   ├── console/                 Next.js — customer-facing console
│   ├── admin/                   Next.js — Cyvrix staff portal
│   ├── api/                     NestJS — the only writer to the database
│   └── worker/                  BullMQ processors (same image as api)
├── packages/
│   ├── db/                      Prisma schema, migrations, RLS policies
│   ├── contracts/               Zod schemas + generated OpenAPI types
│   ├── evidence/                The normalised evidence model
│   ├── rules/                   Rule definitions, versioning, evaluator
│   ├── scoring/                 Weights, thresholds, coverage
│   ├── ai/                      Provider abstraction + guardrail validator
│   ├── connectors/
│   │   ├── microsoft-365/
│   │   ├── azure/
│   │   ├── aws/
│   │   ├── google-cloud/
│   │   └── kit/                 Collector base class, retry, rate limiting
│   ├── crypto/                  Envelope encryption, token sealing
│   └── reporting/               Report composition, PDF renderer
├── agent/                       Go — the network discovery agent
├── docs/                        These documents; ADRs
└── infra/                       Terraform, container definitions
```

`agent/` is Go rather than TypeScript for one reason: it must ship as a single
static binary to Windows and Linux hosts with no runtime to install, and be
small enough that a customer's security team will actually read what it does.

---

## C. Database Architecture

One PostgreSQL database. Every tenant-owned table carries a non-null
`organisation_id` and is covered by Row Level Security. Full entity list and
column detail in [DATABASE.md](DATABASE.md); the shape is:

```
Organisation ─┬─< OrganisationMember >─ User
              ├─< Invitation
              ├─< Connector ──< ConnectorCredential (ciphertext only)
              ├─< Agent ──< AgentHeartbeat
              ├─< Asset ─┬─ NetworkDevice
              │          ├─ Endpoint
              │          └─ CloudResource
              └─< Assessment ─┬─ AssessmentScope
                              ├─ AssessmentAuthorisation
                              ├─< CollectionJob ──< Evidence
                              ├─< RuleResult ──> RuleVersion
                              ├─< Finding ──< FindingEvidence >── Evidence
                              ├─< Score ──< ScoreHistory
                              ├─< Report ──< ReportVersion
                              └─< RemediationRequest ──< RemediationTask

Rule ──< RuleVersion ──< RuleFrameworkMapping >── FrameworkControl >── Framework
AuditLog, Notification, Subscription, SystemSetting, AIInteractionMetadata
```

Three structural decisions worth stating up front:

**Evidence is immutable and append-only.** A collector writes evidence rows and
never updates them. Re-running a collection creates a new `CollectionJob` and a
new generation of evidence. This is what makes a finding defensible six months
later.

**Findings reference rule *versions*, never rules.** Section 24 requires that
changing a rule must not alter historical results. Storing `rule_version_id` on
`RuleResult` makes that structural rather than a matter of discipline.

**Raw provider payloads live in S3, not Postgres.** `Evidence.raw_reference`
holds an object key. A Graph response for a large tenant is megabytes; the
database stores the normalised observation and the pointer.

---

## D. Authentication and Tenant Isolation

Isolation is enforced at four layers. Any one of them failing should not leak
data, because a single mechanism will eventually be bypassed by a mistake.

**1. Session and token.** Email plus password with mandatory TOTP MFA, built on
the same RFC 6238 implementation already running in `cyvrix-main` (`lib/totp.ts`,
`lib/two-factor.ts`) — hand-written, tested, and already reviewed. The console
exchanges its session for a short-lived JWT carrying `sub`, `org`, and `role`.
The architecture is SSO-ready: `OrganisationMember` is the authorisation record,
so adding an OIDC identity provider changes how a `User` authenticates and
nothing about what they can reach.

**2. Request scope.** Every API request resolves exactly one
`organisation_id` from the token, and it is never read from a path, query or
body parameter. An organisation identifier appearing in a request payload is a
validation error, not a selector.

**3. Repository layer.** No handler calls Prisma directly. All access goes
through a `TenantContext` that takes the resolved `organisation_id` and returns
a scoped client. A rule in CI fails the build if `prisma.` appears outside
`packages/db`.

**4. Row Level Security.** The backstop, and the reason the transaction pooler
matters. Postgres RLS reads `current_setting('app.organisation_id')`, which is
set with `SET LOCAL` inside the transaction. `SET LOCAL` is transaction-scoped,
so it survives a transaction-mode pooler correctly — but a `SET` without `LOCAL`
would leak across pooled sessions and hand one tenant another tenant's context.
Every query therefore runs inside an explicit transaction. This is a real hazard,
not a theoretical one: the marketing site has already been bitten by session-mode
versus transaction-mode pooling behaviour.

**Object storage.** Evidence keys are prefixed `org/{organisation_id}/...` and
the API issues pre-signed URLs scoped to a single object. No bucket-wide
credential reaches a browser.

**Background jobs.** A job payload carries `organisation_id`, and the worker
opens its transaction with the same `SET LOCAL`. A job that cannot resolve a
tenant fails rather than running unscoped.

**AI retrieval.** The AI gateway is handed a constructed payload, never a
database handle. It has no ability to query across tenants because it has no
ability to query.

---

## E. Assessment Engine

Twelve steps, but four distinct phases with different trust properties.

```
 scope ─► authorise ─► connect ─► preflight
                                     │
                            ┌────────▼─────────┐
                   COLLECT  │ read-only calls  │  no interpretation
                            │ → raw to S3      │  no AI
                            │ → Evidence rows  │
                            └────────┬─────────┘
                            ┌────────▼─────────┐
                  NORMALISE │ provider shape → │  pure function
                            │ evidence model   │  deterministic
                            └────────┬─────────┘
                            ┌────────▼─────────┐
                   DECIDE   │ rules evaluate   │  pure function
                            │ → RuleResult     │  deterministic
                            │ → Finding        │  every finding cites evidence
                            │ → Score          │
                            └────────┬─────────┘
                            ┌────────▼─────────┐
                   EXPLAIN  │ AI reads findings│  no new facts
                            │ writes prose     │  validated before storage
                            └────────┬─────────┘
                                     ▼
                              report + roadmap
```

The load-bearing property is that **the decide phase is fully deterministic and
happens before AI is involved**. Re-running rules over stored evidence must
produce identical findings. That makes the platform's output defensible and
makes section 2's "evidence before AI" structural rather than aspirational.

A finding cannot be created without at least one `FindingEvidence` row. This is
a database constraint, not a code convention.

**Coverage is scored separately from security.** If a customer connects
Microsoft 365 but not their network, the security score describes what was seen
and the coverage score says how much that was. Presenting a single number would
overstate confidence, which is the failure mode section 28 exists to prevent.

**Statuses** follow the specification exactly: `draft`,
`awaiting_authorisation`, `awaiting_connection`, `queued`, `collecting`,
`analysing`, `generating_report`, `completed`, `partially_completed`, `failed`,
`cancelled`. `partially_completed` is not a failure — it is the honest outcome
when three of four collectors succeeded, and it carries the coverage score that
explains it.

---

## F. Microsoft 365 Integration

**Consent model.** A multi-tenant Entra application using the admin consent
flow. The customer's Global Administrator consents once, for the whole tenant,
and sees the exact permission list on Microsoft's own screen. Delegated consent
is rejected for this connector: assessment needs tenant-wide visibility, and
inheriting one administrator's personal scope produces findings that silently
depend on who signed in.

**Permissions — all read-only, requested per assessment type.**

| Area | Permission |
| --- | --- |
| Entra ID | `Directory.Read.All`, `User.Read.All`, `Group.Read.All` |
| Roles | `RoleManagement.Read.Directory` |
| Conditional Access | `Policy.Read.All` |
| Authentication methods | `UserAuthenticationMethod.Read.All` |
| Applications | `Application.Read.All` |
| Intune | `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All` |
| SharePoint / OneDrive | `Sites.Read.All`, `SharePointTenantSettings.Read.All` |
| Exchange Online | `Exchange.ManageAsApp` with the **Global Reader** directory role |
| Defender | `SecurityEvents.Read.All`, `ThreatHunting.Read.All` |
| Reports | `Reports.Read.All`, `AuditLog.Read.All` |

Not one `.ReadWrite.` scope. Section 2 requires that write access is never
needed to perform an assessment, and this list is the proof.

**Token handling.** The refresh token is sealed with AES-256-GCM under a
per-organisation data key, itself wrapped by a key-management key in Azure Key
Vault — envelope encryption, so rotating the KMS key does not require
re-encrypting every token. The sealing code is the pattern already proven in
`cyvrix-main/lib/secret-box.ts` (AES-256-GCM with HKDF key separation).
Ciphertext lives in `ConnectorCredential`; plaintext exists only inside a
collector process, for the life of one call.

**Collector architecture.** One collector per Microsoft workload, each declaring
its required permissions, its evidence types, and its licence prerequisites. A
collector is a pure function of `(graphClient, scope) → Evidence[]`. It performs
no judgement — "MFA is not enforced" is a rule's conclusion, never a collector's.

Licensing is handled explicitly: Defender and risk data need Entra ID P2, and a
collector that cannot run because the licence is absent records
`not_applicable` with the reason. It never records a pass, and it never records
a failure. Reporting a control as failed when it could not be inspected would be
exactly the kind of claim this company does not make.

**Throttling.** Graph returns 429 with `Retry-After` under load. The collector
kit honours it with jittered backoff and a per-tenant concurrency cap. A
throttled collection extends the assessment; it does not fail it.

---

## G. Network Agent Architecture

The agent runs inside a customer network and is therefore the highest-risk
component in the system. Its design is constrained accordingly.

**Outbound only.** The agent opens a connection to the platform and polls for
work. It listens on no port and requires no inbound firewall rule. Nothing on
the internet can reach it.

**Mutual TLS, per-agent identity.** Enrolment uses a one-time token, exchanged
immediately for a client certificate bound to one `agent_id` and one
`organisation_id`. Certificates are short-lived and rotate automatically. A
stolen agent binary without its key is inert.

**Signed, scoped work.** Every job envelope is signed by the platform and names
its authorised targets. The agent verifies the signature and independently
re-checks each target against the enrolled scope before acting. A job naming an
IP range outside the authorisation is refused by the agent, not only by the
server — because the server is the thing an attacker would try to impersonate.

**No plaintext credentials.** SNMP communities and SSH keys stay in the OS
credential store on the agent host, referenced by name. The platform stores the
reference. Section 14 requires this and it also means a platform-side breach
does not yield network device credentials.

**Discovery, not exploitation.** ICMP, ARP, SNMP read, LLDP/CDP, WMI, WinRM,
SSH and vendor read APIs. No exploitation, no credential spraying, no
authenticated write. The agent is an inventory tool.

**Legible.** The agent logs every action locally in plain text so a customer's
own security team can audit it. A binary that scans a network and explains
nothing will not be approved by the buyers described in `PRODUCT.md`, and
should not be.

---

## H. AI Architecture

**Structural, not prompted, guardrails.** "Do not fabricate" in a system prompt
is a request. The constraint is enforced by the shape of the interface:

```
     Findings + evidence          ┌──────────────┐        Prose keyed to
     (already decided)  ────────► │  AI gateway  │ ─────► finding IDs
     No database handle           └──────────────┘        Nothing else parses
                                         │
                                  ┌──────▼──────┐
                                  │  validator  │  rejects: unknown finding ID,
                                  └──────┬──────┘  new severity, invented control,
                                         │         numeric claim not in input
                                    stored, labelled
                                    ai_generated = true
```

The model receives a constructed JSON payload and returns a structured object
whose every element is keyed to a `finding_id` present in the input. Output
referencing an unknown identifier is discarded and the assessment falls back to
the rule's own `recommendation_template`. A report is never blocked by an AI
failure — it is simply less eloquent.

Severity is set by rules. The AI cannot change it. Section 29 allows severity
adjustment only "with defined policy"; until such a policy exists and is written
down, the field is not writable by a model.

**Provider abstraction.** One `LanguageModel` interface with implementations for
Anthropic, OpenAI and Gemini. Model selection is configuration per function —
executive summary, technical analysis, customer assistant — so the executive
report can use a stronger model than the chat assistant without a code change.

**Privacy.** Customer identifiers are pseudonymised before leaving the platform:
user principal names become `user-7`, hostnames become `host-3`, and the mapping
stays in the platform. The model sees "12 accounts with privileged roles have no
MFA registered", not a list of administrator addresses. `AIInteractionMetadata`
records model, version, token counts, latency and cost — never the prompt body.

---

## I. Security Architecture

Full analysis in [THREAT_MODEL.md](THREAT_MODEL.md). The five risks that shaped
the design:

| # | Threat | Consequence | Control |
| --- | --- | --- | --- |
| T1 | Cross-tenant read | Catastrophic. One customer sees another's security weaknesses | Four independent layers (D); RLS as backstop; a cross-tenant test in CI that must fail closed |
| T2 | Connector token theft | Attacker gains read access to a customer's Microsoft tenant | Envelope encryption; plaintext never persisted or logged; per-organisation data keys; revocation on disconnect |
| T3 | Agent compromise | Foothold inside a customer network | Outbound only; mTLS; signed scoped jobs; agent-side scope re-check; no plaintext credentials |
| T4 | Scope violation | Scanning an unauthorised system. Potentially a criminal offence under the Computer Misuse Act 1990 | Authorisation record required before any active job; scope checked server-side and agent-side; immutable audit trail |
| T5 | Fabricated finding | A customer acts on something untrue, and the company's credibility is the product | Evidence required by constraint; AI output validated; `not_applicable` where uninspected |

T4 deserves emphasis. Active network discovery without authorisation is not a
product bug. The `AssessmentAuthorisation` record — organisation, named person,
timestamp, IP ranges, domains, scope, acknowledgement, terms version — is a legal
artefact as much as a technical one, and it is immutable.

Beyond these: TLS 1.3 in transit, AES-256 at rest, mandatory MFA, RBAC across
the six roles in specification section 4, strict input validation via Zod at
every boundary, SSRF protection on any customer-supplied URL (deny-list of
private ranges and link-local metadata endpoints), parameterised queries
throughout, rate limiting per organisation and per IP, and secure headers with a
strict CSP.

The build-time application security scanner already running in `cyvrix-main`
(`scripts/analyse-appsec.mts`, 18 checks) carries across and extends.

---

## J. Development Roadmap

Eleven milestones, matching specification section 115. Each ends with something
demonstrable; none is "half of two things".

| # | Milestone | Substance |
| --- | --- | --- |
| 1 | Foundation | Monorepo, Postgres with RLS, migrations, containers, CI, structured logging, health checks |
| 2 | Authentication and tenancy | Registration, MFA, organisations, invitations, RBAC, `TenantContext`, the cross-tenant test |
| 3 | Assessment workflow | Templates, scope capture, authorisation record, status machine, orchestrator, progress UI |
| 4 | Evidence and rules | Evidence model, S3 storage, rule definitions with versioning, evaluator, findings, scoring, coverage |
| 5 | Microsoft connector | Entra app, admin consent, token sealing, preflight, five collectors, throttling |
| 6 | Microsoft assessment | The rule pack, end to end on a real tenant, findings dashboard |
| 7 | AI explanation | Provider abstraction, guardrail validator, pseudonymisation, executive summary |
| 8 | Reporting | Executive and technical reports, PDF renderer, roadmap, version history |
| 9 | Cyvrix admin | Staff portal, consultant review and edit, rule management, tenant overview |
| 10 | Free IT Health Check | Questionnaire plus light connector evidence, the public entry point |
| 11 | Hardening | Penetration test, load test, DR rehearsal, production readiness review |

Only then: network discovery, cloud assessment, continuous monitoring,
remediation automation.

**A note on scale, stated once.** This is eleven milestones of work for a
company that is currently one engineer. Milestones 1–8 are the smallest set that
produces something a customer could genuinely be charged for, and they are still
a substantial programme. I will build it in this order and at this quality; the
schedule is yours to set. What should not happen is milestone 10 shipping first
because it is the easiest — a questionnaire wearing the platform's branding is
the outcome section 107 explicitly prohibits.

---

## K. Acceptance Criteria

Every milestone is measured against section 110's definition of done — UI, API,
database, permissions, validation, error handling, audit events, tests,
security, documentation — plus the following, which are specific and testable.

**M1 Foundation.** `docker compose up` yields a working stack. Migrations run
forward and back. A request without a tenant context is rejected. Logs are
structured JSON with a correlation ID.

**M2 Authentication and tenancy.** MFA cannot be skipped. An automated test
authenticates as tenant A and attempts to read every tenant-owned table for
tenant B; all attempts return empty or 403, and the test fails the build if any
returns data. Role changes are audit-logged.

**M3 Assessment workflow.** An assessment cannot leave `awaiting_authorisation`
without a complete authorisation record. Every status transition is legal per
the state machine and audit-logged. Progress reflects real job state.

**M4 Evidence and rules.** A finding cannot be inserted without evidence — the
constraint is proven by a test that tries. Re-running rules over stored evidence
produces byte-identical findings. A new rule version leaves prior assessments
unchanged. Coverage is computed and displayed separately from the score.

**M5 Microsoft connector.** Admin consent completes against a real tenant. No
`.ReadWrite.` scope appears in the manifest — asserted in CI. No token appears
in any log at any level. Preflight reports missing permissions before collection
starts. A 429 storm delays but does not fail collection.

**M6 Microsoft assessment.** Every rule cites evidence a consultant can trace to
a Graph response. A missing licence yields `not_applicable`, never a pass or a
fail. Findings match manual review of a test tenant.

**M7 AI explanation.** Output referencing an unknown finding ID is rejected —
proven by a test that injects one. No customer identifier reaches a provider,
proven by an outbound payload assertion. A provider outage degrades to templates
and still produces a report.

**M8 Reporting.** The PDF renders correctly with 0 findings, 1 finding, and 500
findings. Every claim in the report traces to a finding. The disclaimer required
by section 94 is present. Reports are versioned and immutable.

**M9 Cyvrix admin.** A consultant can edit an AI recommendation; the edit is
attributed and audited. Staff access to tenant data is logged per access.

**M10 Free IT Health Check.** A customer completes it from the public site
without contacting anyone. Questionnaire answers are marked as a distinct,
lower-confidence evidence source than collected evidence.

**M11 Hardening.** External penetration test with no unresolved high or critical
findings. 50 concurrent assessments within performance targets. Restore from
backup rehearsed and timed.

---

## L. Open Questions

Four, and only these. Everything else is answerable from the specification.

**1. Data residency.** Customers are UK organisations and several will be in
regulated sectors. Is UK-only residency a requirement for evidence at rest? It
determines the Azure region, the S3 equivalent, and — critically — which AI
providers are usable, since not all offer a UK or EU processing guarantee. This
changes infrastructure and cannot be retrofitted cheaply.

**2. Microsoft Partner status.** A multi-tenant Entra application that requests
tenant-wide admin consent will be scrutinised by exactly the customers most
worth having. Publisher verification requires a Microsoft Partner Center
account. Does Cyvrix hold one, or should milestone 5 include obtaining it? An
unverified publisher on the consent screen will lose deals.

**3. Report liability position.** Section 94 requires a disclaimer. The wording
is a commercial and legal decision, not an engineering one, and it needs to be
settled before the first report leaves the building. Related: professional
indemnity cover for delivering security assessments.

**4. The Free IT Health Check's honest boundary.** The specification places it
in the first release alongside the Microsoft assessment. Without a connector it
is a questionnaire, and section 107 prohibits shipping a questionnaire as a
platform. Should the free check require a Microsoft connection to run — making
it genuinely evidence-based but narrowing who can take it — or run
questionnaire-only with its lower confidence stated plainly on the report? I
recommend the former, and will implement the latter if you prefer, but the
choice should be deliberate.

---

## What happens next

Nothing is built until this is agreed. On approval: create
`cyvrix-assessment-engine`, then implement milestone 1.

Changes to the requirements after agreement go through an ADR in `docs/adr/`,
per specification section 106 — problem, existing requirement, proposed change,
reason, and the security, data and migration implications. Not a quiet edit.
