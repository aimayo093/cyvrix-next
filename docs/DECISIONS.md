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
proposes the upgrade once the ceiling lifts, and CI's audit gate
(`npm run audit:gate`, below) still blocks a production dependency with a
moderate or worse advisory. That audit does not cover
development-only packages, which is where both of today's held-back packages
sit.

**An advisory with no fix** (19 November 2026). The picomatch ReDoS advisory
(GHSA-fc5q-39xc-vjpf) covers every release up to the latest, 4.0.7, so no
upgrade clears it, and npm's only suggestion is Sentry 8.38.0 (three majors
back). picomatch reaches this project only through `@rollup/plugin-commonjs`,
which `@sentry/nextjs` loads in its webpack loader at build time; the patterns
it matches come from our own configuration, never a request. The founder
approved a dated exception. CI now runs `npm run audit:gate` instead of the
bare audit: it fails exactly as before, except for an advisory listed in
`scripts/audit-exceptions.json` *for the packages listed there*, until its
`reviewBy` date. The same advisory reaching any other package, any other
advisory, or an expired entry fails the build; a fixed advisory leaves a note
to remove its entry. Each entry records its reason and who approved it. Do
not add an entry to make a build pass: an entry needs a reason a reviewer can
check, as this one does. Later the same day npm audit stopped reporting the
advisory (picomatch still at 4.0.7, so the advisory itself changed), the gate
noted the entry was no longer needed, and it was removed. The gate stays, with
an empty list, for the next advisory that has no fix.

