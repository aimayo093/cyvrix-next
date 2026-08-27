# Cyvrix Assessment Engine — design record

**Status: proposed. Nothing has been built.**

Specification section 105 requires architecture before implementation, and
section 114 requires a first response covering A–L before any code. These are
those documents.

They live in `cyvrix-main` because the platform's repository does not exist
yet. On approval they move to `cyvrix-assessment-engine`, which is a separate
repository for the reasons given in `ARCHITECTURE.md` §A — a marketing site
whose administrators edit page copy should not share a blast radius with a
system holding read credentials into customer Microsoft tenants.

## The documents

| | Covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Start here.** Sections A–L in full: architecture, repository, database, tenancy, engine, Microsoft, agent, AI, security, roadmap, acceptance criteria, open questions |
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | The requirement register, and what is deliberately excluded |
| [DATABASE.md](DATABASE.md) | Entities, RLS, the append-only evidence model |
| [SECURITY.md](SECURITY.md) | Controls, each with a named verification method |
| [THREAT_MODEL.md](THREAT_MODEL.md) | STRIDE across five trust boundaries |
| [API.md](API.md) | REST surface, error shape, rate limits |
| [CONNECTORS.md](CONNECTORS.md) | Collector architecture, Microsoft permissions and consent |
| [RULE_ENGINE.md](RULE_ENGINE.md) | Rule shape, a worked example, the first pack, scoring |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Eleven milestones and why they are in that order |
| [TESTING.md](TESTING.md) | Test strategy, led by the cross-tenant suite |

The canonical requirement is
[`docs/product/product-specification.md`](../product/product-specification.md) —
all 116 sections, unmodified. Where these documents and it disagree, it wins.

## Four things worth knowing before reading

**The decide phase is deterministic and happens before AI.** Rules produce
findings from stored evidence. AI explains them afterwards and can create
nothing. This is enforced by a database constraint and an output validator, not
by a prompt.

**Coverage is scored separately from security.** A customer who connects only
Microsoft 365 gets an honest score for what was seen and a coverage figure
saying how much that was. One number would overstate confidence.

**`not_applicable` is never a pass.** A control that could not be inspected —
absent licence, absent evidence — is recorded as uninspected, with the reason,
and excluded from the score.

**Milestone 10 is the Free IT Health Check, and it is late on purpose.** It is
the easiest milestone and the one most tempting to ship first. Shipping it first
produces a questionnaire wearing the platform's branding, which specification
section 107 prohibits.

## Four open questions

Answers needed before or during the milestones they block: UK data residency,
Microsoft Partner Center publisher verification, report liability wording and
indemnity cover, and whether the free health check requires a connector.
`ARCHITECTURE.md` §L has the detail.

## Next step

Review and agree. On approval: create `cyvrix-assessment-engine`, implement
milestone 1. After agreement, requirement changes go through an ADR in
`docs/adr/` per specification section 106 — not a quiet edit.
