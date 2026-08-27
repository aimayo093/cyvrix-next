# Product Requirements

Status: proposed. The canonical requirement is
[`docs/product/product-specification.md`](../product/product-specification.md) —
116 sections, unmodified. This document is the working register: what must be
true, what is deliberately excluded, and where a requirement is still open.

Where this document and the specification differ, the specification wins.

---

## What the platform is

An automated technology assessment platform. A customer authorises Cyvrix to
inspect their environment, the platform collects evidence read-only, evaluates
it against deterministic rules, scores it, explains it, and produces a report
with a remediation roadmap they can act on or hand back to Cyvrix to deliver.

## What it is not

A questionnaire. Specification section 107 prohibits retreating into one, and
section 116 requires "genuine technical assessment value rather than a marketing
questionnaire". This is the requirement most likely to erode under schedule
pressure, which is why it appears twice in the specification and once here.

---

## Functional requirements

### Must, for first commercial release (section 104)

| | Requirement |
| --- | --- |
| R1 | Customer registration and organisation creation |
| R2 | Mandatory MFA on every account |
| R3 | Organisation membership, invitations, six roles |
| R4 | Assessment selection from a catalogue |
| R5 | Scope capture |
| R6 | Immutable authorisation record before any collection |
| R7 | Microsoft 365 admin-consent OAuth connection, read-only |
| R8 | Preflight validation reporting what can and cannot be collected |
| R9 | Evidence collection across Entra, Exchange, Intune, SharePoint, Defender |
| R10 | Deterministic, versioned rule evaluation |
| R11 | Findings with evidence references |
| R12 | Domain and overall scoring, with coverage scored separately |
| R13 | AI explanation, guardrailed, traceable to findings |
| R14 | Executive dashboard |
| R15 | Executive and technical PDF reports |
| R16 | Remediation roadmap by urgency |
| R17 | Remediation request routed to Cyvrix |
| R18 | Cyvrix admin portal with consultant review |
| R19 | Free IT Health Check as the public entry point |
| R20 | Audit logging of every security-relevant event |

### Must, structurally, from the outset

| | Requirement | Why now |
| --- | --- | --- |
| R21 | Multi-tenant isolation at API, database, storage, job and AI layers | Cannot be retrofitted |
| R22 | Read-only connectors only | A write scope granted once is a permission a customer has to revoke |
| R23 | Evidence before AI — no AI-originated finding | The product's credibility is the product |
| R24 | Rule versioning, historical results never recomputed | Reports are referenced months later |
| R25 | Encrypted secret storage outside ordinary tables | Section 47 |
| R26 | Provider-agnostic AI abstraction | Section 31 |
| R27 | `not_applicable` as a first-class result | Prevents fabricated passes |

### Later phases

Network discovery agent, Azure, AWS and Google Cloud connectors, continuous
assessment, alerting, compliance mapping beyond the initial four frameworks,
automated remediation, subscription billing.

---

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Security | Every control in [SECURITY.md](SECURITY.md), each with a named verification |
| Performance | Section 95 targets. **No fixed completion time is promised to a customer** |
| Availability | Assessment completion survives a worker restart; jobs are resumable |
| Accessibility | WCAG 2.2 AA, matching the standard already held on the marketing site |
| Responsive | Sections 66–67 |
| Observability | Structured logs, correlation IDs, metrics, traces across the job pipeline |
| Retention | Configurable per organisation; deletion honoured within the stated window |
| Privacy | Section 51; pseudonymisation before any data reaches an AI provider |

---

## Constraints inherited from the company

These are not specification requirements. They are standing rules for anything
Cyvrix publishes, and they apply here.

- **Never expose** API keys, secrets, database credentials, internal stack
  traces, or environment files.
- **Never claim a certification not held.** Cyvrix holds no company
  certifications. ISO 27001 is in progress and not held. Cyber Essentials is not
  held and Cyvrix is not authorised to issue it. The platform maps rules to
  these frameworks as design references and says so.
- **No fabricated monitoring data**, no invented metrics, no claim that makes
  the company appear larger than it is.
- **No irreversible production change without confirmation.** Before any
  production migration: backup, validate against a restored copy, confirm the
  rollback path.
- **Do not delete working functionality** unless it is broken, insecure,
  redundant, misleading, or replaced by something better.

---

## Open requirements

Carried from `ARCHITECTURE.md` §L. Each blocks a decision that is expensive to
reverse.

| | Question | Blocks |
| --- | --- | --- |
| Q1 | Is UK-only data residency required for evidence at rest? | Infrastructure region, and which AI providers are usable |
| Q2 | Does Cyvrix hold a Microsoft Partner Center account for publisher verification? | M5 — an unverified publisher on the consent screen loses deals |
| Q3 | What is the report's liability position and disclaimer wording? Is professional indemnity cover in place? | M8, and the first report leaving the building |
| Q4 | Does the Free IT Health Check require a Microsoft connection, or run questionnaire-only with stated lower confidence? | M10, and whether it satisfies section 107 |

Recorded rather than assumed. A requirement invented to avoid an open question
is the kind of drift section 107 exists to prevent.
