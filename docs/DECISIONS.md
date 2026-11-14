# CYVRIX — decisions and the reasoning behind them

Read this before changing anything on the public site, the Security Center, or
the content pipeline. It records **why** things are the way they are, so a
decision that looks arbitrary is not quietly reversed.

Each entry says what was decided, why, and what would justify changing it. If a
decision no longer holds, change it here in the same commit as the code.

---

## 1. Positioning

**CYVRIX presents as a highly competent specialist UK technology partner, not as
a large company.**

The strapline is: *CYVRIX helps organisations manage, secure and modernise the
technology their people rely on.*

Why: the company was incorporated in August 2024 and is small. Copy that implies
scale is both checkable and easy to disprove, and a buyer who catches one
inflated claim discounts everything else on the page. Specialist competence is
more believable and, for the work CYVRIX sells, more attractive.

**Would change it:** genuine growth that makes scale claims true and evidenced.

---

## 2. The claims rule — the load-bearing decision

**A public claim is either verifiable against a public register, evidenced on
request, or absent. There is no fourth option.**

This is the rule the rest of the site is built around. It is why the following
were removed rather than softened:

| Removed | Why |
| --- | --- |
| ISO 27001 and Cyber Essentials Plus cards | Not held |
| "SLA Adherence 99.8%" | Unmeasured |
| "Client Rating 4.9/5" | No review corpus |
| Response-time figures | Unmeasured |
| Anonymous testimonials | Unattributable |
| "Call Hotline 0800 123 4567" | A placeholder number |

Naming a certification as *work we help a client prepare for* is fine.
`ISO 27001 readiness` is a service. `ISO 27001 certified` is a claim.

`npm run check:claims` enforces this. Seven rules reject certifications stated
as held, uptime and SLA figures, response times, ratings, scale claims,
superlatives and guarantees. **It fails the build.** If it blocks you, the
answer is almost never to weaken the rule.

**Would change it:** an actual certificate, with the number published in the
Trust Centre.

---

## 3. Two sources of content, and which wins

Every public page can be served from the CMS or from reviewed static content.
The precedence differs by content type, and both directions have bitten:

**Page sections** (`/about`, `/careers`, `/support`, `/contact`, `/faq`,
`/pricing`): the CMS wins as soon as a page has **one** section. A thin CMS page
therefore shadows much better reviewed copy, and the site published far less
than the reviewed content said.

**Legal pages**: `toPublicLegalDocument` rejects anything under 240 characters,
so a placeholder can never be served as an approved policy. The CMS records held
9–22 word stubs, so `/privacy-policy` served 1,441 reviewed words while the
admin showed 22 — and editing the record appeared to do nothing.

**The fix for both is the same:** put the reviewed content *into* the CMS. Pages
& Core Section Builder and Legal Pages each have a Restore control that does
this, writing the previous version to the audit log first.

**Do not** resolve this by deleting CMS rows to unmask the fallback. That trades
one problem for a worse one: content that can no longer be edited.

---

## 4. Withheld details

Two things are deliberately absent from the public site, each behind one flag:

- **The founder's personal name** — `founder.publishName` in `lib/founder.ts`
- **The registered office** — `companyFacts.publishRegisteredOffice` in
  `lib/company-facts.ts` (it is a residential address)

Withholding means withholding from the **page source**, not just the visible
text. Consequences that are easy to miss:

- The LinkedIn URL contains the name, so the link goes too.
- The schema.org `Person` node requires a name, so the whole node is omitted
  rather than emitted half-anonymous.
- The `PostalAddress` drops `streetAddress` and `postalCode`; locality and
  region are published, which is true and enough.

`check:claims` fails if either value is written into source under `app`,
`components` or `lib`. Both the street line **and** the postcode are guarded —
the postcode alone identifies the property.

**Known consequence:** the registered office is among the particulars
Regulations 24–25 of the Companies (Names and Trading Disclosures) Regulations
2015 require on a UK company website. The disclosure keeps the registered name,
jurisdiction and company number, and states the trading location instead. This
was the company's decision, taken after the constraint was put to them.

