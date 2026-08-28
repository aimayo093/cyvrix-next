# Cyvrix Assessment Engine

The assessment platform is **not built in this repository**. It lives in
`cyvrix-assessment-engine`, alongside this one on disk.

## Why it is separate

`ARCHITECTURE.md` §A in that repository gives the full reasoning. In short: this
is a marketing site whose administrators edit page copy, and that is a system
holding read credentials into customer Microsoft tenants. Sharing a deployment
would put a CMS bug and a tenant-isolation bug in the same blast radius.

## What is in it

The design record the specification asks for — architecture, product
requirements, security, threat model, database, API, connectors, rule engine,
implementation plan and testing — plus the canonical 116-section specification
at `docs/product/product-specification.md`, and Milestone 1 of 11: the schema,
Row Level Security, the tenant context, configuration validation, structured
logging, the local stack and the build gates.

## Why this page exists instead of a copy

Those documents used to live here as well. Two copies of ten documents diverge,
and this codebase has already produced seven instances of exactly that failure —
a role list mirrored by hand, a ticket-number generator written out three times,
two status lists that disagreed with the schema. A pointer cannot drift.

## What connects the two

Specification section 87: the assessment cards on this site route to the
platform rather than to a contact form.

| Card | Destination |
| --- | --- |
| Free IT Health Check | `/assessments/it-health` |
| Microsoft 365 Security Assessment | `/assessments/microsoft-365` |
| Cybersecurity Assessment | `/assessments/cybersecurity` |
| Cloud Readiness Assessment | `/assessments/cloud-readiness` |
| Network Assessment | `/assessments/network` |

Until each assessment is genuinely deliverable, its card must not imply
otherwise. `PRODUCT.md` records that all five are currently advertised and not
yet deliverable; that stays accurate until each one is, and it is updated per
milestone rather than in advance.
