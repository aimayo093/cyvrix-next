# 04. Backlog, costs, testing and rollback

## 1. Implementation backlog

Each phase is its own branch and pull request. Each needs founder approval to
start and to merge. Migrations are dry-run on production inside a rolled-back
transaction, then applied through the Supabase MCP after approval (the existing
practice).

### Phase 1: Foundation (no external integration, no spend)

| ID | Item | Done when |
| --- | --- | --- |
| P1-1 | Migration: `Organisation`, `OpportunitySource`, `IngestionRun`, `ProcurementNotice`, `Opportunity`, `OpportunityEvidence`, `CompanyFact`, `CompanyDocument(+Version)`, `Package(+Item)`, `ApprovalRequest`, `ApprovalDecision`, `ExecutionRecord`, `Receipt`, `CostEntry`; `Contact.organisationId`; additive only | Applies cleanly and re-applies safely on a local database; dry-run on production (done) |
| P1-2 | `lib/procurement/lifecycle.ts`: both state machines as data, checked by `checkTransition()`; `transitionOpportunity()` (service) moves with compare-and-set and an audit entry | Unit tests cover each gate type (person, founder, approval, executed, evidence) and agent limits on both machines, refuse skipped and cross-machine moves, and check every state is reachable. A table-driven test of every single edge is a Phase 2 item |
| P1-3 | Private bucket + upload with scan + signed URLs (D5) | Upload of an EICAR test file refused; signed URL expires |
| P1-4 | Seed the 52 organisations from §32 (names, categories, priority; no claims, no contacts) | 52 rows; founder can add, remove, re-prioritise |
| P1-5 | Approval core: request, decision with step-up TOTP, manifest hashing, expiry, single use | Tests 17–20 below pass |
| P1-6 | Admin: Opportunities list and detail, Organisations, Documents, Approval Centre (DESIGN.md components) | Founder can create, move and approve on fixtures |
| P1-7 | `ADMIN_GUIDE.md`, `DECISIONS.md` §20 "Procurement", this folder updated to as-built | Docs match the code |

### Phase 2: Lead integration

Carried over from the PR 14 review (not blocking Phase 1):
- a database trigger that sets `Opportunity.statusChangedAt` whenever `status` changes, so a direct database write cannot leave a stale submission round (needs a migration);
- table-driven tests over every lifecycle edge, allowed and refused.

