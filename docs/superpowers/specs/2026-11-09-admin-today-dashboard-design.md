# Admin "Today" dashboard and admin frame — design

Date: 9 November 2026 · Status: awaiting review · Branch: `fix/security-centre-findings`

## Why

The admin opens on four counts, a list of audit-log lines and a scan card. It
does not say what needs doing today, which is the question an operator opens it
to answer. The two reference samples (a "Good morning" queue dashboard and a
"Command Center") both lead with a work queue and back it with a few trends.

This is sub-project 2 of 4. Sub-project 1 (seven admin bugs) is done. The other
admin pages (3) and the public site (4) are out of scope here.

## What success looks like

- Opening `/admin` answers "what is waiting on me, and is anything late?"
  without clicking.
- Every number on the page comes from a real record or a real API. A number
  that cannot be read shows "—" and says so; it never shows 0.
- The admin is usable on a phone: no sideways scroll at 375px, 44px targets.
- Nothing else changes: every admin URL, permission and data path is the same.

## Constraints

- **DESIGN.md**: admin is light — white cards on `bg-slate-50`, ink `#041635`,
  accent `#2691F0`, Outfit for headings, Inter for body. Semantic colours
  (emerald clear, amber attention, rose failure) never stand in for the accent.
  One solid accent element per view. No card inside a card. Reduced motion
  respected.
- **DECISIONS.md §2 (claims)**: admin-only figures are not public claims, but
  the same honesty applies — no simulated, estimated or placeholder figures.
- **DECISIONS.md §7 (database)**: each Prisma client holds at most 3
  connections from a pool of 15. The dashboard must not fan out dozens of
  queries; per-day series are computed in SQL, not by loading rows.
- **DECISIONS.md §8**: never put the whole chrome behind one Suspense
  boundary; each dashboard block streams on its own.
- No new runtime dependency. Charts are inline SVG.

## Section 1 — the admin frame (approved 9 Nov)

Applies to every admin page via `components/admin/AdminLayoutClient.tsx`.

**Sidebar** — light (`bg-white`, `border-slate-200`), replacing the navy one.
Groups by job:

| Group | Items |
| --- | --- |
| Work | Today (`/admin`), Enquiries (`/admin/leads-crm`), Tickets, Clients, Surveys, Email |
| Website | Pages, Home page, Blog, Services, Navigation shown; the other 14 under "More", open/closed state remembered in `localStorage` |
| Security | Security Centre, Audit log, Status |
| Account | Profile, Settings |

Live count badges on Enquiries (leads with status `NEW`) and Tickets (tickets
that would appear in the §2.3 queue: Overdue plus Ticket rows, uncapped). A badge turns rose only when at least one item
is overdue. Counts load inside their own Suspense boundary and are omitted, not
zeroed, if they cannot be read. Active item: `bg-[#2691F0]/10 text-[#0f5aab]`.
The collapse control and its remembered state stay.

**Header** — page title left (from the active nav item), notifications and the
account menu right (existing components).

**Below `lg`** — the sidebar becomes an off-canvas drawer opened by a menu
button in the header, closed by Escape, by the backdrop, and on navigation;
focus moves into the drawer and returns to the button. Content padding drops
from `p-8` to `p-4`. No horizontal scroll at 375px.

## Section 2 — the Today page (approved 9 Nov, traffic added on request)

`/admin`, replacing `app/admin/page.tsx`. Top to bottom:

### 2.1 Greeting

"Good morning / afternoon / evening, {first name}" in `Europe/London` time,
computed per request (`connection()`, inside Suspense — DECISIONS §8). Below it
one sentence from the queue, e.g. "3 enquiries waiting, oldest 2 days. 1 ticket
past its due date." With an empty queue: "Nothing is waiting on you."

A period control — 7, 30 or 90 days, via `?range=7|30|90`, default 30 — sets
the period for the tiles' "in the period" totals, the top pages, the trends
and the chart. Figures defined as "now" (open tickets, subscribers) ignore it. Implemented as links, so it works without
JavaScript.

### 2.2 Five tiles

| Tile | Big number | Trend (one point per day over the period) |
| --- | --- | --- |
| New enquiries | Leads created in the period | Leads per day |
| Open tickets | Tickets not `RESOLVED`/`CLOSED`, now | Tickets created per day |
| Security score | Score of the latest scan | Score of each scan in the period |
| Newsletter | Subscribers with status `subscribed`, now | Sign-ups per day |
| Website visitors | Unique visitors in the period (Vercel) | Visitors per day |

Each tile links to its page. The visitors tile is described in §2.6.

### 2.3 "Needs you" queue

Up to 8 rows; a "View all" link goes to the relevant list. One query per
source, merged in code. Order: overdue first, then follow-ups that are due (a date staff set, like an SLA), then oldest first.

| Badge | Source | Rule |
| --- | --- | --- |
| Overdue (rose) | Ticket | status in `NEW`, `OPEN`, `IN_PROGRESS`, `ESCALATED` and `slaDueAt < now` |
| Ticket | Ticket | status in `NEW`, `OPEN`, `ESCALATED`, not overdue |
| Follow up (amber) | Lead | `followUpDate <= today` and status not `WON`, `LOST`, `ARCHIVED` |
| Enquiry | Lead | status `NEW` |