---

## 5. The Security Center says what it examined

**A check reports its method and its limits, never a bare pass.**

"XSS: pass" invites the reader to conclude that class of bug is absent. It does
not establish that — it means no unreviewed `dangerouslySetInnerHTML` exists.
Every check therefore carries what it looked at and what it cannot tell you.

Where a question cannot be answered, the check says **not assessed** rather than
passing, and the analyst lists it as a blind spot.

Where the scan looked and the feature **does not exist** — no password reset, no
webhook, no upload route — it says **not applicable** (November 2026). Neither
is a pass and both are left out of the score, but "not applicable" is not a
blind spot: the question was answered, and the answer is "there is nothing
here". Calling it "not assessed" put an "incomplete picture" badge on a scan
with nothing missing, and it was being stored as a warning, so every scheduled
scan reported "found warnings" and raised a notification. Only answered checks
now count towards warnings and failures.

**Scoring.** Score is computed over *assessed* checks only, with a warning worth
half a pass and a failure none. The earlier rule — passes ÷ total checks — had
two faults that only appeared when the scan grew from 14 checks to 32: an
unanswerable question counted as a failure, and **adding checks lowered the
score even though nothing had changed**. A dashboard that drops when you look
harder teaches people not to look.

**Two sources, by necessity.** Source analysis is precomputed by
`npm run scan:code` into `lib/generated/appsec-manifest.json`, because a
deployed serverless bundle cannot reliably read its own `app/**` tree. Live
probes run during the scan, because the only honest way to answer "is a source
map served" is to ask the running site. The build regenerates the manifest, and
the scan warns when it is over 30 days old.

**Detector precision matters more than coverage.** The first run produced three
false positives — file uploads flagged routes that only read text fields,
object-level authorisation flagged create-only routes, input validation flagged
a route with no body. A security tool that cries wolf gets ignored, which is
worse than not having one. **Verify a new detector by hand before trusting it.**

**The dependency check compares against a release worth moving to.** It asks
the registry for each package's `latest` document (a few kilobytes; the full
record timed out for large packages, which then dropped out of the count
silently). A package the registry does not answer for is reported as
unchecked, never as current. Pre-releases are ignored. `@types/node` is
compared with the running Node.js major, because types newer than the runtime
describe APIs the server does not have.

**A newer major that cannot be adopted is listed, not warned about.** The build
records each installed package's peer range for our direct dependencies
(`npm run scan:deps`, into `lib/generated/dependency-holds.json`). When a
latest major falls outside one of those ranges — ESLint 10 while
eslint-config-next's plugins stop at 9, TypeScript 7 while typescript-eslint
stops below 6.1 — the scan names the package and what holds it instead of
raising a warning nobody can act on. It is not a blind spot: Dependabot
proposes the upgrade once the ceiling lifts, and CI's
`npm audit --omit=dev --audit-level=moderate` still blocks a production
dependency with a moderate or worse advisory. That audit does not cover
development-only packages, which is where both of today's held-back packages
sit.

---

## 6. Two-factor authentication

**`twoFactorReady` must never be set by hand.** Setting it without enrolment
makes the Security Center state something false, which is the exact problem the
rest of this document exists to prevent.

TOTP is implemented on `node:crypto` rather than taken from a package
(`lib/totp.ts`). RFC 6238 is about forty lines of HMAC-SHA1, and adding a
dependency for the one control between a password and an administrator account
means trusting a supply chain unnecessarily. The tradeoff is that hand-written
authentication needs proving, so it is checked against the RFC's published test
vectors: `npm run test:totp`.

Decisions worth keeping:

- **Replay is rejected.** A code is valid for its whole 30-second step, so
  verification returns the counter it matched and refuses anything at or below
  the last accepted one. Without this the same six digits work twice.
- **Secrets are sealed, never plaintext** (`lib/secret-box.ts`). AES-256-GCM
  under a key derived from `AUTH_SECRET` by HKDF with its own info label, so the
  encryption key and the session-signing key are different values from one root.