**A firewall challenge is not the site's answer** (13 November 2026). The live
checks request the site's own public URL, so Vercel's bot protection
challenges them like any other non-browser client: HTTP 429, with
`x-vercel-mitigated: challenge`, before the site is reached. The scan was
reading that page as the site's, which gave false failures in both directions:
"security headers missing" and "routes erroring (429)", while the probes for
exposed `.env` and `.git` files *passed*, because a 429 is not a 200. A false
pass on a security check is the worse of the two. Now every live request:
- sends `x-cyvrix-scan-key` when `SECURITY_SCAN_BYPASS_KEY` is set (at least
  32 characters), which a firewall rule bypasses (DEPLOYMENT.md, "Let the
  Security Center's scan through");
- reports a challenged response as **not assessed**, never pass or fail
  (`lib/firewall-challenge.ts`).

The key is sent only to this deployment's own configured origin, never to a
website URL entered in settings and never across a redirect to another host
(`scanFetch`). A Bypass rule skips every firewall rule for a matching
request, not only bot protection, so the key is a secret on a par with a
token. It is a header rather than a path rule,
because the scan probes paths such as `/.env` that must stay challenged for
everyone else. Do not "fix" a blocked scan by turning bot protection off.

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
- **Recovery codes are the way back from a lost authenticator.** They were
  added when there was no password reset at all. A self-service reset now
  exists (§18), but it only replaces the password: a staff account still needs
  its authenticator code or a recovery code to sign in, so the codes still
  matter.
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
- **No personal data to a model outside the UK.** Cyvrix's agents run on
  DeepSeek, which processes data in China, and there is no lawful transfer
  basis for client personal data. So `/snapshot` carries counts, kinds and
  ages only (no names, companies, subjects or ticket numbers), plus the
  most-viewed public page paths with their counts (five, as the analytics
  query returns them): query strings dropped, overlong paths skipped,
  survey, unsubscribe, privacy-request and signed-in routes left out
  (`lib/paperclip-snapshot-core.ts`). The read
  token must not be given to any agent on such a provider while `/feed` holds
  names and contact details. Revisit if an agent moves to a provider with a
  UK or EU data-processing agreement.
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
- **Known limit, accepted (founder, 14 November 2026).** The public header
  and footer links force a full page load (`FORCE_FULL_PAGE_RELOAD`, so a page
  is rendered afresh rather than kept with earlier state), and a new document
  starts with empty memory. (A page restored by the browser's back/forward
  cache keeps its memory; that only ever restores what the same tab saw.)
  A visitor who lands from a campaign and then clicks Contact in the header is
  recorded by what the contact page can see, usually "direct". Considered and
  declined: keeping the source in session storage for visitors who accept
  analytics cookies, which needs a cookie-policy entry and more privacy
  wording. "How did you hear about us?" and aggregate traffic figures carry
  the rest. Revisit if campaign-level attribution becomes worth that change.
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

---

## 17. Email history and the admin Inbox

**What:** the admin Email page has three tabs. **Compose** is unchanged.
**Sent** lists the emails sent from that page that were handed to the mail
server, including ones the server refused, with its reason. A send stopped
earlier (a missing field, SMTP not configured, no sender identity) is shown
on the page as an error and not recorded. It is best effort: a history write that fails is logged and
never turns a sent email into a reported failure. Other site email
(verification, password reset, privacy requests, alerts) is not listed.
The audit log records successful sends only. **Inbox** shows mail received at the mailbox in `getServerImapConfig()`,
which is admin@cyvrix.co.uk (founder decision, 14 November 2026). Both are
stored in `EmailMessage` and kept for 24 months, then deleted by the daily
`/api/cron/email-sync`.

**Why it is built this way:**
- **The audit log was not a history.** It records the recipient and subject of
  each successful send but not the message, and it is not shown on the Email
  page.
- **Plain text only.** A received message is reduced to text (`mailparser`) and
  shown escaped in a `<pre>`; its HTML is never rendered, so a hostile email
  cannot script the admin. Attachments are not copied, only their names.
- **The mailbox defaults to the SMTP account.** One mailbox on one host usually
  serves both; `IMAP_*` overrides any part if they ever differ.
- **Sync on open, plus daily.** Vercel Hobby crons run once a day, so the page
  checks the mailbox when the Inbox is opened (at most every two minutes,
  waiting at most eight seconds; "Check now" waits at most twenty). A first
  sync reaches back 60 days; a run reads at most 100 messages, oldest first,
  so a backlog drains over later runs. Messages are de-duplicated by a hash
  of the Message-ID, or, without one, by server, UIDVALIDITY and UID. One run
  at a time: a sync claims a 90-second lease in the settings row. A message
  that cannot be parsed, or is over 5 MB, is stored from its envelope with a
  note, so it never blocks later ones. Port 993 is implicit TLS; any other
  port must upgrade with STARTTLS before logging in.
- **Server only.** `EmailMessage` has row level security and no API grants.
  Received mail holds other people's personal data, so it **never** reaches
  the Paperclip integration (§15); `test:email-history` checks the snapshot,
  feed and drafts code never reads it.
- **Errors without secrets.** Mail-server errors are stored with the mail
  passwords replaced wherever they appear, anything after AUTH, PASS or LOGIN
  removed, and password fields and URL credentials redacted.
- **Failures are loud.** The cron returns 500 when the sync or the retention
  purge fails, so a skipped purge shows in Vercel rather than silently
  breaking the 24-month promise.

**Known gap:** the Email page sends *from* the identity in System Settings
(support@cyvrix.co.uk), so replies to those emails arrive at support@, not at
the admin@ Inbox, unless the sender identity is changed to admin@.

**Privacy notice:** the default text discloses that emails to the admin@
mailbox and from the admin system are kept there, and for how long; the published CMS copy must be updated through Admin → Legal Pages
(§3) after founder sign-off.

## 18. Self-service password reset

**What:** "Forgot password?" on the sign-in page leads to `/forgot-password`.
Anyone with an active account can have a reset link emailed to them, and use
it at `/reset-password` to choose a new password. Founder request, 14 November
2026: customers who forget their password must be able to recover it
themselves.

**Why it is built this way:**
- **The same reply for every address.** The form never says whether an account
  exists, so it cannot be used to find out who is a customer.
- **Only a hash is stored** (`PasswordResetToken.tokenHash`), as with email
  verification, so a database copy yields no working links. A link works once,
  for 30 minutes, and only while the account's email is still the address it
  was sent to; a newer request invalidates older links.
- **The link always points at the production site** (`SITE_URL`, the fixed
  canonical `https://cyvrix.co.uk` in `lib/structured-data.ts`), never the
  request's Host header, which an attacker could set to their own domain. A
  reset requested on a preview or staging deployment therefore links to
  production.
- **A reset signs the account out everywhere** (`changeAccountAndEndSessions`)
  and emails a notice to the account, so a reset someone else triggered is
  noticed at once.
- **The mailbox alone never opens a staff account.** Staff must still pass
  two-factor after a reset (§6); a customer account has no second factor unless
  its owner turned one on.
- **Leaked passwords are refused** (Have I Been Pwned range check, §14), the
  same as every other place a password is set, **when the check answers**: it
  fails open after three seconds, so during an outage a reset is not
  breach-checked.
- **The request responds before looking anything up.** Only the rate limit is
  counted in the request; the account lookup and the email run in `after()`,
  so the response time does not reveal whether an account exists.
- **A token is claimed atomically**: of two submissions of one link, only the
  one whose delete removes the row may change the password.
- **An earlier link survives a failed send.** A new link replaces older ones
  only once its email has gone; expired links are cleared on every request.
- **Rate limited** per network (10) and per address (3) per window, so the form
  cannot flood a mailbox. If the database is unreachable the limiter falls back
  to per-instance memory (§13), so during such an outage several server
  instances could each allow their own three.
- **Opening the link proves the mailbox**, so an unverified address is marked
  verified when a reset completes.
- The reset page sends no referrer, since its URL carries the token. After a
  reset it sends the browser to `/login?ended=1&reset=1`, so the proxy shows
  sign-in and clears the now-invalid cookie.
- **Not kept across the reset:** the page someone was trying to open. The reset
  happens through an emailed link, often on another device, so sign-in lands
  on the account's home page.

## 19. Account holders are told when legal text changes

**What:** publishing changed wording in a public legal document (Privacy
Policy, Terms, Cookie Policy), from Admin → Legal pages or by restoring the
reviewed wording, sends every active account holder (clients and staff) a
notification in their account and an email. The email links to the document,
gives the date the new version applies from, and carries the optional "What
changed" note from the form. Founder decision, 15 November 2026.

**Why it is built this way:**
- **Only when visitors see different text.** The rule compares what the
  public page shows before and after the save: a published record that passes
  `toPublicLegalDocument`, otherwise the reviewed default wording. So saving a
  draft, unpublishing, the same wording again, a whitespace-only edit, or a
  restore over a stub the public page never showed sends nothing.
- **One version, one notice.** The announced version's hash is claimed in one
  conditional UPDATE on a `legalNotice:<slug>` settings row, so two saves of
  the same text at the same moment cannot both send. A restore schedules its
  notice only after its transaction commits.
- **One email per person.** Each recipient gets their own message, so no
  address is shown to another account holder.
- **After the response.** Notices go out in `after()`, so publishing never
  waits on the mail server. The in-app notifications and the emails are
  attempted separately, so one failing never skips the other. Each email may
  take at most 15 seconds before it counts as failed. The email's "applies
  from" date is when the version was saved.
- **Audited without addresses.** A `legal_change_notice_started` entry is
  written before any email, and `legal_change_notice_sent` after, with counts
  and up to five redacted failure reasons.
- **A service message, not marketing.** It goes to account holders about
  terms that apply to them, so it does not need marketing consent; newsletter
  subscribers without an account are not emailed.

**Known limit:** emails are sent one after another inside the request's
`after()` window, which the platform can end. If it does, some account holders
get no email, and the log shows a "started" entry with no "sent" entry. Read
it that way, and resend by hand if needed. A queued job would remove the
limit; it is worth doing before the number of accounts grows much.
## 20. Procurement: the website holds approvals, people carry them out

**What:** Admin → Procurement records tenders, commercial leads, partnership
programmes and subcontract assignments as `Opportunity` rows, with
evidence, company documents, verified company facts, packages and founder
approvals. Design and reasoning: `docs/procurement/`. Phase 1 (15 November
2026); founder decisions D5, D6, D7 and D11 in `docs/procurement/README.md`.

**Why it is built this way:**
- **Status moves are data, checked on the server.** `lib/procurement/lifecycle.ts`
  holds the two state machines from the spec (§14 pipeline, §43
  partnerships). `transitionOpportunity()` reads the facts in the same
  transaction, moves the row with a compare-and-set, and writes the audit
  entry. `ApprovedForSubmission` needs a current approval; `Submitted`,
  `Contacted`, `AccountCreated` and `ApplicationSubmitted` need a confirmed
  execution with an uploaded receipt; `Awarded` and `ApprovedPartner` need an
  uploaded document, and only the founder or an admin can make those moves.
  The document must be verified, founder-approved or certified, never an AI
  draft. Linking it to the buyer or organisation it came from is not enforced
  yet; it rests on the person making the move. Agents (Phase 2) may only
  validate, qualify and record research.
- **An approval binds a fingerprint, not a record.** A package's manifest is
  the SHA-256 of its files' hashes, labels, destination, price and
  declarations (`lib/procurement/approval-core.ts`). Locking fixes it, and the
  database refuses item changes on a locked package. Approval needs the
  founder's role **and a fresh authenticator code** (TOTP only: a recovery code
  is for getting back in, not for approving). Execution re-computes the
  manifest and refuses on any difference, expiry, reuse, or a second confirmed
  action of the same type. Decisions and receipts cannot be edited or
  deleted (triggers).
