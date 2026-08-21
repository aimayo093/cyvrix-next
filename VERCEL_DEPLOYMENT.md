# Vercel Production Deployment Guide

This guide details how to build, deploy, and verify the premium Next.js App Router CYVRIX Technologies platform on Vercel.

---

## 1. Prerequisites
- An active GitHub, GitLab, or Bitbucket repository containing the codebase.
- A fully provisioned Supabase PostgreSQL database instance. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for instructions.
- A free or professional Vercel account.

---

## 2. Vercel Project Setup

1. Go to your [Vercel Dashboard](https://vercel.com) and click **Add New > Project**.
2. Import the repository containing your CYVRIX workspace.
3. Configure the following project parameters:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./` (or the folder where `package.json` is located)
   - **Build Command**: `npx prisma generate && next build`
   - **Install Command**: `npm install`

---

## 3. Environment Variables Configuration

In your Vercel project settings under **Settings > Environment Variables**, add the required keys and the approved email transport variables you use:

| Environment Variable | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:[PW]@db.[REF].supabase.co:5432/postgres?sslmode=require&schema=public` | Connection string for Supabase PostgreSQL instance. Must have `sslmode=require` enabled. |
| `AUTH_SECRET` | *Generative random string (32+ chars)* | Encryption key for securing cookie sessions. Use `openssl rand -base64 32` to generate. |
| `NEXT_PUBLIC_SITE_URL` | `https://cyvrix.co.uk` | The live production canonical domain (used for SEO and sitemaps). |
| `NEXT_PUBLIC_COMPANY_NAME`| `"CYVRIX Technologies"` | Global company branding descriptor. |
| `RESEND_API_KEY` | `re_123456789...` | Optional. Connection API key for email delivery via Resend. |
| `MAIL_FROM` | `CYVRIX Support <support@cyvrix.co.uk>` | Outgoing sender profile for Resend and SMTP notifications. |
| `ADMIN_NOTIFICATION_EMAIL`| `alerts@cyvrix.co.uk` | Target address where internal sales leads and tickets are notified. |
| `SMTP_HOST` | `smtp.example.co.uk` | SMTP host for administrator broadcasts and Security Center alerts. Keep this server-managed. |
| `SMTP_PORT` | `587` | SMTP port. |
| `SMTP_USER` | `service-account@example.co.uk` | SMTP service-account username. Keep this server-managed. |
| `SMTP_PASSWORD` | *Secret-manager value* | SMTP service-account password. Keep this in Vercel's encrypted environment settings only. |

`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME` and `MAIL_PASSWORD` remain supported as compatibility names. Do not store SMTP credentials in System Settings, CMS content or any browser-visible configuration.

---

## 4. Production Deployment Process

1. Click **Deploy**. Vercel will clone the branch, run `npx prisma generate` to build the TypeScript type definitions for the database, and execute the optimized Next.js static page compilation.
2. Once complete, Vercel will provide a staging deployment URL (e.g. `cyvrix-next-abc123xyz.vercel.app`).
3. Set up your custom domain (e.g., `cyvrix.co.uk` or `www.cyvrix.co.uk`) in Vercel under **Settings > Domains**.

---

## 5. Build & Compilation Verification

Before push-deploying any custom workspace changes to production, always verify compilation and lint metrics locally:

```bash
# Clean cache and build locally to test Vercel compilation
npm run prisma:generate
npm run build
```

This verifies:
- Perfect TypeScript type integrity.
- Zero implicit `any[]` declarations in dynamic data components.
- Standard Next.js server actions validation.
- Complete static parameter resolution for dynamic public paths (`generateStaticParams`).

---

## 6. Edge Middleware & Security Headers

Next.js security headers are automatically loaded inside `next.config.ts` to secure all assets. This includes:
- **X-Frame-Options**: `DENY` (prevents clickjacking)
- **X-Content-Type-Options**: `nosniff`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Disables unneeded browser capabilities including camera, microphone and geolocation.
- **Strict-Transport-Security**: Enforces HTTPS for the production domain and subdomains.
- **Content-Security-Policy**: Restricts script, form, framing, object and resource sources. `unsafe-eval` is permitted only in development because Next.js development tooling requires it.

Custom session cookie verification (`cyvrix_session`) runs server-side during the Next.js routing cycle to prevent unauthorized access to `/admin` and `/portal` paths, entirely secure against IDOR risks.