- **Recovery codes exist because there is no password reset.** Enabling
  two-factor on the only administrator account would otherwise be a lock-out
  waiting to happen.
- **Staff accounts must have it (November 2026).** `getSession` reads a staff
  account without a second factor as signed out, so every page, action and API
  route refuses it without needing its own check — a rule each route had to
  remember would eventually be forgotten by one. The one way in is
  `/security-setup`, through `requireStaffForSecondFactorSetup`. "Turn off"
  became "Replace authenticator" for the same reason, and it asks for a
  current code first, so a stolen session cannot swap the authenticator.
  Client accounts are not required to enrol.
- **A pending enrolment secret is reused until confirmed.** Refreshing the
  set-up page, or opening it in a second tab, used to replace the secret and
  make the QR code already scanned fail. The trade-off: a screenshot of an
  unconfirmed QR code stays usable until enrolment completes or "Start again"
  issues a new one. Only a signed-in staff member can see it, and confirming
  still needs a live code from the phone that scanned it.

`lib/secret-box.ts` and `lib/recovery-codes.ts` deliberately omit `server-only`,
which would make them untestable. The guard is not lost: both import
`node:crypto`, so a client component importing them fails the build.

---

## 7. Database and build constraints

`DATABASE_URL` points at Supabase's **session-mode** pooler on port 5432, which
accepts 15 clients in total.

Consequences, both worked around rather than fixed:

- `lib/prisma.ts` caps each client at 3 connections with a 10-second timeout, so
  a starved request **fails** instead of hanging. An unbounded pool was why
  admin pages hung on a grey skeleton.
- `next.config.ts` sets `experimental.cpus: 4`. The default worker count
  saturated the pool, and pages **silently prerendered from static fallback
  without their CMS data**.

**The real fix is `DATABASE_URL` on the transaction pooler at port 6543 with
`?pgbouncer=true`.** The correct value already exists in `.env` line 11; it is
shadowed by `.env.local` line 11. Once that is corrected, remove the `cpus` cap.

`npm run check:env` reports which value actually takes effect. Run it before any
write operation: a local dev server reaches the **production** database.

### Writing to the database directly does not update the site

Public pages are cached with `use cache` and a `cacheTag`, and the tag is only
invalidated by the admin server actions in `lib/admin-actions.ts`
(`updateHomeCache`, `updateCmsPageCache`). A script that writes to the database
directly — a seed, a restore, a one-off correction — changes the data and leaves
the site serving the previous version for up to the `cacheLife` window.

There is no public revalidation endpoint, and deliberately so. The two ways to
flush after an out-of-band write are to make the same edit through the admin, or
to redeploy.

This is not a bug to fix by adding a webhook. A cache that only an authenticated
action can invalidate is the correct posture for a site whose claims are gated;
the thing to remember is that the write and the flush are separate steps.

---

## 8. Rendering and layout notes

- **`FORCE_FULL_PAGE_RELOAD = true`** in the public layout. With
  `cacheComponents`, Next keeps the previous route mounted in a hidden
  `<Activity>` subtree, so a content page can reappear with earlier state.
- **Never put the whole chrome behind one Suspense boundary.** Both the public
  navbar and the admin frame have done this and rendered as a grey skeleton with
  no navigation. Auth is the only thing the admin chrome waits for; everything
  else streams separately.
- **`new Date()` in a prerendered Server Component** either fails the build or
  freezes at build time. Use `connection()` inside a Suspense boundary, or state
  a fact that does not age ("since 2009" rather than "17 years").
- **The request-time auth gate lives in `proxy.ts`, not `middleware.ts`.** Next
  16 renamed the file convention; the function is `export async function proxy`.
  Two consequences that are not visible from the file itself. Proxy now defaults
  to the **Node.js runtime**, and setting a `runtime` config option in a proxy
  file throws rather than being ignored — `lib/auth-edge.ts` stays on Web Crypto
  so it is correct on either runtime. And `scripts/analyse-appsec.mts` names
  `proxy.ts` individually in its scan list, guarded by `existsSync`: renaming the
  file without updating that list drops the authentication gate out of the
  Security Center scan **silently**, with no error and only `fileCount` moving.
