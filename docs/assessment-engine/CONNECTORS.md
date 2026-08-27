# Connectors

Status: proposed. Microsoft 365 is milestone 5; the rest follow the same shape.

A connector is the boundary between the platform and a customer's production
environment. It is the component a customer's own security team will ask about
first, and it should be describable to them in one page.

---

## Rules every connector obeys

**Read-only.** No connector requests a write scope. Specification section 2 says
write access must not be required to perform an assessment, and the permission
manifest is the evidence — asserted in CI, so a `.ReadWrite.` scope fails the
build rather than shipping.

**Least privilege, per assessment type.** A Free IT Health Check does not need
Defender permissions. Scopes are requested for the assessment being run, not for
everything the platform might one day do.

**Collectors do not judge.** A collector emits observations. "MFA is not
registered for this account" is an observation. "This tenant is insecure" is a
rule's conclusion. Keeping judgement out of collection is what makes findings
reproducible from stored evidence.

**Plaintext credentials are never persisted.** Sealed at rest, decrypted only
inside a collector process, for the duration of one call.

**Failure is partial, never silent.** A collector that cannot run records why.
The assessment continues, completes as `partially_completed`, and the coverage
score reflects what was missed.

---

## Collector interface

```ts
interface Collector {
  id: string;                          // "m365.entra.users"
  connector: ConnectorType;
  version: string;                     // recorded on every evidence row
  requiredPermissions: string[];
  prerequisites?: string[];            // licences: "AAD_PREMIUM_P2"
  produces: EvidenceDescriptor[];      // resourceType + property pairs

  preflight(ctx: ConnectorContext): Promise<PreflightResult>;
  collect(ctx: ConnectorContext): AsyncIterable<Evidence>;
}
```

`produces` is what lets the rule engine know, before collection, which rules can
possibly run — and lets preflight tell a customer what they will and will not
get before anything starts.

`collect` returns an async iterable rather than an array. A large tenant's user
list does not belong in memory, and streaming means evidence lands in the
database progressively so a timeout does not discard an hour of work.

---

## Microsoft 365

### Consent

Multi-tenant Entra application, **admin consent** flow.

```
  Customer clicks Connect
        │
        ▼
  Redirect to login.microsoftonline.com/{tenant}/adminconsent
  with client_id, redirect_uri, state (signed, single-use, 10 min)
        │
        ▼
  Global Administrator reviews the exact permission list on Microsoft's page
        │
        ▼
  Redirect back with tenant id + admin_consent=True
        │
        ▼
  Platform acquires a token via client credentials for that tenant
  Seals the refresh material, stores ciphertext, records granted scopes
        │
        ▼
  Preflight runs immediately and reports what it can and cannot see
```

Delegated consent is deliberately not offered for this connector. An assessment
scoped to whichever administrator happened to sign in produces findings that
depend on who clicked, and the customer has no way to know that from the report.

`state` is signed and single-use, which closes the CSRF path where an attacker
tricks an administrator into consenting into the attacker's organisation.

### Permissions

All read-only. Listed in full in `ARCHITECTURE.md` §F; the shape is
`Directory.Read.All`, `RoleManagement.Read.Directory`, `Policy.Read.All`,
`UserAuthenticationMethod.Read.All`, `Application.Read.All`, the two Intune
read scopes, `Sites.Read.All`, `Exchange.ManageAsApp` with the **Global Reader**
directory role, `SecurityEvents.Read.All`, `Reports.Read.All`,
`AuditLog.Read.All`.

`Exchange.ManageAsApp` is the one that looks alarming and is not: Exchange
Online's management API has no read-only application permission, so the read
constraint is enforced by the directory role attached to the service principal.
Global Reader can read everything in Exchange and change nothing. This is worth
explaining to a customer before they ask, not after.

### Collectors

| Collector | Evidence |
| --- | --- |
| `m365.entra.users` | Accounts, licence state, last sign-in, guest flag, dormancy |
| `m365.entra.roles` | Privileged role assignments, eligible vs active |
| `m365.entra.authmethods` | Registered strong authentication methods per account |
| `m365.entra.conditionalaccess` | Policies, state, conditions, grant controls |
| `m365.entra.applications` | Service principals, consented permissions, credentials and their expiry |
| `m365.exchange.config` | Accepted domains, DKIM, transport rules, external forwarding |
| `m365.exchange.protection` | Anti-spam, anti-phishing, outbound spam policy |
| `m365.intune.devices` | Managed devices, compliance, encryption, OS version, patch state |
| `m365.sharepoint.sharing` | Tenant and site sharing settings, anonymous link policy |
| `m365.defender.posture` | Secure Score, recommendations, exposure — where licensed |

Each declares its permissions and prerequisites, so preflight can report
"Defender data unavailable: Entra ID P2 not present in this tenant" before the
customer waits for a collection that was never going to produce it.

### Throttling

Graph returns 429 with `Retry-After`. The collector kit honours the header
exactly, applies jittered exponential backoff, and caps concurrency per tenant.
A throttled collection is slow, not failed. Ignoring `Retry-After` and retrying
aggressively risks the customer's own tenant being throttled for their users,
which would make the assessment the incident.

### Revocation

Disconnecting revokes the grant at Microsoft **and** destroys the stored
ciphertext. Evidence already collected is retained under the organisation's
retention policy; the ability to collect more ends immediately. A customer
withdrawing consent should not have to trust that the platform stopped — the
credential no longer exists.

---

## Azure, AWS, Google Cloud

Later milestones, same shape, read-only throughout.

| Provider | Authentication | Baseline role |
| --- | --- | --- |
| Azure | Workload identity federation, no stored secret | `Reader` + `Security Reader` at subscription scope |
| AWS | Cross-account role assumption with an external ID | `SecurityAudit` + `ViewOnlyAccess` |
| Google Cloud | Workload identity federation | `roles/viewer` + `roles/iam.securityReviewer` |

Federated identity is preferred to stored keys everywhere it is available — a
credential that does not exist cannot be stolen. The AWS external ID is not
decoration: without it, a role trusting the platform's account is vulnerable to
the confused-deputy problem across every other customer of the platform.

---

## Network agent

Covered in `ARCHITECTURE.md` §G and `THREAT_MODEL.md` T3. In summary: outbound
only, mTLS with per-agent short-lived certificates, signed job envelopes,
agent-side scope re-verification, credentials held in the host OS credential
store, discovery only, local plain-text audit log, signed releases.

Vendor support is a plugin architecture — Cisco, Fortinet, Aruba, Ubiquiti,
HP/HPE, Dell, Juniper, Sophos, Palo Alto, WatchGuard, Meraki — each a module
declaring the protocols it uses and the evidence it produces.

---

## Questionnaire as a source

Where no connector can reach — physical security, backup testing practice,
incident response rehearsal — the customer answers questions. These become
evidence with `confidence: "asserted"`, and both the dashboard and the report
distinguish them from `observed` evidence.

This is the boundary specification section 107 draws. A questionnaire is a
legitimate evidence source for things that cannot be measured remotely. It is
not a substitute for measuring the things that can be.

---

## Mocks

Per specification section 109, mocks are acceptable during development and must
be labelled. Every connector ships a fixture-backed mock behind an environment
flag — `MOCK_MICROSOFT_GRAPH=true` — and:

- the flag is refused in production configuration validation, at startup;
- an assessment run against a mock is marked in the database and on every
  report page, in text, not only in metadata.

A demo that cannot be mistaken for a real assessment is the requirement. A
report that says "sample data" on the page cannot be forwarded to a board as
though it were real.
