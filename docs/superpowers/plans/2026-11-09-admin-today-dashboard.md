# Admin Today Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's navy sidebar and four-count dashboard with a light, grouped, phone-friendly frame and a Today page that leads with a work queue, backed by real trends including Vercel Web Analytics traffic.

**Architecture:** Pure, dependency-free logic (dates, series, queue, Vercel parsing) lives in `lib/dashboard/*` and is unit-tested by a `tsx` script. Prisma and `fetch` loaders wrap that logic and return a `Loaded<T>` result, never throwing and never zero-filling a failure. Each dashboard block is a server component in its own Suspense boundary; charts are inline SVG.

**Tech Stack:** Next.js 16 (App Router, `cacheComponents`, `use cache`), React 19, Prisma 7 on Postgres (Supabase), Tailwind 4, lucide-react, `tsx` test scripts.

**Spec:** `docs/superpowers/specs/2026-11-09-admin-today-dashboard-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/` for any Next API you touch (AGENTS.md); `cacheComponents` is on.
- Admin is light: white cards on `bg-slate-50`, ink `#041635`, accent `#2691F0`, active nav `bg-[#2691F0]/10 text-[#0f5aab]`. Emerald = clear, amber = attention, rose = failure/overdue. One solid accent element per view. No card inside a card.
- Headings `font-outfit font-black`; body Inter `font-medium`/`font-semibold`; `tabular-nums` on figures; no arbitrary `text-[...]` sizes in new code.
- No new runtime dependency. Charts are inline SVG with `role="img"` and an `aria-label` summary.
- A figure that cannot be read renders `—` with a reason. Never `0` for a failure.
- Never wrap the whole chrome in one Suspense boundary (DECISIONS §8); `new Date()` only after `await connection()` inside Suspense.
- Day boundaries and greeting use `Europe/London`.
- Prisma pool is 3 per client (DECISIONS §7): counts via `count`/`groupBy`/SQL, never by loading rows.
- Testable modules must not import `server-only`, Prisma, or `next/*`.
- No horizontal scroll at 375px; touch targets ≥ 44px (`min-h-11`).
- Copy: sentence case, no "successfully", no "please", no exclamation marks.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. `?range=` garbage (`abc`, `365`, `-7`, missing) → silently 30, never a crash or an unbounded query. (Task 1)
2. The October BST→GMT change: a lead created `2026-10-25T00:30:00+01:00` counts on 25 Oct, and a 30-day key list spanning the change has 30 unique, consecutive dates. (Tasks 1, 2)
3. A lead that is both `NEW` and due for follow-up appears once, as Follow up; a ticket with `slaDueAt = null` is never overdue; the queue caps at 8 while the sidebar count does not. (Task 3)
4. Vercel answers 402/403 (plan or token scope) or returns fewer days than asked → "Could not reach Vercel Analytics" or "last N days available", never a fake series. (Task 4)
5. An administrator with no name → "Good morning." (no comma, no "null"); only waiting-on-client tickets → "Nothing is waiting on you." (Tasks 1, 3)

---

### Task 1: Period, day keys and greeting

**Files:**
- Create: `lib/dashboard/time.ts`
- Create: `scripts/test-dashboard.mts`
- Modify: `package.json` (add `"test:dashboard": "tsx scripts/test-dashboard.mts"`)

**Interfaces:**
- Produces:
  - `type RangeDays = 7 | 30 | 90`
  - `parseRange(value: string | undefined): RangeDays` — 7/30/90 only, else 30
  - `londonDayKey(date: Date): string` — `YYYY-MM-DD` in Europe/London
  - `londonDayKeys(range: RangeDays, now: Date): string[]` — oldest first, ends with today's key, length = range
  - `greeting(now: Date, name: string | null): string` — "Good morning, Paula" / "Good afternoon." etc.; morning < 12:00, afternoon < 18:00, else evening (London); first name only
  - `ageLabel(from: Date, now: Date): string` — "5h", "2d", "today" for future/zero-day, "1d" minimum for ≥ 24h
- The test script follows `scripts/test-ticket-access.mts`: a `check(name, actual, expected)` helper using `JSON.stringify` equality, prints `pass`/`FAIL`, exits 1 on any failure, ends with `All N dashboard checks passed.` Later tasks append cases to this same script.