- **The gate is not the whole of authorisation.** A Server Function is a POST to
  the route it is used from, so a matcher that excludes a path also removes proxy
  coverage from the actions on it. Each action must therefore authorise itself;
  `proxy.ts` is the first gate, never the only one.

---

## 9. Open questions

- **Service structure.** The site is built around four peer engines: Managed
  Services, Cloud & Cybersecurity, Field Engineering, Professional Services. A
  later positioning statement proposes four *pillars* — Managed IT, Cloud,
  Cybersecurity, Infrastructure — with Field Engineering and Professional
  Services as supporting capabilities. **Unresolved.**
- ~~MFA enrolment and the sign-in challenge are not built.~~ Built since:
  enrolment is on the admin Profile page and sign-in asks for a TOTP or
  recovery code when `twoFactorEnrolledAt` is set (`app/(auth)/login`).
- ~~Email verification has no flow.~~ Built since: `lib/email-verification.ts`
  sends a single-use link, and `/verify-email` is the only place
  `emailVerified` is set.
- **CV upload** is unwired. The scanner is built and tested; it needs a private
  bucket, not `public-media`.
- **Three legal pages** (`acceptable-use-policy`, `data-processing-addendum`,
  `service-level-agreement`) exist in the CMS with no public route. An SLA and a
  DPA are per-client contract annexes and arguably should not be website pages.
- **The Sentry build-time advisory is resolved (10 Nov 2026).** `glob` and its
  `minimatch` inside `@sentry/bundler-plugins` were fixed by the move to Sentry
  11 (§12); `npm audit --omit=dev` reports nothing.
- **Majors: each is its own upgrade, checked before it lands.** On 10 November
  2026 `@sentry/nextjs` 11 (§12), `framer-motion` 14 and `@types/node` 24 (to
  match the runtime) were each upgraded in their own commit, with the type
  check, tests and production build passing; the animated pages (login,
  contact, case studies) were not separately checked; `postgres` was removed
  rather than upgraded, since `pg` already covers it. What remains is held back
  by a peer dependency and reported as such (§5): `eslint` 10 and `typescript` 7.

---

## 10. Admin form refusals

**An admin action that refuses input redirects back with `?status=error&message=`;
it never throws.**

A thrown error from a form action replaced the whole admin with the public
"Error 500" screen, and production builds hide the message, so "password too
short" looked like the site breaking. `returnWithError` in
`lib/admin-actions.ts` sends the administrator back to the page they submitted
from, and `AdminStatusNotice` shows the reason beside the form.
`app/admin/error.tsx` exists for genuinely unexpected failures only.

Two traps worth remembering:

- `redirect()` works by throwing. A `try` around it swallows the redirect —
  the email page reported "NEXT_REDIRECT" as a failure after the email had
  been sent. Call `unstable_rethrow(err)` first in any such `catch`.
- An update action writes **only the fields the form sent** (`formData.has`).
  Treating an absent field as `""` blanked the hero and featured image of a
  CMS page whenever its settings were saved.

---

## 11. The admin Today dashboard

**The admin opens on what is waiting on staff, and every figure on it is real
or marked as unreadable.**

- A block whose data cannot be read shows `—` and says so. Loaders in
  `lib/dashboard/loaders.ts` return `{ ok: false }` instead of throwing or
  returning zero, because a zero on a dashboard reads as a quiet day.
- **Overdue uses only dates staff set** — a ticket's `slaDueAt`, a lead's
  `followUpDate`. There is no invented reply-time target; one would be a claim
  about service levels the company has not made (§2).
- Days are London days. The per-day SQL converts `createdAt` (stored as UTC
  `timestamp` without zone) with `AT TIME ZONE 'UTC' AT TIME ZONE
  'Europe/London'`. If the columns ever become `timestamptz`, drop the first
  conversion.
