# Database Design

Status: proposed. PostgreSQL 16, Prisma, one database, Row Level Security on
every tenant-owned table.

---

## The two rules everything else follows from

**1. Every tenant-owned table has a non-null `organisation_id`.**

Not "most". Not "where it makes sense". A table without it cannot be protected
by RLS, and the exceptions are where cross-tenant leaks are born. The only
tables without one are genuinely global: `Rule`, `RuleVersion`, `Framework`,
`FrameworkControl`, `RuleFrameworkMapping`, `AssessmentTemplate`,
`SystemSetting`, and `User` — which is an identity, not a tenant asset, and
reaches organisations only through `OrganisationMember`.

**2. Evidence is append-only.**

Collectors insert. Nothing updates or deletes evidence within an assessment's
retention window. Re-collection creates a new `CollectionJob` and a new
generation of rows. A finding raised in March must still be explicable in
September, from the same evidence, by the same rule version.

---

## Row Level Security

```sql
ALTER TABLE assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON assessment
  USING (organisation_id = current_setting('app.organisation_id', true)::uuid);
```

`FORCE` matters: without it the table owner bypasses its own policy, and the
migration role is usually the owner.

The setting is applied per transaction:

```sql
BEGIN;
SET LOCAL app.organisation_id = '...';
-- queries
COMMIT;
```

**`SET LOCAL`, never `SET`.** Under a transaction-mode connection pooler a plain
`SET` persists on the pooled backend after the transaction ends, and the next
borrower of that connection inherits it. That is a cross-tenant read waiting to
happen, and it would look like a data bug rather than a security one. `SET LOCAL`
is reverted at commit or rollback.

Consequence: **every query runs inside an explicit transaction**, including
single-statement reads. `TenantContext` in `packages/db` is the only thing that
opens one, and the CI rule that forbids `prisma.` outside `packages/db` is what
keeps it that way.

The second missing-setting hazard: `current_setting('app.organisation_id', true)`
returns NULL when unset, and `organisation_id = NULL` is NULL, so the policy
denies rather than admits. Fail-closed by construction. The `true` argument is
required — without it, an unset variable raises instead of returning NULL, which
turns a denial into a 500.

---

## Entities

### Identity and tenancy

| Table | Notes |
| --- | --- |
| `User` | Global identity. Email, password hash (scrypt), TOTP secret (sealed), recovery codes (hashed). Not tenant-owned |
| `Organisation` | The tenant. Name, primary domain, country, retention policy, status |
| `OrganisationMember` | The authorisation record. `(user_id, organisation_id, role)`, unique. Deleting this removes all access |
| `Role` | `owner`, `administrator`, `executive`, `auditor`, plus Cyvrix-side `super_admin`, `consultant` |
| `Invitation` | Hashed token, target email, role, expiry, single use |

A user may belong to several organisations. The token names exactly one per
request; switching organisations mints a new token rather than widening one.

### Assessment

| Table | Notes |
| --- | --- |
| `AssessmentTemplate` | Global. The five catalogue entries: which domains, rules, connectors and questionnaire apply |
| `Assessment` | One run. Status, template, template version, started/completed timestamps |
| `AssessmentScope` | Domain, employee count, offices, tenant ID, cloud accounts, IP ranges, endpoint count |
| `AssessmentAuthorisation` | **Immutable.** Named person, timestamp, source IP, ranges, domains, acknowledgement, terms version. A legal artefact |

`AssessmentAuthorisation` has no update path in the API and a trigger that
raises on `UPDATE` or `DELETE`. Correcting a mistake means a new authorisation,
which is the correct real-world behaviour too.

### Connectors and collection

| Table | Notes |
| --- | --- |
| `Connector` | Type, status, connected-by, scopes granted, last successful collection |
| `ConnectorCredential` | **Ciphertext only.** Sealed token, wrapped data key, key version, algorithm, expiry |
| `Collector` | Global registry. Which evidence types it produces, permissions and licences it needs |
| `CollectionJob` | Per assessment per collector. Status, attempts, timings, error class, evidence count |
| `Evidence` | Below |
| `Agent` | Enrolled network agent. Certificate fingerprint, version, scope, last seen |
| `AgentHeartbeat` | Time series. Health, version, job counts |