- [ ] **Step 1: Write the failing tests** in `scripts/test-dashboard.mts`:

```ts
check("range default", parseRange(undefined), 30);
check("range 7", parseRange("7"), 7);
check("range garbage", parseRange("abc"), 30);
check("range not allowed", parseRange("365"), 30);
check("range negative", parseRange("-7"), 30);
check("day key BST just after midnight", londonDayKey(new Date("2026-10-24T23:30:00Z")), "2026-10-25");
const keys = londonDayKeys(30, new Date("2026-11-09T10:00:00Z"));
check("30 keys", keys.length, 30);
check("keys unique", new Set(keys).size, 30);
check("keys end today", keys.at(-1), "2026-11-09");
check("keys start", keys[0], "2026-10-11");
check("greeting morning BST", greeting(new Date("2026-07-01T07:30:00Z"), "Paula Imayo"), "Good morning, Paula");
check("greeting afternoon GMT", greeting(new Date("2026-12-01T12:30:00Z"), "Paula"), "Good afternoon, Paula");
check("greeting evening", greeting(new Date("2026-12-01T19:00:00Z"), "Paula"), "Good evening, Paula");
check("greeting no name", greeting(new Date("2026-12-01T09:00:00Z"), null), "Good morning.");
check("age hours", ageLabel(new Date("2026-11-09T05:00:00Z"), new Date("2026-11-09T10:00:00Z")), "5h");
check("age days", ageLabel(new Date("2026-11-07T09:00:00Z"), new Date("2026-11-09T10:00:00Z")), "2d");
```

- [ ] **Step 2: Run** `npx tsx scripts/test-dashboard.mts` — Expected: fails to import `../lib/dashboard/time`.
- [ ] **Step 3: Implement** `lib/dashboard/time.ts` with `Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ... })`. Build day keys by stepping back whole days from London-noon of today (noon avoids DST edge duplicates).
- [ ] **Step 4: Run** `npm run test:dashboard` — Expected: `All 16 dashboard checks passed.`
- [ ] **Step 5: Commit** — `git add lib/dashboard/time.ts scripts/test-dashboard.mts package.json` · message "Add dashboard period, London day keys and greeting".

### Task 2: Daily series

**Files:**
- Create: `lib/dashboard/series.ts`
- Modify: `scripts/test-dashboard.mts`

**Interfaces:**
- Consumes: `londonDayKeys` (Task 1)
- Produces:
  - `type DayCount = { day: string; count: number }`
  - `fillDailySeries(rows: { day: string; count: number | bigint }[], keys: string[]): DayCount[]` — one entry per key, missing days 0, `bigint` converted, rows outside the keys ignored
  - `seriesTotal(series: DayCount[]): number`
  - `sparklinePoints(values: number[], width: number, height: number): string` — SVG `points`; all-zero or single value draws a flat line at mid-height; never `NaN`

- [ ] **Step 1: Failing tests:**

```ts
const k = ["2026-11-07", "2026-11-08", "2026-11-09"];
check("fill gaps", fillDailySeries([{ day: "2026-11-08", count: 2n }], k),
  [{ day: "2026-11-07", count: 0 }, { day: "2026-11-08", count: 2 }, { day: "2026-11-09", count: 0 }]);
check("ignore outside", seriesTotal(fillDailySeries([{ day: "2026-01-01", count: 9 }], k)), 0);
check("flat line no NaN", sparklinePoints([0, 0, 0], 80, 20).includes("NaN"), false);
check("single point", sparklinePoints([5], 80, 20), "0,10 80,10");
check("scaled", sparklinePoints([0, 10], 80, 20), "0,20 80,0");
```

- [ ] **Step 2: Run** — Expected: FAIL, missing module.
- [ ] **Step 3: Implement** `lib/dashboard/series.ts`. Coordinates as `Number(x.toFixed(1))`, so whole numbers print without ".0".
- [ ] **Step 4: Run** `npm run test:dashboard` — Expected: all pass.
- [ ] **Step 5: Commit** "Add zero-filled daily series and sparkline geometry".

### Task 3: Work queue and summary sentence

**Files:**
- Create: `lib/dashboard/queue.ts`
- Modify: `scripts/test-dashboard.mts`