- **Website traffic comes from the Vercel Web Analytics API** and is
  admin-only. It is never shown publicly: visitor numbers on the public site
  would be a scale claim (§1) with no register behind it. Headline visitors use
  the count endpoint — summing daily unique visitors would double-count anyone
  who came twice. Cached for an hour; without `VERCEL_ANALYTICS_TOKEN` the tile
  says "Not connected" (DEPLOYMENT.md).
- `npm run test:dashboard` fails if an admin page is missing from the sidebar
  (`lib/admin-nav.ts`), so a new page cannot be added and then be unreachable.

---

## 12. What error monitoring may collect

Sentry 11 (November 2026) replaced `sendDefaultPii` with `dataCollection` and
turned almost everything on by default: request and response bodies, headers,
cookies, user details, database query values and stack-frame local variables.
Here that would send sign-in passwords, contact-form contents and session
cookies to a third party, which the privacy notice does not cover.

- Every one of those is switched off in `lib/sentry-options.ts`, which the
  browser (`instrumentation-client.ts`), server and edge set-ups all import.
  One module, so the three cannot drift apart.
- What remains — the error, its stack trace and the route — is enough to find
  a fault without identifying a visitor.
- Turning any of them back on is a privacy-notice change first and a code
  change second. Do not do it to debug one error.

---

## 13. Sessions and rate limits

**Sessions can be ended everywhere.** Each token carries the account's
`sessionVersion` at issue; `getSession` refuses one that no longer matches.
Changing a password, changing two-factor, or "Sign out of all devices" moves
the version on, which ends every session at once — previously a stolen cookie
stayed valid for its full eight hours whatever the owner did. Tokens issued
before this existed carry no version and read as 0, so the change signed
nobody out. The migration must be applied **before** the code is deployed
(DEPLOYMENT.md).

**An administrator can reset only client portal passwords.** The reset action
used to accept any user ID, which let any administrator set a super admin's
password and sign in as them.

**Rate limits are counted in the database, shared by every instance.** The
site runs as many short-lived server instances and each used to keep its own
count, so attempts spread across them were barely limited. One atomic upsert
per rate-limit key (`RateLimitBucket`) now counts them together; a sign-in or a
form submission checks two keys (address, and address-or-email), so it costs
two. After a store failure the database is skipped for 30 seconds, so an
outage does not make every attempt wait for its timeout. Keys are an HMAC,
never the raw address or email. If the database cannot be reached the count
falls back to the instance's memory: an outage must not switch limiting off.

- Every call is awaited. An un-awaited limit never throws, so it silently
  stops applying; `npm run test:appsec` fails on one.
- The proxy's broad per-address limit on `/api` stays in memory: it runs on
  every API request, and a database round trip there would cost more than it
  protects. Broad flood protection belongs at the edge, in the hosting
  firewall (DEPLOYMENT.md).

**Each signed-in device is a row (`UserSession`).** The session cookie names
its row, so the Security Center lists every signed-in device, across all
accounts, and can end any one of them. Ending a row ends that device's next
request; signing out ends the row as well as deleting the cookie, so a copied
cookie stops working too. Only a super admin can sign out a super admin's
devices. A row records the browser's user agent and the IP address, to tell
devices apart; both are kept while the session lives and swept 30 days after
it ends. `lastSeenAt` is refreshed at most every five minutes, so reading a
session rarely writes. Tokens from before rows existed name none and are
refused, which signed every account out once when this shipped.

## 14. Tier 2 hardening: script policy, leaked passwords, audit log

**The script policy still allows inline scripts, on purpose.** A strict
policy needs a per-request nonce, and Next.js can only add one to a page that
renders on every request. That would turn off the cached pages that keep server cost down,
for every visitor. What the policy forbids instead:
inline event-handler attributes (`script-src-attr 'none'`, the usual way an
injected `<img onerror>` runs), connections to any other origin
(`connect-src 'self'` -- Sentry and Analytics both go through this origin), and
plain-http subresources (`upgrade-insecure-requests`). CMS HTML is sanitised
before render (`lib/rich-text.ts`). Revisit a nonce policy for `/admin` and
`/portal` alone if those routes ever stop using cached shells.