| ID | Item |
| --- | --- |
| P2-1 | Find a Tender adapter (cursor, `updatedFrom`, `Retry-After`, raw store, contact-point split) |
| P2-2 | Sell2Wales adapter (API with monthly OCDS download fallback, health flag) |
| P2-3 | Public Contracts Scotland and Contracts Finder adapters |
| P2-4 | Cron handler with London-time gate, per-source lock, dead-letter status, zero-result alert |
| P2-5 | ChatGPT import page (paste or upload) → parser → review screen → opportunities with `origin = chatgpt_task` (D1-A) |
| P2-6 | Optional: Inbox rule for the forwarded ChatGPT email (D1-B, after the founder's check) |
| P2-7 | Procurement agent API (redacted) + token + Security Center check + `docs/paperclip-skill.md` section |
| P2-8 | Dedupe: ocid match, cross-source candidates for review |
| P2-9 | Import existing CCO tender scans and the CYV-14 packs (after a personal-data check) |
| P2-10 | Privacy wording PR (D12) and DPIA record |

### Phase 3: Supplier registration and partnerships (built 18 November 2026, except where noted)

Built: the portal and account registry, one live account per portal, the D13 standing policy, confirmed registrations becoming account records, partnership programmes, and the bid and partnership scoring (both scoring models, since the opportunity page needs one either way). Not yet: the registration pack builder and a separate Partnerships dashboard; `PartnershipApplication` is covered by a partnership opportunity and its lifecycle.


Includes:
- `SupplierPortal` and `SupplierAccount` registry;
- account reconciliation (§38) from the founder's list (D3);
- registration pack builder from `CompanyFact` and approved documents;
- `PartnershipProgramme`, `PartnershipApplication` and the §43 lifecycle;
- partnership scoring (§40);
- the Partnerships dashboard (§46).

### Phase 4: Tender intelligence

Includes:
- document retrieval for public attachments only (allow-listed hosts);
- requirements extraction by agents with source references and a review queue;
- configurable bid/no-bid weights (§12) with disqualifiers;
- deadline and clarification monitoring.

### Phase 5: Document generation

Includes:
- `AgentDraft` kinds for tender answers and documents;
- versioned working copies (never overwrite originals);
- a compliance matrix;
- pricing from approved rate inputs only, after the CTO's pricing fixes (CYV-24 inputs);
- automatic quality checks.

### Phase 6: Approval controls (complete)

Includes:
- Approval Centre polish;
- invalidation on any change;
- notification escalation;
- approval reporting.

### Phase 7: Submission gateway

Includes:
- manual and human-assisted modes: package download, a checklist, and receipt
  upload with reference;
- clarification and award monitoring via the official feeds (award stage);
- portal automation only per D8-B.

### Phases 8–9

Includes:
- end-to-end runs on fixtures and a mock portal;
- security review (`npm run scan:code`, `test:appsec`);
- cost review;
- staged rollout behind a `PROCUREMENT_ENABLED` flag.

## 2. Costs against the proposed £30/month

The £30/month is a proposal in the spec. It is **not** authorised spend. Figures
below are only those that can be stated without guessing.

| Item | Incremental cost | Basis |
| --- | --- | --- |
| Find a Tender, Contracts Finder, PCS, Sell2Wales data | £0 | Public, OGL / free access as documented |
| Vercel (crons, routes) | Expected £0 within the current plan | A few short invocations a day. **Plan and its cron limits to be checked** before P2-4 |
| Supabase (tables, a private bucket with low volume) | Expected £0 within the current plan | Documents measured in MB. **Plan storage quota to be checked** |
| Paperclip | £0 | Self-hosted, existing |
| DeepSeek (agent research and drafting) | Inside the existing caps ($15 per agent policy, $50 company, hard stop) | Usage-based; the prepaid balance is the real cap (implementation record). Measure for two weeks in Phase 2 before proposing a figure |
| OpenAI API research pipeline (D1-C) | Not proposed | Would be the first real use of the £30; needs its own estimate and approval |
| Paid tender aggregators | Not proposed | Duplicate the free OGL data |
| Playwright (Phase 7) | £0 licence | Open source; runs locally |
| Portal registrations | £0 for public portals examined (DSP stated no charge; others to verify) | Manufacturer programmes may charge; each is a D-decision |

**Recommendation (D11-A):** Phases 1–2 at no incremental spend. `CostEntry`
records DeepSeek usage per agent from Paperclip's own spend figures, posted
weekly. The admin Today view shows month-to-date against a configurable
£30 warning line, with an 80% warning. Nothing is purchased without a decision.

## 3. Test strategy

Existing tests are `tsx` scripts (`npm run test:*`). Built so far:
- `npm run test:procurement`: lifecycles, reachability, manifests, approval
  and execution rules, evidence rules, withheld facts and London deadlines
  (no database).
- `npm run test:procurement-db`: the service and the database guards, against a
  throwaway local Postgres. It uses `scripts/fixtures/procurement/stub-schema.sql`
  plus the three procurement migrations, and refuses any non-local URL. The
  stub has no audit hash-chain triggers; the chain is checked by the Security
  Center's `audit_log_verify()` on the real database.

Planned with Phase 2 and later: `test:procurement-ingest` and
`test:procurement-api`, with fixtures for recorded OCDS packages from each
source, a synthetic ChatGPT report and a mock portal. Rows in the table below
for later phases describe those future tests.

Every phase also runs `tsc`, `npm run lint` on changed files,
`npm run check:claims`, `npm run build` and `test:routes`.

| Spec §25 / §51 criterion | Test |
| --- | --- |
| 1–3 ingestion and coverage | Synthetic report with commercial, government and defence sections → all preserved with `origin`; FTS fixture → notices and opportunities |
| 4 dedupe | Same ocid from FTS and S2W → one opportunity, two evidence rows |
| 5 attribution | Every opportunity has ≥1 evidence row; refused without one |
| 6–10 registration | Requirement flag; existing account reused; pack excludes certification answers; mock-portal account only; MFA path returns "human needed" |
| 11–14 tender intelligence | Requirements keep source references; disqualifier overrides score |
| 15–16 documents, pricing | Claims finding blocks approval; price without approved inputs refused |
| 17–21 approval and submission | Approve → change one file → execution refused; approval reused → refused; second confirmed submission → refused; no receipt → stays `Submitting` |
| 22 CRM sync | Paperclip proposal appears in admin; agent cannot set gated states (403) |
| 23 isolation | Agent API responses contain no email, phone or contact name (scan of every fixture response) |
| 24 recovery | Source 503 with `Retry-After` → run marked retry, cursor unchanged; parse error → dead letter |
| 25 audit | Every transition and decision present; `audit_log_verify()` passes after the suite |
| 26 scheduling | London-time gate correct across both DST changes |
| 27 budget | 80% warning raised at threshold |
| 28 dashboard | Route smoke test, plus a browser check of each new admin page |
| §51.1 | 52 organisations seeded |

No test creates a real external account or submits anything (spec §25).

## 4. Rollback and recovery

- **Additive migrations only.** No column on an existing table is dropped or
  retyped. No down-scripts are shipped. Database rollback is not an automatic
  step: the new tables can stay, unused, after a code rollback. Removing them
  would be a separately reviewed change, because the audit log refers to their
  rows.
- **Feature flag (planned, Phase 8–9).** `PROCUREMENT_ENABLED` would hide the
  admin pages, make the procurement API answer 404 and stop the cron route. No
  code reads it yet. Until then, the off switch is a code rollback.
- **Token kill switch (planned, Phase 2).** Once the procurement agent API
  exists, unsetting `PAPERCLIP_PROCUREMENT_TOKEN` (and redeploying) turns off
  agent access, as the existing tokens do.
- **Code.** Each phase is one PR; revert the merge commit and redeploy. Vercel's
  instant rollback to the previous production deployment is the fast path.
- **Data.**
  - Raw notices are immutable, so a bad parse can be re-run from them.
  - Opportunities created by a bad run carry the `IngestionRun` ID and can be
    archived by run. Never deleted, because history is audited.
- **Audit chain.** Never rolled back. Rollback actions are themselves logged.
- **Paperclip.** No agent or permission changes in Phases 0–1. Creating 13, 14
  and 12 later is reversible by pausing or terminating. Instruction bundles are
  versioned in `paperclip-platform/agents/cyvrix`.
- **Ambiguous submission.** Stop, mark `ambiguous`, notify the founder. The
  founder checks the portal and records the true outcome. Nothing retries
  automatically.