**Interfaces:**
- Consumes: `ageLabel`, `londonDayKey` (Task 1)
- Produces:
  - `type QueueTicket = { id: string; ticketNumber: string; subject: string; company: string | null; status: string; slaDueAt: Date | null; createdAt: Date }`
  - `type QueueLead = { id: string; name: string | null; company: string | null; source: string | null; status: string; followUpDate: Date | null; createdAt: Date }`
  - `type QueueKind = "overdue" | "ticket" | "follow_up" | "enquiry"`
  - `type QueueItem = { key: string; kind: QueueKind; title: string; detail: string; href: string; since: Date }`
  - `buildQueue(tickets: QueueTicket[], leads: QueueLead[], now: Date): QueueItem[]` — rules exactly as spec §2.3; uncapped; sorted overdue first, then follow_up, then by `since` ascending. Overdue `since` = `slaDueAt`; others `createdAt` (follow_up uses `followUpDate`).
  - `QUEUE_LIMIT = 8`
  - `summarySentence(items: QueueItem[], now: Date): string`
  - `ticketNeedsStaff(t: Pick<QueueTicket,"status"|"slaDueAt">, now: Date): boolean` — the same rule, reused by the sidebar badge query filter
- `href`: leads `/admin/leads-crm?view={id}`, tickets `/admin/ticket-management?filter=all&view={id}`.
- Summary copy (exact): enquiries part "1 enquiry waiting" / "3 enquiries waiting, oldest 2 days"; overdue part "1 ticket past its due date" / "2 tickets past their due date"; follow-ups "1 follow-up due"; joined with ". " and ending "."; empty → "Nothing is waiting on you."

- [ ] **Step 1: Failing tests.** Fixtures: `now = 2026-11-09T10:00Z`; `past = 2026-11-08T10:00Z`; `today = 2026-11-09T00:00Z`; `older = 2026-11-01T10:00Z`; `twoDaysAgo = 2026-11-07T09:00Z`; `hoursAgo = 2026-11-09T05:00Z`. `t(overrides)` and `l(overrides)` are local factories returning a `QueueTicket` / `QueueLead` with `id "a"`, status `OPEN` / `NEW`, `slaDueAt`/`followUpDate` `null`, `createdAt = hoursAgo`, merged with the overrides.

```ts
check("waiting on client excluded", buildQueue([t({ status: "WAITING_ON_CLIENT" })], [], now).length, 0);
check("in progress only when overdue", buildQueue([t({ status: "IN_PROGRESS" })], [], now).length, 0);
check("in progress overdue", buildQueue([t({ status: "IN_PROGRESS", slaDueAt: past })], [], now)[0].kind, "overdue");
check("null sla never overdue", buildQueue([t({ status: "OPEN", slaDueAt: null })], [], now)[0].kind, "ticket");
check("lead dedupe as follow up", buildQueue([], [l({ status: "NEW", followUpDate: today })], now).map(i => i.kind), ["follow_up"]);
check("won lead not followed up", buildQueue([], [l({ status: "WON", followUpDate: today })], now).length, 0);
check("overdue sorts first", buildQueue([t({ status: "OPEN", createdAt: older }), t({ id: "b", status: "OPEN", slaDueAt: past })], [], now)[0].kind, "overdue");
check("uncapped", buildQueue([], Array.from({ length: 12 }, (_, i) => l({ id: `l${i}` })), now).length, 12);
check("empty summary", summarySentence([], now), "Nothing is waiting on you.");
check("summary", summarySentence(buildQueue([t({ status: "OPEN", slaDueAt: past })], [l({ createdAt: twoDaysAgo }), l({ id: "x", createdAt: hoursAgo }), l({ id: "y" })], now), now),
  "3 enquiries waiting, oldest 2 days. 1 ticket past its due date.");
```

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `lib/dashboard/queue.ts`.
- [ ] **Step 4: Run** `npm run test:dashboard` — Expected: all pass.
- [ ] **Step 5: Commit** "Add the Today work queue rules and summary sentence".

### Task 4: Vercel Web Analytics client

**Files:**
- Create: `lib/dashboard/traffic-parse.ts` (pure)
- Create: `lib/site-traffic.ts` (`import "server-only"`; `fetch`)
- Modify: `scripts/test-dashboard.mts`, `scripts/check-env.mts` (report the three variables as optional), `DEPLOYMENT.md` (setup note, anchor `#vercel-analytics`)