**New passwords are checked against known breaches.** Setting or changing any
password (staff, portal, admin-created portal accounts) asks Have I Been
Pwned's range API whether it has appeared in a breach. Only the first five
characters of its SHA-1 leave the server, and padding is requested, so the
service learns nothing usable. The check **fails open**: if the service is
down or slow (3 seconds) the password is judged on length alone and a warning
is logged. Refusing every password change during someone else's outage would
trap people in the password they are trying to replace. Sign-in is not
checked; the existing password was already accepted and a breach notice there
would only teach people to ignore it. Portal accounts created by an
administrator now also need 8 characters, which they did not before.

**The audit log is append-only and hash-chained.** The database, not the
application, numbers each entry and stores the SHA-256 of its contents plus
the previous entry's hash (migration 20261111000000), under an advisory lock
so concurrent writers cannot fork the chain. Triggers refuse UPDATE, DELETE
and TRUNCATE. `audit_log_verify()` walks the chain and the Security Center
reports the first entry that no longer matches.

- What it does not stop: the database owner can drop the triggers and rewrite
  the whole chain from the edited entry on. The latest fingerprint is shown in
  the Security Center check so it can be noted elsewhere; a copy kept outside
  the database is what would catch a full rewrite.
- The Prisma client omits the three chain columns from every query
  (`lib/prisma.ts`), so a BigInt never reaches a page or a cache.
- Audit entries can contain an email address. They are kept as security
  records; erasing one is a deliberate owner-level step (DEPLOYMENT.md), not
  something the app can do.

**security.txt** is served at `/.well-known/security.txt`. Its contact is the
support address from Contact Us CMS, falling back to the DPO address, so it
never names an inbox nobody reads. `Expires` is 180 days from when the file was
last built, and it is rebuilt hourly, so it only lapses if the site stops
being maintained.

---

## 15. The Executive OS feed and Paperclip

**The website shares its enquiries with the Executive OS (CYVRIX's operations
app, repository aimayo093/AI-CEO) through a read-only pull feed, not a push.**

Why: the Executive OS runs on the company's own computer, not on the internet,
so the website cannot reach it. It calls
`GET /api/integrations/executive-os/feed` every few minutes with a bearer
token (`EXECUTIVE_OS_FEED_TOKEN`, at least 32 characters, compared in
constant time). Unset, the route answers 404.

What it returns is deliberately narrow:
- **Leads** (contact form, consultation bookings, assessment and quote requests). Only the visitor's own answers from the payload are included.
- **Tickets**, and **client-visible ticket messages** only.
- **Privacy rights requests**, so the statutory clock is visible in both places.
- **Unsubscribed newsletter addresses**, so outreach from the Executive OS never contacts them.

It never writes, and never returns staff accounts, internal notes, staff-only
messages, sessions or settings. The website stays the system of record for
everything it owns: ticket replies and lead status are still managed in
`/admin`.

**Would change it:** the Executive OS moving to a public HTTPS host. The website
could then push enquiries as they arrive and embed its chat assistant, which
needs `script-src` and `frame-src` in `next.config.ts` to allow that host.

### Paperclip: agents read and propose; a person publishes

**Paperclip** (an open-source system that runs AI agents as a company) runs on
the company's own computer and uses the same pull model as the feed above: its
agents call the website, never the other way round. Setup is
`docs/PAPERCLIP.md`; what agents are told is `docs/paperclip-skill.md`.

- **Two tokens, two scopes.** `PAPERCLIP_READ_TOKEN` reads the feed and the
  company snapshot. `PAPERCLIP_DRAFT_TOKEN` submits drafts and reads their
  review result, and cannot read client data, so an agent that only writes
  copy never holds it. If the two are set to the same value, drafting is
  switched off: one leaked secret must not grant both. `EXECUTIVE_OS_FEED_TOKEN`
  still opens the read scope, and `/api/integrations/executive-os/feed` is kept
  as an alias.
