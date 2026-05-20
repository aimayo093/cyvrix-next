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

In your Vercel project settings under **Settings > Environment Variables**, add the following required keys:

| Environment Variable | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:[PW]@db.[REF].supabase.co:5432/postgres?sslmode=require&schema=public` | Connection string for Supabase PostgreSQL instance. Must have `sslmode=require` enabled. |
| `AUTH_SECRET` | *Generative random string (32+ chars)* | Encryption key for securing cookie sessions. Use `openssl rand -base64 32` to generate. |
| `NEXT_PUBLIC_SITE_URL` | `https://cyvrix.co.uk` | The live production canonical domain (used for SEO and sitemaps). |
| `NEXT_PUBLIC_COMPANY_NAME`| `"CYVRIX Technologies"` | Global company branding descriptor. |
| `RESEND_API_KEY` | `re_123456789...` | Optional. Connection API key for email delivery via Resend. |
| `EMAIL_FROM` | `CYVRIX Support <support@cyvrix.co.uk>` | Outgoing sender profile for support and booking notifications. |
| `ADMIN_NOTIFICATION_EMAIL`| `alerts@cyvrix.co.uk` | Target address where internal sales leads and tickets are notified. |

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
- **Content-Security-Policy**: Enforces secure HTTPS asset delivery.

Custom session cookie verification (`cyvrix_session`) runs server-side during the Next.js routing cycle to prevent unauthorized access to `/admin` and `/portal` paths, entirely secure against IDOR risks.