`IN_PROGRESS` tickets appear only once overdue — someone already has them.
`WAITING_ON_CLIENT` tickets are excluded: they are not waiting on staff. Quote
requests need no separate source — each one also creates a Lead in the same
transaction (`lib/actions.ts`). A lead matching both Follow up and Enquiry
appears once, as Follow up. Each row links to the record
(`/admin/leads-crm?view=…`, `/admin/ticket-management?view=…`), which now opens
even when the record is not on the first page.

### 2.4 Security card

Latest `SECURITY_SCAN_RUN` audit entry: how long ago, score, and the highest
open severity from the analyst report. "Run scan" reuses the existing scan
button. With no scan yet: "No scan has run yet" and the button. Replaces
`SecurityScanCard` on this page.

### 2.5 Website card

Last five content edits from the audit log (entity types written by content
actions: CmsPage, PageSection, BlogPost, LegalPage, Service, Industry,
CareerJob, SiteSetting and the logo/card models), as "{what} · {who} · {when}".
Plus the count of `BlogPost` drafts. Plus, when Vercel analytics is connected,
the top five pages by views in the period.

### 2.6 Website traffic (Vercel Web Analytics API)

Server-side only, in a new `lib/site-traffic.ts`, `import "server-only"`.

- `GET https://api.vercel.com/v1/query/web-analytics/visits/aggregate`
  with `projectId`, optional `teamId`, `by=day`, `since`, `until` → daily
  `pageviews` and `visitors`.
- Same endpoint with `by=requestPath`, `limit=5` → top pages.
- `Authorization: Bearer ${VERCEL_ANALYTICS_TOKEN}`. Token never reaches the
  browser, never logged.
- Cached (`use cache` + `cacheLife`, keyed by range): a good answer for an
  hour, a failure or a missing token for minutes, so one timeout does not
  blank the tile for the hour, and the dashboard does not call Vercel on every
  load. (First planned as one hour for every result; changed when built.)
  5-second timeout.
- New environment variables, documented in `DEPLOYMENT.md` and reported by
  `npm run check:env`: `VERCEL_ANALYTICS_TOKEN` (required for the feature),
  `VERCEL_ANALYTICS_PROJECT_ID` (defaults to `VERCEL_PROJECT_ID`, which Vercel
  sets automatically), `VERCEL_ANALYTICS_TEAM_ID` (optional).
- States, each shown honestly on the tile:
  - not configured → "Not connected" and a link to the setup note;
  - Vercel error or timeout → "—" and "Could not reach Vercel Analytics";
  - connected → figures, labelled "Vercel Web Analytics, production".
- Hobby plans keep one month of data; a 90-day request is clipped to what
  Vercel returns and the tile says "last N days available".

This is the first outbound call to a third-party API from the admin. The
destination is fixed in code, not taken from the request, so the SSRF check is
unaffected; the scan manifest is regenerated to confirm.

### 2.7 Chart

Enquiries and tickets per day for the period, as one inline SVG line chart
(two series, legend, axis dates, `tabular-nums`, `role="img"` with a text
summary). Series are computed with one `date_trunc('day', …)` query per table.

### 2.8 Recent activity

Kept, showing who did it (user name, or "System") and linking to the audit log.

**Removed**: the Quick links card — the sidebar does that job.

## Section 3 — data, failure and performance

- **One loader per block**, each returning `{ ok: true, data } | { ok: false }`,
  each in its own Suspense boundary with a skeleton. A failed block shows its
  own "could not be read" state; the rest of the page still renders.
- **Query budget**: sidebar counts 1 query on every admin page (all four
  counts in one round trip), queue 4 small queries, tiles 4 counts + 3 per-day series, security
  1 audit read + analyst, website 2, activity 1. Run as `Promise.all` within a
  block; Prisma's 3-connection cap queues the rest. No row-loading for counts.
- **Dates**: "today" and day buckets are `Europe/London`; SQL buckets use
  `AT TIME ZONE 'Europe/London'`, so a lead at 00:30 BST counts on the right
  day.
- **Overdue** uses only dates staff set (`slaDueAt`, `followUpDate`). No
  invented reply-time target.
- **No caching** of database blocks (they must be current); only the Vercel
  call is cached.

## Testing and verification

- Pure functions get unit tests with `tsx` scripts, matching the repo's
  existing `test:*` pattern: queue merge and ordering (overdue first, dedupe,
  cap 8), greeting by London time including the BST boundary, period parsing,
  day-series zero-filling, the summary sentence, and the Vercel response parser
  (good payload, error payload, missing token). New script: `npm run
  test:dashboard`.
- `tsc`, `check:claims`, `scan:code` and the existing test suites stay green.
- Visual check in the browser at 1440px and 375px is the remaining gap: it
  needs the database environment. If `.env.local` is supplied, run it locally;
  otherwise verify on the Vercel preview.

## Out of scope

Restyling the other admin pages (sub-project 3), the public site
(sub-project 4), custom events from Vercel Analytics, and any change to the
Security Centre's own page.

## Needs from you

A Vercel access token with read access to the project, added as
`VERCEL_ANALYTICS_TOKEN` in the Vercel project's environment variables. The
dashboard works without it and shows "Not connected" until it is set.
