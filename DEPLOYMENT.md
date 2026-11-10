# Deployment Notes

## Recommended Hosting

This implementation is now a Next.js/Prisma application rather than Laravel. The recommended production architecture is:

- Next.js app on Vercel or another Node-compatible host.
- PostgreSQL database on Supabase, Neon, Railway, Render, RDS, or another managed PostgreSQL provider.
- Prisma migrations run from CI or a trusted deployment step.
- Media uploads start with local/public storage for development and should move to object storage for production.

## Supabase PostgreSQL

Use the Supabase project connection string as `DATABASE_URL`.

Required environment variables:

```bash
NEXT_PUBLIC_SITE_URL=https://www.cyvrix.co.uk
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require&schema=public"
AUTH_SECRET="long-random-secret"
RESEND_API_KEY=""
MAIL_FROM="CYVRIX Technologies <support@cyvrix.co.uk>"
ADMIN_NOTIFICATION_EMAIL="admin@cyvrix.co.uk"
FILESYSTEM_DISK=public
```

Supabase notes:

- Keep SSL enabled with `sslmode=require`.
- Avoid hardcoding Supabase hosts in source files.
- Run `npm run prisma:generate` after schema changes.
- Run `npm run prisma:migrate` against the production database only from a controlled environment.

## Vercel

Vercel is suitable for this Next.js application. Add the environment variables above in the Vercel dashboard.

Build command:

```bash
npm run prisma:generate && npm run build
```

Install command:

```bash
npm install
```

Production media limitation:

Vercel serverless file storage is ephemeral, so production image uploads should use object storage such as Vercel Blob, Cloudinary, Supabase Storage, or S3. The Prisma `MediaAsset` model is already storage-provider neutral.

<a id="dashboard-analytics"></a>
### Vercel Analytics on the dashboard

The admin Today dashboard shows website visitors and top pages from the
[Vercel Web Analytics API](https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views).
Without these variables it shows "Not connected"; nothing else is affected.

1. In Vercel, open Account Settings → Tokens and create a token scoped to the
   team that owns this project. Give it the shortest expiry you are willing to
   renew.
2. In the project's Settings → Environment Variables, add
   `VERCEL_ANALYTICS_TOKEN` for Production (and Preview if wanted).
3. Optional: `VERCEL_ANALYTICS_PROJECT_ID` (defaults to Vercel's own
   `VERCEL_PROJECT_ID`) and `VERCEL_ANALYTICS_TEAM_ID` for a team project.
4. Redeploy. Figures are cached for an hour.

The token is read only on the server and sent only to `api.vercel.com`.
`npm run check:env` reports whether it is set without printing it. Hobby plans
keep one month of analytics, so a 90-day view says how many days are available.

## Server-only grants and indexes (20261110130000)

Apply `prisma/migrations/20261110130000_server_only_grants_and_indexes` to
production. It is idempotent: the grants it revokes are already revoked on
production, so on that database it only adds two indexes (unread notifications,
ended sessions). Nothing depends on it, so it can go before or after a deploy.

## Running scripts/apply-migrations.mjs

The script verifies the database's TLS certificate and will not run without
it. Download the CA certificate (Supabase: Project Settings → Database → SSL
Configuration → Download certificate) and set `DATABASE_CA_CERT` to the file's
path, along with `DIRECT_URL` or `DATABASE_URL`.

## Before deploying signed-in devices

**Done 10 November 2026:** applied to production (Cyvrix-Technology) and verified: columns, three indexes, cascade on account delete, row-level security with no policies, no anon or authenticated access.

Apply `prisma/migrations/20261110120000_user_sessions` to production first.
It only adds the `UserSession` table. Once the code is deployed, every
existing sign-in ends once (those cookies name no device row), so everyone
signs in again, then appears in Security Center → Signed-in devices.

## Before merging the November 2026 security changes

**Done 10 November 2026:** applied to the production project (Cyvrix-Technology), with the column, table, row-level security and revoked API grants verified.

Apply `prisma/migrations/20261110000000_session_version_and_rate_limits`
to the production database **first** (Supabase SQL editor, or
`npx prisma migrate deploy` with the production `DATABASE_URL`). It only adds
a column and a table, so the site keeps working while it runs. The new code
reads `User.sessionVersion` on every signed-in request, so deploying the code
before the migration makes every signed-in request fail with a database error
until it is applied.

After deploying, staff accounts without two-factor are sent to
`/security-setup` and cannot use the admin until they enrol. Have an
authenticator app ready.

## Bot protection

The Security Center's **Bot protection** switch turns the Vercel Firewall's Bot
Protection managed ruleset on (JavaScript challenge) or off, and shows the
state the firewall reports.

1. Vercel → Account Settings → Tokens: create a token scoped to the team that
   owns the project.
2. Add it to the project's environment variables as `FIREWALL_API_TOKEN`
   (Production only), then redeploy.
3. The project id comes from `VERCEL_ANALYTICS_PROJECT_ID` when that is set,
   otherwise from `VERCEL_PROJECT_ID`, which Vercel sets. If the
   project is in a team, also set `VERCEL_FIREWALL_TEAM_ID` (or the existing
   `VERCEL_ANALYTICS_TEAM_ID`) to the team id.

Without the token the card says "Not connected" and offers no switch. Every
change, and every refused change, is written to the audit log.

## Dependency updates

Dependabot (`.github/dependabot.yml`) opens pull requests every Monday morning:

- Prisma packages in one PR and React packages in another, whatever the size
  of the release (majors included), because each set must move together;
- one grouped PR for every other package's patch and minor releases;
- a separate PR for each other package's major release, which can break
  things and needs a look before merging;
- GitHub Actions used by CI, which are pinned to commits.

A new release waits three days before Dependabot proposes it, which keeps the
site clear of most hijacked-package incidents.

Every PR runs CI (`.github/workflows/ci.yml`): a production dependency audit,
the type check, `check:claims`, the test suites and a production build. Merge a
Dependabot PR when CI is green and the Vercel preview looks right. Nothing
merges itself.

`@types/node` follows the Node.js runtime in `package.json` `engines`
(currently 24.x), not the newest Node. To move to a new Node major, change
both together and check Vercel's Node.js version setting matches.

ESLint stays on 9 until `eslint-config-next`'s bundled plugins
(react, jsx-a11y, import) support 10.

## Former Laravel Request

The Laravel project was removed per earlier instruction. If CYVRIX later needs a Laravel backend/admin, host that separately on Laravel-friendly hosting and keep this Next.js app as either the frontend or a replacement full-stack platform.
