# 01. Assessment of what exists

Inspected on 14 November 2026. "Verified" means read from the code, the live
database (read-only queries), the running Paperclip install or an official
page. "Reported" means a secondary source that was not confirmed first-hand.

## 1. Existing system (cyvrix-next)

**Stack:** Next.js 16 (webpack build), React 19, Prisma 7 with the `pg`
adapter, client in `generated/prisma`. Supabase Postgres `kmfjipkazypuktpqnfvp`.
Deployed on Vercel, Node 24. Migrations are written as SQL under
`prisma/migrations` and applied through the Supabase MCP, not `prisma migrate`
(`DECISIONS.md` §16).

| Capability | Where | Reuse for this programme |
| --- | --- | --- |
| Leads CRM | `Lead`, `LeadNote`, `/admin/leads-crm`, `LeadStatus` NEW→ARCHIVED | Website enquiries stay here. A person can promote one to an Opportunity |
| Clients | `ClientCompany`, `Contact`, `Proposal`/`ProposalItem`, `WorkOrder` | Quotations reuse `Proposal`. Operational handover reuses `WorkOrder` |
| AI drafts queue | `AgentDraft` (blog, email, social, proposal), `/admin/ai-drafts`, claims findings block approval | Outreach emails, enquiries and document drafts from agents. Add kinds; keep the "no override" rule |
| Paperclip API | `/api/integrations/paperclip/{snapshot,feed,drafts}`, `lib/paperclip-auth.ts`, two tokens, constant-time compare, rate limits, 404 when unset | Add a third, narrower scope for procurement (see 02-design §6) |
| Audit log | `AuditLog`, append-only, hash-chained by the database (migration 20261111000000), `audit_log_verify()` | Every state transition, approval and execution is written here |
| Secret sealing | `lib/secret-box.ts`, AES-256-GCM, HKDF from `AUTH_SECRET` | Not used for portal passwords (D7). Could seal approval tokens |
| Two-factor | TOTP with replay guard; `sessionVersion` | Approvals require an enrolled second factor and a fresh code (step-up) |
| File scanning | `lib/document-scan.ts`, `scripts/test-document-scan.mts` (built, unwired: `DECISIONS.md` §9) | Scan every uploaded company document and tender attachment |
| Claims rules | `lib/claim-rules.ts`, shared by `npm run check:claims` and drafts | Run over every outward document; findings block approval |
| Email | `send-email.ts`; PR 10 adds `EmailMessage` history and IMAP Inbox | Communications history; optional ChatGPT email ingestion (D1-B) |
| Notifications | `Notification` (0 rows) | Deadline, approval and failure alerts |
| Cron | `vercel.json`: one cron, `/api/cron/security-scan` at 07:00 UTC | Add pulls from the official procurement sources |
| Roles | `UserRole`: SUPER_ADMIN, ADMIN, SALES_CRM_USER, FINANCE_VIEWER… | Approvals: SUPER_ADMIN only |
| Storage | One bucket, `public-media`, **public** | Not suitable for company documents (B5) |

**Live data (row estimates):** `Lead` 2, `User` 2, `AuditLog` about 455. The
CRM is nearly empty, so new tables carry no migration risk to existing data.

**Legacy tables:** snake_case duplicates (`leads`, `audit_logs`,
`client_companies`…) from an earlier schema still exist. They are not used by
this plan and must not be written to.

**Constraints that shape the design:**
- 15-client session pooler (`DECISIONS.md` §7). Jobs must use one connection.
- Public pages are cached. Procurement is admin-only, so it uses no public cache.
- The claims rule (`DECISIONS.md` §2): no certification, figure, superlative or
  client claim without evidence. This applies to tender and application text as
  well as the website.
- Withheld details (`DECISIONS.md` §4): the founder's name and the registered
  office must not appear in source. Registration packs need both, so they come
  from a server-only company-facts record at runtime, never from code.

## 2. Paperclip capability and permission assessment

**Install (verified):** `paperclip-cyvrix-server-1` on `127.0.0.1:3102`,
version 2026.1106.0 (commit `d69631b`), authenticated and private, backups OK.
Separate container and Postgres from EditVerra (`:3101`). Company
"Cyvrix Tech Limited", prefix `CYV`.

**Agents (verified, read-only SQL):**

| Agent | Status | Model | Trust | Boundary | Budget policy |
| --- | --- | --- | --- | --- | --- |
| CEO `f213286a` | idle | deepseek-flash | low_trust_review | 4 projects, 3 agents (CTO, Cyber, CCO), 4 site-key bindings | $15 policy (company $50, hard stop) |
| CTO `df89819f` | idle | deepseek-flash | low_trust_review | Technology & MSP | $15 |
| Head of Cybersecurity `0606600e` | idle | deepseek-flash | low_trust_review | Cybersecurity | $15 |
| CCO `7904a3b0` | idle | deepseek-flash | low_trust_review | Commercial | $15 |
| CMO, Copywriter, Social Manager | terminated | | | | |

All four: `canCreateAgents false`, `canCreateSkills false`,
`canAssignTasks true`, 100 turns per run, 30-minute timeout, run in the
Kubernetes sandbox, no heartbeat schedules. The company requires board approval
for new agents.