- **Nothing is sent from here (D8, decided 18 November 2026: by hand).** The
  founder submits on the portal or by email and records the outcome.
  "Confirmed" needs the portal's reference and receipt; "not sure" stops
  everything until someone checks.
- **Documents are private (D5).** Bucket `company-documents`, no storage
  policies, service role only, five-minute signed links, every open audited.
  Uploads go through `lib/document-scan.ts`. A stored version's file and hash
  cannot change; a new file is a new version. Only the founder can mark a
  document approved or certified evidence. An AI draft is never evidence.
- **Organisations are not clients (D6).** Research targets live in
  `Organisation`, linked to `ClientCompany` only when one becomes a client,
  because `ClientCompany` drives portal access.
- **No portal passwords anywhere (D7).** Phase 3's account registry will hold
  the name of a password-manager entry, never a secret.
- **The registered office stays withheld.** `CompanyFact.publicAllowed` is
  false by default, cannot be set for withheld keys (registered office,
  postcodes, personal details) because only an allow-list of keys may ever be
  public (`PUBLIC_FACT_KEYS`), and fact
  values are not copied into the audit log.
- **The 52 organisations are research targets**, seeded by name and category
  only (`20261115120100`). Nothing records or implies a relationship.

**Past field-engineering experience (D2, 15 November 2026).** The founder chose
to describe the Getronics, Dell and Lenovo field work as company experience.
`PRODUCT.md` still records it as the founder's own employment, and it stays
that way in every document **until the evidence (contract or purchase
orders) is uploaded and recorded as a company fact**. Then update `PRODUCT.md`
in the same change.