- **Agents never change a record.** In this version they submit blog posts,
  emails, social posts and proposals into `AgentDraft`. Approving a blog draft
  creates an *unpublished* post; approving an email fills in the Email page;
  social posts are copied and posted by hand; proposals are carried out by a
  person. Nothing an agent sends is public without a person's action.
- **The claims rules block approval.** `lib/claim-rules.ts` is the single list
  used by `npm run check:claims` and by every draft. A blog, email or social
  draft with a finding cannot be approved until it is edited clean; there is
  no override, for the same reason as section 2. Proposals are internal and
  never published, so they are not blocked.
- **Plain text only.** The blog renders paragraphs as text, email goes as text,
  social posts are text: HTML from an agent is stripped, not sanitised. The
  blog shows at most 24 paragraphs and 8 tags and silently dropped the rest, so
  drafts over those limits are refused at submission instead.
- **Client data leaves Vercel.** The read scope hands enquiry and ticket
  details to a machine outside Vercel and Supabase, where Paperclip's agents
  may pass them to an AI model provider. The privacy notice must say so before
  the read token is set; the proposed wording is in the pull request that
  added this, for sign-off, because it is a public statement.
- **Firewall.** Bot protection challenges non-browser requests, so the
  integration needs a Vercel firewall bypass rule for `/api/integrations/`
  (docs/PAPERCLIP.md step 3). The routes are still token-protected and
  rate-limited.

**Would change it:** letting an approved proposal carry itself out (moving a
lead's status, sending a ticket reply) is a deliberate next step, not an
oversight; it needs an allow-list of actions and its own review. Scheduled
blog publishing, and a webhook from the site to Paperclip, need Paperclip on a
public HTTPS host.

---

## 16. Enquiry source: enquiry data, not analytics

**What:** the contact, CMS support and quote forms record how the visitor
reached the site (campaign tags, referring domain, landing and form page) and
an optional "How did you hear about us?" answer, stored as seven nullable
columns on `Lead` and shown read-only in the Leads CRM panel. Founder
decisions, 14 November 2026: keep Vercel Web Analytics unchanged; capture
enquiry source only (Paperclip CYV-31, CYV-32).

**Why it is built this way:**
- **No storage on the device.** The source is held in a page-lifetime variable
  (`lib/attribution.ts`) and travels only inside an enquiry the visitor submits.
  No cookie, no localStorage, no request of its own, so no consent gate and no
  cookie-policy entry. The privacy policy's default text
  (`lib/legal-content.ts`) discloses it ("How you found us") with legitimate
  interest as the basis. The **published** policy is the CMS copy, which must
  be updated through Admin → Legal Pages before this ships (§3).
- **`Lead.source` is not reused.** It says which form an enquiry came from and
  the CRM list and dashboards depend on it; the marketing source is separate.
- **The server decides.** The browser's JSON is a hint: keys allow-listed,
  values re-cleaned and capped, confidence from a fixed set
  (`lib/attribution-server.ts`). A malformed hint stores nulls and never fails
  the enquiry. The answer list is fixed in code (`lib/heard-about.ts`) so a CMS
  edit cannot put free text into the CRM; the free-text box is kept only with
  "Somewhere else".
- **Not on job applications.** The careers form shares the CMS section and the
  handler but does not show the fields: an applicant is not a marketing lead.
- **Old leads read "Not captured", never "direct".** Missing data is not zero
  (§11).

**Reporting:** counts by `leadSource`, `leadMedium` and `heardAbout`.
`leadSource` and `heardAbout` have `createdAt` indexes, created in SQL only
(the migration), not declared in `schema.prisma`, as with the existing
`Lead_status_createdAt_idx`; `prisma migrate` is not used against production,
so nothing proposes dropping them. `leadMedium` has none: the table holds a
handful of rows and medium is read alongside source. Add one if reporting by
medium alone ever becomes slow. Counts may go to the AI workforce; names,
companies, email addresses and message text may not (§15).

**Would change it:** paid media, which needs per-campaign cost to make the
counts mean anything; and an internal link must never carry `utm_*`, because it
would overwrite the real source.