**Interfaces:**
- Consumes: `londonDayKeys`, `fillDailySeries`, `DayCount` (Tasks 1–2)
- Produces:
  - `type Traffic = { visitors: number; pageviews: number; daily: DayCount[]; topPages: { path: string; pageviews: number }[]; availableDays: number }`
  - `type TrafficResult = { state: "not_configured" } | { state: "unavailable" } | { state: "ok"; traffic: Traffic }`
  - `parseDaily(json: unknown, keys: string[]): { daily: DayCount[]; visitors: number; pageviews: number; availableDays: number } | null` — reads `data[].timestamp|pageviews|visitors`; `availableDays` = days from the earliest returned timestamp to today; `null` on any shape mismatch
  - `parseTopPages(json: unknown): { path: string; pageviews: number }[] | null` — reads `data[].requestPath|pageviews`, drops the `Others` row
  - `getSiteTraffic(range: RangeDays): Promise<TrafficResult>` — env `VERCEL_ANALYTICS_TOKEN` (absent → `not_configured`), `VERCEL_ANALYTICS_PROJECT_ID ?? VERCEL_PROJECT_ID`, optional `VERCEL_ANALYTICS_TEAM_ID` → `teamId`. Two GETs to `https://api.vercel.com/v1/query/web-analytics/visits/aggregate` (`by=day`, then `by=requestPath&limit=5`), `since`/`until` as `YYYY-MM-DD` from the day keys, `Authorization: Bearer …`, 5 s `AbortSignal.timeout`. Any non-200, timeout or parse `null` → `unavailable`; log status code only, never the token. Wrapped in `"use cache"` + `cacheLife("hours")` keyed by `range`.
- Unknown from the docs: whether `by` must be array-encoded. Use `by=day`; if the live call returns 400, try `by[]=day` and record which worked in a comment.