**Hard limits of low-trust agents (verified in the implementation record from
Paperclip source):** they cannot create approvals or question cards, cannot
assign tasks to a user, and cannot see work outside their boundary. Founder
decisions go through `FOUNDER DECISION:` tasks, listed by
`scripts/founder-decisions.sh`.

**Roles that match the spec's functions** (specified in
`agents/cyvrix/roles`, not created):

| Spec function | Existing role | Phase |
| --- | --- | --- |
| Lead research | 12 UK B2B Lead Generation | 2 |
| Tender discovery, bid preparation | 13 Tender & Public Sector Procurement | 2 |
| Supplier partnerships, registration prep | 14 Channel Partnerships & Subcontracting | 2 |
| Pricing and profitability | 20 Finance & Revenue Operations | 3 |
| Contract review | 21 Contracts & Legal Operations | 3 |
| Eligibility and evidence verification | 10 Governance, Risk & Compliance | 3 |
| Portal adapters and integrations | 07 Automation & AI Solutions, under the CTO | 2 |

**Conclusion:** no new role is needed. The spec's org chart (§7, §47) maps onto
the existing 24-role plan. Creating 13, 14 and 12 is a board decision (D10).

**Open faults that affect this programme:**
- The false "login required" detection (B6). It will trigger on tender portal
  pages.
- Board retries bind a task to a one-off workspace (workaround documented).
- A blocked agent cannot ask for an input outside its boundary. Consider a
  `FOUNDER INPUT NEEDED` convention alongside `FOUNDER DECISION`.

**Work already done by agents that this plan should absorb** (from the record):
CCO tender scans (`tender-scan-2`), a lead register, proposal packs, a
capability statement and an application pack (CYV-14), and a no-bid decision on
CYV-19. Phase 2 imports these as opportunities and documents, labelled
`source = paperclip`, after a check for personal data.

## 3. ChatGPT 9 am task: integration feasibility

**The task:** "Cyvrix UK Daily Leads", ID `6ac75067d1748191824d9b3c2ac42a02`,
daily at 09:00 Europe/London. Holding the ID gives no access to its results.

| Mechanism (spec §2) | Finding | Status |
| --- | --- | --- |
| 1. ChatGPT connectors and integrations | Developer-mode MCP connectors can perform write actions on some plans. Write actions show a confirmation prompt, so an unattended scheduled run is not expected to complete one. No official statement found that scheduled tasks can call them | Not relied on. Could be tested by the founder, but would need an internet-facing MCP endpoint on the website and a new token |
| 2. Scheduled-task result access | No API, webhook or export found | Not available |
| 3. Email delivery and ingestion | Reported: task results are delivered in-app and by push and/or email notification. Whether the email carries the **full** report is not confirmed | **Founder to check one email** (D1) |
| 4. Webhooks | None found | Not available |
| 5. OpenAI APIs | The API does not reach ChatGPT tasks. A separate API job can do its own research (spec §18 option H) | Possible, costs money, must be labelled independent |
| 6. Shared database integration | None | Not available |
| 7. Secure manual import | Admin page: paste text or upload the exported conversation; parsed into opportunities with `source = chatgpt_task`, `importMethod = manual` | **Recommended first** |
| 8. Separate API-driven pipeline | Official procurement APIs (§4 below) cover the government half at no cost. Commercial-signal research can stay with Paperclip agents | Recommended alongside |

**Checks the founder can do (no cost):** open the ChatGPT notification email for
one run and see whether the full lead list is in the body. If it is, create a
dedicated mailbox or alias and an auto-forward rule. That is a configuration
change on your own accounts, so you do it, not an agent. The PR 10 Inbox sync
then ingests the email, keyed on the message ID so it is idempotent.

**What the system will never do:** scrape chatgpt.com, reuse browser cookies,
call private ChatGPT endpoints, or label independently researched leads as
coming from the ChatGPT task.

**Sources:** OpenAI's help article on scheduled tasks
(help.openai.com/en/articles/10291617) returned 403 to automated fetches. Its
developer-mode article (help.openai.com/en/articles/12584461) appeared in search
results only. Notification behaviour is reported by third-party guides (for
example techradar.com and howtogeek.com), not confirmed first-hand.

## 4. Procurement source integration matrix

