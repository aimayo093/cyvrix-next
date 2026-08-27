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
passing. Two currently do: password reset (no such flow exists) and webhook
signatures (no webhooks exist).

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

---

## 9. Open questions

- **Service structure.** The site is built around four peer engines: Managed
  Services, Cloud & Cybersecurity, Field Engineering, Professional Services. A
  later positioning statement proposes four *pillars* — Managed IT, Cloud,
  Cybersecurity, Infrastructure — with Field Engineering and Professional
  Services as supporting capabilities. **Unresolved.**
- **MFA enrolment and the sign-in challenge** are not built. The core and
  storage layer are.
- **Email verification** has no flow, so `emailVerified` cannot honestly be set.
- **CV upload** is unwired. The scanner is built and tested; it needs a private
  bucket, not `public-media`.
- **Three legal pages** (`acceptable-use-policy`, `data-processing-addendum`,
  `service-level-agreement`) exist in the CMS with no public route. An SLA and a
  DPA are per-client contract annexes and arguably should not be website pages.