- [ ] **Step 1: Failing tests** for `parseDaily`/`parseTopPages`: good payload (`{ version: 1, data: [{ timestamp: "2026-11-08T00:00:00.000Z", pageviews: 220, visitors: 180 }] }` → visitors 180, filled series), error payload `{ error: { code: "forbidden" } }` → `null`, `data` not an array → `null`, top pages dropping `{ requestPath: "Others" }`, and a payload starting 10 days ago against 30 keys → `availableDays: 10`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** both files; add the env lines to `check-env.mts` and the setup section to `DEPLOYMENT.md` (create a token in Vercel → Account Settings → Tokens scoped to the team; add `VERCEL_ANALYTICS_TOKEN` to the project's environment variables; redeploy).
- [ ] **Step 4: Run** `npm run test:dashboard` and `npx tsc --noEmit` — Expected: pass, 0 errors.
- [ ] **Step 5: Commit** "Read site traffic from the Vercel Web Analytics API".

### Task 5: Dashboard data loaders

**Files:**
- Create: `lib/dashboard/loaders.ts` (`import "server-only"`)

**Interfaces:**
- Consumes: Tasks 1–3 types and functions; `prisma` from `@/lib/prisma`; `readScanResult` (move it from `app/admin/security-center/page.tsx` to `lib/security-scan.ts` and export it — update the page's import); `buildAnalystReport` from `@/lib/security-analyst`
- Produces (each never throws):
  - `type Loaded<T> = { ok: true; data: T } | { ok: false }`
  - `loadQueue(now: Date): Promise<Loaded<QueueItem[]>>` — tickets with status in `NEW, OPEN, IN_PROGRESS, ESCALATED`; leads with status `NEW` OR (`followUpDate <= end of London today` AND status not in `WON, LOST, ARCHIVED`); select only `QueueTicket`/`QueueLead` fields; `take: 200` each
  - `loadNavCounts(now: Date): Promise<Loaded<{ enquiries: number; tickets: number; overdueTickets: number }>>` — counts only, using the same status/`slaDueAt` rule as `ticketNeedsStaff`
  - `loadTiles(range: RangeDays, now: Date): Promise<Loaded<TileData>>` where `TileData = { enquiries: { total: number; daily: DayCount[] }; openTickets: { now: number; daily: DayCount[] }; newsletter: { now: number; daily: DayCount[] }; security: { score: number | null; history: number[] } }`
    - `security.history`: scores from `SECURITY_SCAN_RUN` audit entries created in the period, oldest first, `take: 90`, read with `readScanResult`; `score` is the newest.
  - `loadDailyCounts(table: "Lead" | "Ticket" | "NewsletterSubscriber", keys: string[]): Promise<{ day: string; count: bigint }[]>` — one `prisma.$queryRaw` per table: `SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/London'), 'YYYY-MM-DD') AS day, count(*) AS count FROM "public"."<table>" WHERE "createdAt" >= ${since} GROUP BY 1`. The table name comes from the union type, interpolated with `Prisma.raw` from a fixed map — never from input.
  - `loadSecuritySummary(): Promise<Loaded<{ ranAt: Date; score: number; highestSeverity: string | null } | null>>` — `null` data = no scan yet
  - `loadWebsiteActivity(): Promise<Loaded<{ edits: { what: string; who: string; when: Date }[]; blogDrafts: number }>>` — last 5 audit entries whose `entityType` is in the spec §2.5 list; `who` = user name or "System"
  - `loadRecentActivity(): Promise<Loaded<{ id: string; action: string; who: string; when: Date }[]>>` — 6 entries; replaces `getRecentActivities`/`getAdminStats` in `lib/data-fetchers.ts` (delete those two; nothing else uses them)

- [ ] **Step 1:** Implement `lib/dashboard/loaders.ts` and the `readScanResult` move.
- [ ] **Step 2: Verify** `npx tsc --noEmit` → 0 errors; `npm run scan:code` → still `12 pass, 2 unknown` (the raw SQL builds its table name from a fixed map; confirm no new SSRF/injection finding).
- [ ] **Step 3: Commit** "Add Today dashboard loaders that report failure instead of zero".

### Task 6: The admin frame

**Files:**
- Create: `lib/admin-nav.ts` (nav config, pure)
- Create: `components/admin/AdminSidebar.tsx` (client)
- Create: `components/admin/NavBadges.tsx` (server: `EnquiriesBadge`, `TicketsBadge`)
- Modify: `components/admin/AdminLayoutClient.tsx`, `app/admin/layout.tsx`
- Modify: `scripts/test-dashboard.mts`

**Interfaces:**
- Consumes: `loadNavCounts` (Task 5)
- Produces:
  - `type AdminNavItem = { name: string; href: string; icon: string; badge?: "enquiries" | "tickets" }` and `type AdminNavGroup = { group: "Work" | "Website" | "Security" | "Account"; primary: AdminNavItem[]; more?: AdminNavItem[] }`
  - `ADMIN_NAV: AdminNavGroup[]` — groups and items exactly per spec §1; Website `primary` = Pages, Home page, Blog, Services, Navigation; the other 14 in `more`. Icons as lucide names mapped in the client component.
  - `activeNavItem(pathname: string): AdminNavItem | null` — exact match, else longest prefix match (`/admin` matches only itself)
  - `AdminLayoutClient` gains prop `badgeSlots: { enquiries: React.ReactNode; tickets: React.ReactNode }`, each passed in from `layout.tsx` wrapped in its own `<React.Suspense fallback={null}>`
- Behaviour: drawer below `lg` (menu button in header with `aria-expanded`, `aria-controls`; Escape, backdrop and route change close it; focus moves to the first link on open and back to the button on close); collapse toggle at `lg+` keeps the `admin_sidebar_collapsed` key; "More" open state under `admin_nav_more_open`, both in `try/catch`. Badge: slate pill with the count; rose when `overdueTickets > 0`; nothing rendered when the load failed or the count is 0. Header shows `activeNavItem(pathname)?.name ?? "Admin"`. Content padding `p-4 lg:p-8`.

- [ ] **Step 1: Failing tests:**

```ts
check("every admin page in nav once", allNavHrefs().length, new Set(allNavHrefs()).size);
check("nav covers all pages", missingAdminPages(), []);  // compares ADMIN_NAV hrefs with app/admin/*/page.tsx dirs, excluding [module]
check("active exact", activeNavItem("/admin")?.name, "Today");
check("active prefix", activeNavItem("/admin/leads-crm")?.name, "Enquiries");
check("dashboard not prefix of all", activeNavItem("/admin/unknown"), null);
```

`allNavHrefs` and `missingAdminPages` are local helpers in the test script (the second reads the directory with `node:fs`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the nav config, sidebar, badges and layout changes.
- [ ] **Step 4: Verify** `npm run test:dashboard` passes, `npx tsc --noEmit` 0 errors, `npx eslint` on the touched files shows no new errors.
- [ ] **Step 5: Commit** "Give the admin a light grouped sidebar that works on a phone".

### Task 7: The Today page

**Files:**
- Create in `components/admin/dashboard/`: `Sparkline.tsx`, `TrendChart.tsx`, `StatTile.tsx`, `RangeLinks.tsx`, `TodayHeader.tsx`, `TilesBlock.tsx`, `QueueBlock.tsx`, `SecurityBlock.tsx`, `WebsiteBlock.tsx`, `ActivityBlock.tsx`, `BlockError.tsx`, `BlockSkeleton.tsx`
- Replace: `app/admin/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5; `getSession` from `@/lib/auth` for the name; `SecurityScanButton` from `components/admin/SecurityScanButton.tsx`
- Page: `searchParams: Promise<{ range?: string }>` → `parseRange`. Each block is an async server component called inside its own `<React.Suspense fallback={<BlockSkeleton />}>`; each calls `await connection()` before any `new Date()`.
- `BlockError({ message }: { message: string })` — amber text "… could not be read." in place of the block body.
- `StatTile({ label, value, href, trend, note }: { label: string; value: number | null; href: string; trend?: number[]; note?: string })` — `value === null` renders `—`.
- `TrendChart({ series, labels }: { series: { name: string; colour: string; points: DayCount[] }[]; labels: "London" })` — 2 series, first/middle/last date labels, legend, `role="img"` with `aria-label` stating both totals.
- `RangeLinks({ current }: { current: RangeDays })` — three `<Link>`s to `?range=7|30|90`, `aria-current="page"` on the active one.
- Traffic tile states (exact copy): not configured → value `—`, note "Not connected" linking to `/admin/settings` with title "Set VERCEL_ANALYTICS_TOKEN — see DEPLOYMENT.md"; unavailable → `—`, note "Could not reach Vercel Analytics"; ok → visitors, note "Vercel Web Analytics, production", plus "last N days available" when `availableDays < range`.
- `WebsiteBlock` calls both `loadWebsiteActivity()` and `getSiteTraffic(range)`; it lists top pages only when the traffic state is `ok`, otherwise it omits that list without comment (the tile already explains the state).
- Layout: header (greeting, summary, range links) → tiles grid `grid-cols-2 md:grid-cols-3 xl:grid-cols-5` → `lg:grid-cols-3` row with Queue `lg:col-span-2` and a column of Security + Website → TrendChart → Activity. The Security block's "Open Security Centre" is the one solid-accent element.

- [ ] **Step 1:** Implement the components and the page.
- [ ] **Step 2: Verify** `npx tsc --noEmit` 0 errors; `npm run test:dashboard` passes; `npx eslint app/admin/page.tsx components/admin/dashboard` no errors.
- [ ] **Step 3: Commit** "Build the Today page: queue, trends, security, website and activity".

### Task 8: Records and final verification

**Files:**
- Modify: `docs/DECISIONS.md` (new §11: Today dashboard — failure shows `—`, overdue uses only staff-set dates, Vercel traffic is admin-only and cached hourly, why no traffic figure appears publicly)
- Modify: `lib/generated/appsec-manifest.json` (regenerated)

- [ ] **Step 1:** Write the DECISIONS entry.
- [ ] **Step 2: Verify everything**: `npx tsc --noEmit` → 0; `npm run check:claims` → "No unevidenced claims found."; `npm run scan:code` → `12 pass, 2 unknown`; `npm run test:dashboard`, `test:totp`, `test:mfa`, `test:ticket-access`, `test:scan`, `check:enums` → all pass.
- [ ] **Step 3: Browser check** (needs `.env.local`; otherwise on the Vercel preview): `/admin` at 1440×900 and 375×812 — no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), drawer opens/closes with keyboard, `?range=7` changes the chart only, a block whose loader fails shows its own message.
- [ ] **Step 4: Commit** "Record the Today dashboard decisions".
