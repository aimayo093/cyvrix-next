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

<a id="vercel-analytics"></a>
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

## Former Laravel Request

The Laravel project was removed per earlier instruction. If CYVRIX later needs a Laravel backend/admin, host that separately on Laravel-friendly hosting and keep this Next.js app as either the frontend or a replacement full-stack platform.
