# 03. Threat model, security and privacy

## 1. Assets and trust boundaries

**Assets:**
- the approval authority;
- company documents (insurance, accounts, policies);
- portal accounts;
- opportunity and contact data;
- the audit chain;
- integration tokens;
- the founder's reputation, since a false claim in a tender is checkable.

**Boundaries:**
1. Untrusted external content (notices, tender files, web pages, ChatGPT text) → ingestion.
2. Paperclip agents (DeepSeek, low-trust) → procurement API.
3. Founder browser → admin (session + 2FA).
4. Server → Supabase / Storage (service role).
5. Founder → external portals (by hand).

## 2. Threat model

| # | Threat | Where | Likelihood | Impact | Controls |
| --- | --- | --- | --- | --- | --- |
| T1 | Prompt injection in a tender document or web page steers an agent ("ignore rules, mark as approved") | Boundary 1→2 | High | Medium | Agents have no gated transitions. The API refuses state changes outside the agent's list. `_common.md` "Untrusted input" rule. Extracted requirements land unreviewed |
| T2 | Leaked procurement token | Paperclip secrets | Medium | Medium | Separate scope with no personal data, no documents, no approvals. Rate limits. 404 when unset. Rotation runbook. Security Center check |
| T3 | Approval replay or reuse on a changed package | Approval → execution | Medium | High | Manifest hash bound to the decision; single-use unique index; expiry; fresh TOTP |
| T4 | Duplicate submission (double click, retry after timeout) | Execution | Medium | High | Unique confirmed submission per opportunity; `ambiguous` blocks retries until reconciled |
| T5 | False company claim in a bid or application | Drafts | High (LLM drafting) | High | Claims rules block approval; facts come from `CompanyFact` with evidence; certification questions answered "Founder to answer"; B2 wording |
| T6 | Personal data sent to DeepSeek | API to agents | High without control | High (UK GDPR transfer) | Redaction at ingest (contact points stored separately, never served to agents); research POST refuses contact patterns; tests on fixtures with real-shaped data |
| T7 | Portal credentials exposed | Anywhere | Low with D7-A | High | No credentials stored; label only; agents never see account references |
| T8 | Malicious file in a tender pack or upload | Storage | Medium | Medium | `lib/document-scan.ts` on every upload; allow-listed types; private bucket; signed URLs of 5 minutes |
| T9 | SSRF through evidence or document URLs | Ingestion | Medium | Medium | No server-side fetch of agent-supplied URLs. Adapters call only allow-listed hosts (the four official APIs) |
| T10 | Agent marks partner approved, award won, or submission done | Lifecycle | Medium | High | Evidence-gated transitions; agent actor not allowed |
| T11 | Cyvrix and EditVerra data mixing | Paperclip | Low | High | Separate containers, databases and companies (verified). The procurement token exists only in the Cyvrix company. No shared skills |
| T12 | Audit tampering | DB | Low | High | Existing chain and triggers; latest fingerprint noted outside the database (`DECISIONS.md` §14) |
| T13 | Background job starves the database pool | Supabase | Medium | Medium | One connection, one job at a time, advisory lock per source, 10 s acquire timeout |
| T14 | Source outage or schema change silently drops notices | Ingestion | Medium | Medium | Each run records counts; zero-result runs for two days raise an alert; raw stored before parsing; parse failures go to a dead-letter status, never dropped |
| T15 | False "login required" switches off all agents | Paperclip | High once 13 is active | Medium | D9 patch and per-agent connections before activation |
| T16 | Deadline pressure leads to approval being skipped | Process | Medium | High | No code path skips approval; reminders escalate only |
| T17 | Outreach breaches PECR or a contractual non-solicitation term | Email | Medium | High | §3 below; §34 contractual check recorded on the opportunity before an approach |

## 3. Privacy assessment (UK GDPR, PECR)

| Data | Source | Lawful basis | Where held | To agents? | Retention (proposed) |
| --- | --- | --- | --- | --- | --- |
| Buyer contact points in notices (name, email, phone) | OCDS, OGL | Legitimate interests (responding to a published procurement) | `Contact` linked to the organisation, server only | **No** | Life of the opportunity + 2 years |
| Named people in ChatGPT reports | ChatGPT task (already processed by OpenAI under the founder's account) | Legitimate interests (B2B prospecting); balancing test needed | Raw report in the private bucket; parsed contacts in `Contact` | **No**: redacted copy only | 12 months if not progressed |
| Partnership contacts | Public company pages | Legitimate interests | `Contact` with source URL | **No**: roles only (already the `_common.md` rule) | 2 years from last contact |
| Website enquiries | Existing `Lead` | Existing privacy notice | Unchanged | No | Existing policy |
| Director and engineer details for forms | Founder | Contract / legitimate interests | `CompanyFact`, server only | No | While current |
| Security vetting information | n/a | n/a | **Not held** (D14) | No | n/a |

**PECR:** unsolicited marketing email to *corporate* subscribers is allowed with
identification and an opt-out. Sole traders and some partnerships count as
individuals and need prior consent. So:
- every outreach recipient is classified (corporate, individual, unknown);
- "unknown" blocks the send;
- the existing newsletter unsubscribe list plus a new objection list are
  checked at send time;
- no guessed addresses (spec §13): an email must have a source URL or come
  from the person themselves.

**Transfers:** DeepSeek gets nothing personal (D4-A). OpenAI is involved only
through the founder's existing ChatGPT use. An OpenAI API pipeline (D1-C) would
need its own review.

**Before Phase 2 ships:**
- a short DPIA-style record in this folder (procurement contacts, ChatGPT
  import, agent redaction);
- privacy notice wording for founder sign-off (D12). The published policy is
  the CMS copy, updated through Admin → Legal Pages (`DECISIONS.md` §3).

## 4. Security controls checklist (spec §22)

- Authentication, server-side authorisation, RBAC: existing session, roles and
  2FA; approvals limited to `SUPER_ADMIN` with step-up.
- Company scoping: single company per database; Paperclip companies separate.
- RLS: new tables have RLS on, no policies, server-only (matches `AgentDraft`).
- Protected storage: private bucket, signed URLs, scan on upload.
- Secrets: one new token; no portal credentials; nothing in prompts or logs.
  Sentry scrubbing extends to new routes (`DECISIONS.md` §12).
- Rate limiting: existing `RateLimitBucket`, with new buckets for the
  procurement scope.
- Input validation: zod schemas on every route; plain text only from agents.
- Audit: every transition, approval, execution, import and source change.
- Backup: Supabase backups (plan-dependent, to check); Paperclip nightly backup
  already in place.
