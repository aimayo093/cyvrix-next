# Procurement, tenders and partnerships: Phase 0 proposal

**Status (18 November 2026):** Phase 1 is merged (PR 14, `0162546`), deployed and checked on the live site,
including a test upload to private storage. Phase 2 (official feeds and the ChatGPT import) is built on
branch `feat/procurement-phase2`; it needs no migration. Phase 1 was built on PR 14,
with review fixes. Production has the two Phase 1 migrations
(`procurement_foundation`, `procurement_target_organisations`) and the
hardening migration (`procurement_hardening`, from `20261115130000`). Each was
dry-run on production in a rolled-back transaction, then applied after the
founder's go-ahead. The Phase 1 code was merged and deployed on 15 November (PR 14). No external
account, message or spend has been made.

**Source of truth for requirements:** the founder's specification (master
sections 1–30 plus the Strategic Partnerships extension, sections 31–52), saved
verbatim outside this repository at
`C:\dev\paperclip-platform\agents\cyvrix\PROCUREMENT-SPEC.md`. It is a founder
document. It is not loaded into any agent.

**Baseline inspected:** `origin/main` at `289528e` (production), on
14 November 2026. Branches for PRs 10 and 11 were read, not changed.

| File | What it covers (spec §28 deliverables) |
| --- | --- |
| [01-assessment.md](01-assessment.md) | Existing system, Paperclip capability and permissions, ChatGPT feasibility, procurement source matrix, supplier registration feasibility matrix |
| [02-design.md](02-design.md) | Architecture, data flows, ERD mapped to the current schema, deployment, agent and permission matrices, approval architecture, lifecycles |
| [03-security-privacy.md](03-security-privacy.md) | Threat model, security and privacy assessment |
| [04-delivery.md](04-delivery.md) | Backlog, costs against the proposed £30/month, test strategy, rollback and recovery |

---

## Report to the founder

### What I found

1. **Most of the foundation already exists.** The website has a leads CRM, an
   AI drafts approval queue, a hash-chained append-only audit log, encrypted
   secret storage (`lib/secret-box.ts`), a file scanner, two-factor sign-in,
   token-scoped Paperclip APIs and the claims checker. The plan extends these
   instead of building a second system.
2. **What is missing:** opportunity and tender records, a source registry, a
   private document store (only the public `public-media` bucket exists), a
   supplier account registry, partnership records, and an approval record that
   binds an exact document set.
3. **ChatGPT 9 am task: there is no documented way for another system to fetch
   its results.** I found no API or webhook for scheduled-task results.
   OpenAI's help page refuses automated reads, so I could not check it
   first-hand. Third-party guides say results arrive in-app and by push or email
   notification. Proposed route: a manual import page first. Then, if you
   confirm that the task's email contains the full report, the existing Inbox
   (PR 10) can ingest it from a dedicated mailbox. No scraping, and nothing is
   labelled "from ChatGPT" unless it came from that task.
4. **Official sources:** Find a Tender has a public OCDS API (cursor paging,
   date and stage filters, Open Government Licence). It is the main record
   under the Procurement Act 2023. Public Contracts Scotland has a documented
   OCDS API. Sell2Wales has OCDS downloads, but its API returned a server error
   when checked. Contracts Finder has a V2 API and now carries less. The Defence
   Sourcing Portal and eTendersNI show no public API. The first three are
   enough for Phase 2 at no cost.
5. **Supplier registration cannot be automated safely yet.** The Defence
   Sourcing Portal's own guide has you accept a user agreement and then sends a
   temporary password by email. The other portals' terms have not been
   reviewed. Accepting terms is a binding step that the spec says needs your
   approval. Recommendation: the system prepares a complete registration pack,
   you register, and the system records the account. No credentials are held
   anywhere in the system.
6. **Paperclip:** four Phase 1 agents are active (CEO, CTO, Head of
   Cybersecurity, CCO), all low-trust on DeepSeek with project boundaries. The
   Tenders (13), Partnerships (14) and Lead Generation (12) roles are specified
   but not created. Low-trust agents cannot create approvals, so the website,
   not Paperclip, must be where binding approvals live.
7. **Personal data must not reach DeepSeek.** Tender notices and ChatGPT
   reports contain named contacts. The proposed agent API redacts them, so
   agents work with organisations and roles only.

### What needs your decision before Phase 1

