# Security Requirements

Status: proposed. Analysis of *what could go wrong* is in
[THREAT_MODEL.md](THREAT_MODEL.md); this is the list of controls and how each is
verified. A control with no verification method is an intention, so every row
below names one.

---

## Identity and access

| Control | Verification |
| --- | --- |
| TOTP MFA mandatory for every account, no opt-out | Test asserts a session without MFA cannot reach any tenant route |
| Passwords hashed with scrypt, per-user salt | Unit test on the hashing module |
| Account lockout with exponential backoff | Integration test drives repeated failures |
| Sessions httpOnly, Secure, SameSite=Lax, short idle timeout | Response header assertion in CI |
| Active session listing and revocation | Manual acceptance at M2 |
| RBAC across the six roles | Matrix test: every role against every endpoint |
| Privilege change audited | Audit assertion in the RBAC test |

MFA is not configurable. An assessment platform holding read credentials into
customer tenants cannot offer an account without a second factor, and the
implementation is the RFC 6238 code already proven in `cyvrix-main/lib/totp.ts`
— including the replay guard that rejects a counter already used.

## Tenant isolation

| Control | Verification |
| --- | --- |
| `organisation_id` resolved only from the verified token | Lint rule + test that a body-supplied id is a 400 |
| RLS with `FORCE` on every tenant-owned table | Migration test enumerates tables and asserts policy presence |
| `SET LOCAL` inside an explicit transaction | Code review + a test asserting context does not survive a transaction |
| No Prisma access outside `packages/db` | CI rule, fails the build |
| Object keys prefixed per organisation; pre-signed per object | Test attempts a sibling key with a valid signature |
| The cross-tenant suite | Runs on every commit; any returned row fails the build |

## Cryptography

| Control | Verification |
| --- | --- |
| TLS 1.3, HSTS with preload | External scan at M11 |
| AES-256-GCM for stored secrets, envelope-encrypted | Unit tests on seal/unseal, tamper detection |
| Per-organisation data keys | Test asserts one organisation's key cannot unseal another's token |
| Key rotation without token re-encryption | Rehearsed at M5 |
| No plaintext secret persisted or logged | Log-capture test asserting a known token value never appears |

Envelope encryption follows the pattern already running in
`cyvrix-main/lib/secret-box.ts`: AES-256-GCM with HKDF key separation, so the
key used for one purpose cannot decrypt another's ciphertext even given the same
master material.

## Input and output

| Control | Verification |
| --- | --- |
| Zod validation at every boundary, reject-unknown | Contract tests from the OpenAPI schema |
| Parameterised queries only; no raw SQL interpolation | Static analysis in CI |
| SSRF deny-list: private, loopback, link-local, cloud metadata; no redirect following | Unit tests per range, including `169.254.169.254` |
| Output encoded; CSP without `unsafe-inline` | Header assertion + CSP report-only in staging first |
| Uploads: type, size, content sniffing, stored outside the web root | Upload test with a mislabelled file |
| Rate limits per organisation and per IP | Load test at M11 |

## Logging

Never logged, at any level: OAuth secrets, passwords, API tokens, private keys,
session identifiers, recovery codes, or full evidence payloads.

Enforced by a redacting serialiser with a deny-list, plus a test that runs a
representative request set with a known sentinel token value and asserts it does
not appear in captured output. A deny-list nobody tests is a deny-list that
already has a gap in it.

`AuditLog` records actor, action, target, organisation, IP, user agent,
timestamp, and before/after state where lawful to retain. Append-only, with no
API delete path. Staff access to tenant data is logged per access — not per
session — so "who looked at this customer's findings" has an answer.

## Operational

| Control | Notes |
| --- | --- |
| Secrets in Azure Key Vault, never in environment files in production | Startup configuration validation refuses to boot on a missing or placeholder value |
| Container images pinned by digest, scanned, minimal base | CI gate |
| Dependency scanning with a documented time-to-patch | Weekly; critical within 48 hours |
| Backups encrypted, restore rehearsed and timed | Quarterly, recorded |
| Production migrations: backup, validate on a restored copy, confirm rollback | Standing rule, no exceptions |
| No irreversible production change without explicit confirmation | Standing rule |

## Build-time checks

The application security scanner already running in `cyvrix-main`
(`scripts/analyse-appsec.mts`, eighteen checks) carries across and gains:

- a permission-manifest check that fails on any `.ReadWrite.` scope;
- a tenancy check that fails on Prisma access outside `packages/db`;
- a secrets check that fails on a plausible credential in source;
- the cross-tenant suite, which is a test rather than a scan but gates the same
  pipeline.

The reason these are build gates rather than review items is that all four
describe mistakes that are easy to make, invisible in a diff, and severe.

## What is deliberately not claimed

Following the standing rule for this organisation: the platform will not claim
certification it does not hold. It is built against Cyber Essentials, the NCSC
10 Steps and ISO 27001 Annex A as **design references**. Cyvrix holds none of
those certifications, the platform is not certified, and no page, report or
schema will say otherwise until an awarding body says it first.