**Hardening after review (migration 20261115130000).** These guarantees are
enforced by the database, not only by the app:
- locked and superseded packages are frozen;
- items cannot leave a locked package, and their hash must match the file;
- a stored file's version is frozen except for its status;
- `Opportunity.status` must be a known state;
- at most one pending or unclear attempt per opportunity and action;
- the documents bucket is forced private.

The old "one confirmed per opportunity and action" index was replaced,
because it made a rejected-then-remediated partnership impossible to
resubmit. Tenders stay once-only in the service.

Uploads are checked structurally, not for malware, unless a scanning service
is configured.

**Phase 2: official feeds and the ChatGPT import (18 November 2026).**
- Find a Tender, Public Contracts Scotland and Sell2Wales are read from their
  public OCDS APIs (Sell2Wales has no download fallback; a failing API shows
  as degraded). Each feed is off until the founder switches it on, which is
  refused until the published privacy policy covers buyer contacts from public
  tenders (`lib/procurement/privacy-gate.ts`, D12). It is then
  read once a day at 06:00 UTC. The schedule is daily because every other job
  on this site is, and the plan's cron limits were not confirmed. "Run now" is
  available to the founder.
- Only IT-relevant notices are kept, matched by CPV code or wording
  (`lib/procurement/ocds.ts`). The filter was checked on a real day's notices.
- One opportunity per OCID. The same tender on two portals (Scottish notices
  appear on both Find a Tender and PCS) is matched by buyer, title and
  deadline day, and added as evidence rather than stored twice.
- Raw notices are stored without contact points. Buyer contacts (D12) are
  stored as `Contact` rows on the buyer organisation.
- The ChatGPT report is pasted in (D1). Its items keep their section, link and
  text as evidence, and are marked as from the task. Nothing is labelled as
  from the ChatGPT task unless it was pasted from it.