These are listed in full, with options, under
[Blockers and founder decisions](#blockers-and-founder-decisions) below. The six
that gate Phase 1 are **D1, D2, D3, D5, D7 and D11**.

### Recommended first step

Approve Phase 1 (foundation) as scoped in `04-delivery.md`: database tables,
server-enforced lifecycles, the source registry, a private document store and
the approval record. All of it lives inside the existing admin. There is no new
external integration and no expected spend.

---

## Blockers and founder decisions

**Blockers** are facts that stop or limit a part of the spec. **Decisions** are
yours to take. Each has a recommendation.

### Blockers found

| # | Blocker | Effect | Mitigation proposed |
| --- | --- | --- | --- |
| B1 | No documented API, webhook or export for ChatGPT scheduled-task results; OpenAI's help page refuses automated reads | Spec §2 direct integration is not available as far as can be verified | Manual import, then email ingestion if the email carries the full report (D1) |
| B2 | Spec §33 says Cyvrix delivered Getronics field-engineering assignments. `PRODUCT.md` records the 2025 Dell and Lenovo field work as **the founder's own employment, not CYVRIX contracts** | An application stating company experience could be untrue | Use the `PRODUCT.md` wording until you supply evidence (D2) |
| B3 | No record anywhere of HP or Lenovo partner accounts, a Dell application, a Hemmersbach registration or D-Source enquiries | §38 reconciliation cannot start from the system | You list each account's status (no passwords); the system records it (D3) |
| B4 | Agents run on DeepSeek; no lawful transfer basis for personal data (`DECISIONS.md` §15) | Agents cannot see named contacts, ChatGPT lead text with names, or vetting information | Redacted agent API; personalisation happens in the admin (D4) |
| B5 | Only a **public** storage bucket exists | Company documents (insurance, accounts, policies) have nowhere safe to live | Private bucket plus signed URLs, Phase 1 (D5) |
| B6 | ~~Paperclip's Claude adapter flags tool output containing "unauthorized" or "login required" as a sign-in failure and switches off the shared AI connection for all agents.~~ **Resolved 14 Nov 2026** (`shared/plugin-patches/claude-login-detection.cjs`; re-checked applied on 15 Nov, connection `2c55589c` healthy). Phase 0 missed this entry | Patch must be re-run after any container recreate or Paperclip upgrade | One AI connection per agent remains optional (needs the founder to enter the key per connection) |
| B7 | Low-trust agents cannot create approvals, question cards or user-assigned tasks (Paperclip v2026.1106.0) | Spec §15 approvals cannot live in Paperclip | Binding approvals live in the website Approval Centre; `FOUNDER DECISION` tasks stay for agent-side questions |
| B8 | Paperclip runs on the founder's computer and agents run only when it is on | Scheduled agent work stops when the PC is off | Time-critical pulls (official APIs, deadline alerts) run on Vercel Cron, not in Paperclip |
| B9 | Supabase session pooler allows 15 clients in total (`DECISIONS.md` §7) | Background jobs can starve admin pages | Jobs use one connection each and run one at a time; the pooler fix in §7 is still recommended |
| B10 | Portal terms for automated access (Defence Sourcing Portal on Jaggaer, eTendersNI, local authority portals) were not found | Browser automation (§17) cannot be assumed permitted | No portal automation until each portal's terms are read and you approve it (D8) |
| B11 | Sell2Wales API returned HTTP 500 on 14 Nov 2026 | The Welsh source is less reliable than the others | Phase 2 reads the API and marks the source degraded when it fails (no download fallback built yet: the monthly file is a manual download today) |

### Decisions recorded (15 November 2026)

The founder answered in the Phase 0 follow-up:
- **"Both, fault fix first."** D9: the adapter patch was already applied on 14 November and is verified in place. Per-agent AI connections stay optional.
- **D5 private document store, D6 Organisation table, D7 no portal passwords, D11 no new spending**: approved as recommended.
- **D2 "Company experience."** The past field work may be described as company experience **once the evidence (contract or purchase orders) is uploaded and recorded as a company fact**. Until then every document keeps the `PRODUCT.md` wording.

- **"Dry-run, then apply"** (Phase 1 migrations). Dry-run on production in a rolled-back transaction succeeded, then `procurement_foundation` and `procurement_target_organisations` were applied on 15 November 2026. Verified: 52 organisations (6 at priority 1), 10 sources all off, private bucket `company-documents` with no storage policies, RLS on all 16 new tables with no API-role grants, 4 guard triggers. The Supabase security advisor reports only the expected "RLS enabled, no policy" notes (server-only tables, as `AgentDraft`). (The code followed in PR 14, merged 15 November.)

Still open after Phase 1: D3, D8, D13, D14 (D1, D4, D10 and D12 were decided for Phase 2, below).

### Phase 2 decisions (15–18 November 2026)

- **D1:** paste-in import of the ChatGPT report. Built (Admin → Procurement → Import report). Email forwarding was not chosen.
- **D10:** not yet. No Paperclip agent is created; agent 13 is to be decided once real data flows.
- **D12:** store buyer contacts from published notices, and update the privacy notice. Contacts are stored on the buyer organisation and stay in the admin. Draft wording: [privacy-notice-draft.md](privacy-notice-draft.md). It must be published before a feed is switched on.
- **D4:** first "allow agent full access"; on 18 November, after the transfer issue was explained (agents run on DeepSeek in China, no UK GDPR transfer basis: `DECISIONS.md` §15), the founder chose **organisations and roles only**. Built: a separate `PAPERCLIP_PROCUREMENT_TOKEN` scope; agents read opportunities and organisations through an allow-list with no contacts, notice text or personal links, may record research (refused if it holds personal data) and may only validate, qualify or research. Off until the founder sets the token.

### Decisions requested

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | How the 9 am ChatGPT report gets in | **A** manual paste or upload in admin; **B** A, then the ChatGPT notification email forwarded to a dedicated mailbox read by the Inbox sync; **C** a separate OpenAI API research job (costs money, labelled as independent research, never as the ChatGPT task) | **B**. Start with A. You check one task email: if it holds the full report, set up forwarding yourself. C only if A and B prove unworkable |
| D2 | How past field-engineering experience is described | **A** as in `PRODUCT.md` (founder's own employment); **B** as company experience, once you provide evidence of a CYVRIX contract | **A** until evidence exists |
| D3 | Existing partner and supplier accounts | You supply, outside chat and without passwords: portal, account status, owner email alias, renewal date | Needed before any §38 work |
| D4 | Personal data and agents | **A** agents see organisations and roles only (redacted); **B** move procurement agents to a model provider with a UK or EU data-processing agreement (cost, and a new provider review) | **A** |
| D5 | Private document storage | **A** new private Supabase bucket, server-only access, signed short-lived URLs; **B** keep documents outside the system and record metadata only | **A** (production change, so it needs your approval) |
| D6 | Counterparty records | **A** new `Organisation` table (targets, buyers, principal contractors, manufacturers), optionally linked to `ClientCompany`; **B** reuse `ClientCompany` | **A**. `ClientCompany` drives portal access and row-level security, and mixing 52 research targets into it risks portal exposure |
| D7 | Credentials for supplier portals | **A** none stored: the system records a label that points to your password manager entry; **B** encrypted in the database with `secret-box` | **A** |
| D8 | External execution | **A** manual and human-assisted only (the system prepares an exact package; you submit and upload the receipt); **B** also allow portal automation, portal by portal, after terms review | **A** for at least the first three months |
| D9 | Paperclip connection fault (B6) | Founder chose "fault fix first" (15 Nov). The adapter patch was already applied on 14 Nov and is verified in place. Per-agent connections are optional | Re-apply the patch after any upgrade; add per-agent connections only if the fault recurs |
| D10 | Which Phase 2 agents to create | 13 Tenders, 14 Partnerships, 12 Lead Generation (each needs board approval to create) | 13 first, after Phase 2 data is flowing; 14 after D2 and D3; 12 later |
| D11 | Budget | **A** Phases 1–2 at no incremental spend, with DeepSeek inside existing per-agent caps; **B** authorise up to £30/month | **A**. The £30 stays unspent until a specific cost is put to you |
| D12 | Public wording | Privacy notice changes (procurement contact data; data imported from ChatGPT) | Draft wording in a PR for your sign-off before Phase 2 ships |
| D13 | Standing registration policy (§8) | **A** none, every registration approved individually; **B** a standing policy for free, non-binding registrations | **A**, at least until each portal's registration terms have been read |
| D14 | Security vetting information | Kept out of the system entirely; handled by you with the sponsoring organisation | Agree |

### Observed, not changed (for the session that owns it)

- Production already has migrations `email_messages` (20261114230000) and
  `password_reset_tokens` (20261114230002) applied, while PRs 10 and 11 are not
  merged. That is expected for a dry-run-then-apply flow. It means main's
  Prisma schema is behind the database until they merge.
- `AgentDraft`, `EmailMessage`, `PasswordResetToken`, `RateLimitBucket`,
  `UserSession` and `VerificationToken` have row-level security on with no
  policies. That denies API roles by design (server-only access), which is
  correct. The new tables follow the same pattern.