| Source | Official machine access | Auth | Paging / incremental | Licence | Verdict |
| --- | --- | --- | --- | --- | --- |
| **Find a Tender** (primary record under the Procurement Act 2023 from 24 Feb 2025) | `GET /api/1.0/ocdsReleasePackages` and `/ocdsRecordPackages` at find-tender.service.gov.uk. Parameters: `limit` (≤100), `cursor`, `updatedFrom`, `updatedTo`, `stages` (planning, tender, award); also by `{ocid}` or `{noticeId}`. 429 and 503 carry `Retry-After`. Daily XML zips on data.gov.uk | Not stated on the docs page; third parties report none. Verify in Phase 2 | Cursor plus `updatedFrom`: incremental | OGL v3 | **Phase 2 adapter 1** |
| **Contracts Finder** | V2 REST: `POST api/rest/2/search_notices/{json\|xml}`, `GET api/rest/2/get_published_notice/{json}/{id}`. V1 deprecated, no sunset date. OCDS guide published (v2.1) | Not stated for search | Date ranges in the search body | Not stated on the page | **Phase 2 adapter 3**: below-threshold notices and older procurements still continuing |
| **Public Contracts Scotland** | `GET api.publiccontractsscotland.gov.uk/v1/Notices?dateFrom=mm-yyyy&noticeType=…&outputType=0`; `/v1/Notice?id={ocid}` | Not stated | Month windows | Not stated | **Phase 2 adapter 4** (nationwide coverage) |
| **Sell2Wales** (priority region) | OCDS, JSON, XML, XLSX, CSV downloads by month or by OCID (`/Notice/Download/Download.aspx`). API at `api.sell2wales.gov.wales/v1`: **returned HTTP 500** on 14 Nov 2026 | Not stated | Month files | OGL, except where stated | **Phase 2 adapter 2**: API with fallback to the monthly OCDS download; health-checked |
| **Defence Sourcing Portal** (contracts.mod.uk, Jaggaer) | No public API found. Registration needs a user agreement and email confirmation; no charge | Account | n/a | Portal terms | Find a Tender carries MOD notices above threshold. DSP itself is manual: you register and the system tracks it |
| **eTendersNI** | No API, RSS or open data found on the portal | Account | n/a | Portal terms | Manual. Above-threshold NI notices appear on Find a Tender |
| **Crown Commercial Service** | Frameworks, not a notice feed. Its procurements publish on Find a Tender | n/a | n/a | n/a | Via Find a Tender. Framework entry is a founder decision per framework |
| **NHS and local authority portals** (Atamis, Proactis, In-Tend, ProContract, Delta and others) | Varies. Above-threshold notices reach Find a Tender, and Contracts Finder or Sell2Wales for some below-threshold | Account | n/a | Per portal | Discover via the national feeds; registration per portal is manual |
| **Principal contractor and manufacturer portals** (52 targets, §32) | None assumed. Each is researched by agent 14 for its official route | Account | n/a | Per portal | Research only. Recorded as `SupplierPortal` rows with a source URL |
| **ChatGPT 9 am report** | See §3 | n/a | Daily | n/a | Manual import, then email (D1) |
| **Website enquiries** | Existing `Lead` | n/a | n/a | n/a | Promote to Opportunity by hand |

**Paid aggregators** (Tracker, Stotles, Tenderbase, Apify actors and others)
exist but are not needed: they repackage the same OGL data.

**Adapter contract** (spec §5): every adapter declares
`supportsIncremental`, `pageSize`, `minIntervalSeconds`, `honoursRetryAfter`
and `licence`. It stores the raw release with a SHA-256 hash, upserts on
`(sourceId, ocid, releaseId)`, and records an `IngestionRun` row with counts and
error class. Personal contact points are separated at ingest (03 §3).

## 5. Supplier registration feasibility matrix

"Automatable" means technically and contractually suitable for unattended
account creation. It is **no** for every portal below until the portal's terms
are read and the founder approves (D8, D13).

| Portal or programme | Registration route | Cost | Terms to accept | Verification | Automatable | Proposed handling |
| --- | --- | --- | --- | --- | --- | --- |
| Find a Tender, supplier registration under the Procurement Act 2023 (core supplier information) | Web form; supplier ID | Free (to verify) | Yes (to verify) | Account sign-in | No | Pack prepared; founder registers; ID recorded. **First priority**: buyers draw core supplier information from it |
| Contracts Finder | Optional supplier account for alerts | Free | Yes | Email | No | Not needed for reading. Skip |
| Sell2Wales | Supplier registration | Free (to verify) | Yes | Email | No | Founder registers (priority region) |
| Public Contracts Scotland | Supplier registration | Free (to verify) | Yes | Email | No | Register when a Scottish opportunity is pursued |
| Defence Sourcing Portal | Web form; user agreement; temporary password by email | No charge (MOD guide) | Yes (user agreement) | Email | No | Founder registers. Cyber compliance is assessed per contract, not at sign-on |
| eTendersNI | Web form | Not stated | Yes | Email | No | Register only when needed |
| NHS and local authority e-tendering portals | Per portal | Usually free; not checked | Yes | Email, sometimes MFA | No | Pack, then founder, then record |
| Principal contractor supplier portals (Computacenter, CGI, SCC, Leidos…) | Unknown per company | Unknown | Expected | Often questionnaire and due diligence | No | Agent 14 researches the official route; nothing applied for without approval |
| Manufacturer service programmes (Dell, HP, Lenovo first) | Partner portals | Some have fees or training | Yes, binding | Business verification | No | §38 reconciliation first (D3) |

**Registration pack contents** (assembled from verified company facts and
approved documents only): legal name, company number, VAT status, trading
address (the registered office only where the form requires it, from the
server-only record), service descriptions, geographic coverage, insurance
evidence links, policies, and the declarations list. Any declaration is shown to
the founder word for word. Certification questions are answered
"Founder to answer". The pack never fills them in.