`ConnectorCredential` holds no plaintext under any circumstance. It is excluded
from logical backups that leave the production boundary, and the columns are
excluded from every default Prisma select via a dedicated repository.

### Evidence

```
Evidence
  evidence_id           uuid pk
  organisation_id       uuid not null          -- RLS
  assessment_id         uuid not null
  collection_job_id     uuid not null
  source                text     -- 'microsoft_graph', 'agent', 'questionnaire'
  connector             text
  resource_type         text     -- 'user', 'conditional_access_policy', 'device'
  resource_id           text     -- provider identifier
  property              text     -- 'mfa_registered', 'external_sharing'
  observed_value        jsonb
  raw_reference         text     -- S3 key; the full provider payload
  collected_at          timestamptz
  collector_version     text
  confidence            text     -- 'observed', 'derived', 'asserted'
  sensitivity           text     -- 'public', 'internal', 'confidential'
```

`confidence` is what keeps a questionnaire answer from carrying the weight of a
Graph response. `observed` is a direct API reading. `derived` is computed from
observations. `asserted` is a human's claim. Reports state which, and scoring
weights them differently.

Index: `(organisation_id, assessment_id, resource_type, property)` — the shape
rules query by.

### Rules and findings

| Table | Notes |
| --- | --- |
| `Rule` | Global. Stable identity and category |
| `RuleVersion` | Global. Condition, severity, weight, recommendation template, prerequisites. Immutable once published |
| `RuleResult` | Per assessment per rule version. `pass`, `fail`, `not_applicable`, `error`, with the reason |
| `Finding` | Created from a failing `RuleResult`. Full model per specification section 25 |
| `FindingEvidence` | Join. **At least one row required per finding** |
| `Framework` / `FrameworkControl` / `RuleFrameworkMapping` | Global. Cyber Essentials, NCSC 10 Steps, ISO 27001 Annex A, NIST CSF |

The evidence constraint is enforced, not documented:

```sql
CREATE CONSTRAINT TRIGGER finding_requires_evidence
  AFTER INSERT ON finding
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_finding_has_evidence();
```

Deferred, so a finding and its evidence links can be inserted in one
transaction; checked at commit, so neither can be committed alone.

`not_applicable` is a first-class result. A Defender rule on a tenant without
the licence is not a pass and not a fail — it was not inspected. Recording it as
either would be a fabricated claim, and it would move the score.

### Assets

`Asset` is the shared spine — `organisation_id`, type, name, first and last
seen, criticality — with `NetworkDevice`, `Endpoint` and `CloudResource` holding
type-specific columns. Assets persist across assessments so posture can be
tracked over time; evidence does not.

### Scoring, reporting, remediation

| Table | Notes |
| --- | --- |
| `Score` | Per assessment. Domain scores, overall, coverage, weights and thresholds used |
| `ScoreHistory` | Per organisation over time. Feeds the trend line |
| `Report` / `ReportVersion` | Immutable versions. Content snapshot, PDF object key, generator version |
| `RemediationRequest` / `RemediationTask` | Customer asks; tasks track progress and verification |
| `ConsultantNote` | Cyvrix-side annotations, attributed |

`Score` stores the weights and thresholds it used. They are configurable per
specification section 27, and a score computed under different weights is not
comparable to one computed under today's — storing them makes historical scores
interpretable instead of merely numeric.

### Platform

`AuditLog` (append-only; actor, action, target, tenant, IP, user agent, before
and after where lawful), `Notification`, `Subscription`, `InvoiceReference`,
`SystemSetting`, `AIInteractionMetadata` (model, version, tokens, latency, cost,
finding IDs referenced — never the prompt body).

---

## Migrations

Forward-only in production. Every migration has a rehearsed rollback, taken as
a restore point rather than a down-script, because a down-script that drops a
column destroys data a rollback was supposed to protect.

Before any production migration, per the standing instruction in this
organisation: backup, validate against a restored copy, and confirm the rollback
path. Not one of those three is optional.

Destructive changes are two-phase — add the new column, backfill, switch reads,
switch writes, drop the old column in a later release — so that a rollback at
any point lands on a schema the running code understands.