- Agents get procurement access only through `PAPERCLIP_PROCUREMENT_TOKEN`
  (D4: organisations and roles only). This came after "full access" was
  declined, because it would send personal data to DeepSeek without a
  transfer basis (§15).
  - `lib/procurement/agent-view.ts` is an allow-list. It never includes
    contacts, notice descriptions, report quotes or personal profile links.
  - Research from agents is refused if it holds an email address, a phone
    number or such a link.
  - Agents can only validate, qualify or research.
  - The token must differ from the read and draft tokens, or the scope stays
    off.

**Tests:** `npm run test:procurement` (rules, no database), `npm run test:procurement-ingest` (feeds and import parsing, no network),
`npm run test:procurement-partnerships` (accounts, policy and scoring rules),
`npm run test:procurement-tender` (deadlines, document links and requirements) and
`npm run test:procurement-db` (a throwaway local Postgres only; it refuses any
non-local URL).

**Phase 3: supplier accounts, partnerships and scoring (18 November 2026).**
The database rules below come from three migrations:
`20261118120000_procurement_partnerships` (tables, one live account per
portal, the free-portal policy check, verified needs a source),
`20261119130000_procurement_partnerships_hardening` (one opportunity per
programme; a disqualifier means "disqualified"; scores are whole numbers 0 to
5) and `20261119140000_procurement_assessment_keys` (an assessment holds
exactly its model's categories). All three must be applied before the code
that relies on them is deployed.
- People register and submit by hand (D8). The site never holds a portal
  password: an account records only the name of the password-manager entry,
  and a value that looks like a secret is refused (D7).
- One live account per portal, enforced by a partial unique index; a
  "not registered" or "rejected" row does not count.
- The standing registration policy (D13) is per portal, set by the founder
  with an authenticator code, and only on a portal recorded as free (a
  database check). It approves a registration package only when it carries no
  declarations and no price; a portal user agreement is entered as a declaration, so it still comes to the
  founder. The approval it creates names the founder and the moment the policy
  was set, not the moment of the request, so the audit shows where the
  authority came from. Switching the policy off clears that authority, and so
  does changing the portal's address, registration page or cost: the
  founder approved that portal at that address, not wherever it is later
  pointed.
- A confirmed registration (with the portal's reference and an uploaded
  confirmation) becomes the portal's account, pending the portal's checks.
  It never overwrites an account that is already active (that one is kept and
  the duplicate is audited), and a destination matching no portal is audited
  rather than silently passed over.
- A programme is "verified" only with the page it was checked against.
- Assessments (spec 12 and 40) are recommendations, not chances of winning.
  Scores are whole numbers 0 to 5; a disqualifier overrides the total. Rows
  are immutable: a new assessment is added, never an old one edited.

**Phase 4: tender intelligence (19 November 2026).**
- Deadlines are shown in the admin only (no email or message: outbound
  communication needs the founder). A newer notice now updates the submission
  and question deadlines even after work has started, because a missed
  extension or an earlier deadline costs a bid; every change is audited.
  Other facts still freeze once work starts (Phase 2).
- The site fetches tender documents only from the official notice services
  (`ALLOWED_DOCUMENT_HOSTS` in `lib/procurement/tender-documents.ts`), over
  HTTPS, checking every redirect against the same list, capped at the
  scanner's 5 MB limit. Buyers' e-tendering portals need a sign-in, and the
  site never holds portal passwords (D7), so the founder downloads and
  uploads those. Adding a host is a reviewed code change.
- Tender documents are a separate table from company documents, so a buyer's
  file can never be chosen as CYVRIX evidence. A stored copy never changes.
- The requirements checklist is entered by a person. Agent extraction is not
  built: tender documents often name buyer staff, and agents run on DeepSeek
  (D4, section 15). A mandatory requirement is met only with current evidence
  (also a database check). Final approval (QualityReview or SubmissionFailed
  to AwaitingFinalApproval) is refused while any mandatory requirement is
  open or unmet, and for a tender before any are recorded.

**Would change it:** portal automation (D8-B), which needs a per-portal terms
review; agents on a provider with a UK or EU data-processing agreement (D4-B).
