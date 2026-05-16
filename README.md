# CYVRIX Technologies Platform

Premium Next.js rebuild for CYVRIX Technologies: public website, admin portal, client portal, CMS-ready content model, Prisma/PostgreSQL persistence, secure forms, and role-based route protection.

## Architecture Decision

The repository previously contained an older Laravel/template application and this newer Next.js application. The Laravel project has been removed. The rebuild is implemented in `cyvrix-next` using the requested direction: Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, secure custom cookie sessions, Zod, React Hook Form-ready dependencies, Framer Motion, and Lucide icons.

## Key Routes

- Public: `/`, `/about`, `/services`, `/services/[slug]`, `/industries`, `/industries/[slug]`, `/pricing`, `/case-studies`, `/case-studies/[slug]`, `/contact`, `/request-quote`, `/support`, `/faq`, `/blog`, `/legal`, `/careers`, `/landing/[slug]`
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`
- Private: `/admin`, `/admin/[module]`, `/portal`, `/portal/[module]`
- SEO: `/sitemap.xml`, `/robots.txt`

Admin modules include website CMS, page builder, media library, services CMS, industries CMS, blog/insights, FAQ, pricing packages, legal pages, careers, leads CRM, quote requests, tickets, client management, documents, testimonials, navigation, footer, settings, audit logs, and user/role management.

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@host:5432/cyvrix?schema=public"
AUTH_SECRET="generate-a-long-random-secret"
RESEND_API_KEY=optional_resend_api_key
MAIL_FROM="CYVRIX Technologies <noreply@cyvrix.co.uk>"
ADMIN_NOTIFICATION_EMAIL=admin@example.co.uk
```

Do not expose service-role keys to the browser.

## Database Setup

Run Prisma migrations against PostgreSQL:

```bash
npm run prisma:generate
npm run prisma:migrate
```

The Prisma schema includes the requested models: users/roles/permissions support through role enums and admin modules, client companies, contacts, services, packages, industries, case studies, blog posts, FAQs, legal pages, testimonials, leads, quote requests, proposals, proposal items, tickets, ticket messages, attachments, knowledge base articles, newsletter subscribers, media assets, site settings, navigation items, audit logs, notifications, career jobs, job applications, and landing pages.

## Development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
npm run lint
npm run build
```

Default seeded admin:

- Email: `admin@cyvrix.co.uk`
- Password: `ChangeMeNow!2026`

Change this immediately after first login.

## Supabase PostgreSQL

Set `DATABASE_URL` to the Supabase PostgreSQL connection string with `sslmode=require`. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Security Notes

- Admin and portal routes are protected in `src/proxy.ts` and server-side role checks.
- Admin role redirects use the custom CYVRIX session cookie and Prisma user role.
- Form submissions validate with Zod, sanitize angle brackets, rate-limit in process, save through Prisma, and queue email notifications.
- Security headers are configured in `next.config.ts`.
- Rich legal and policy content includes a legal review notice.
- Upload UI is present; production storage should enforce MIME, size, antivirus scanning where appropriate, and signed access policies.
