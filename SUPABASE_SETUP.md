# Supabase Infrastructure & Database Setup

This guide details how to configure Supabase for database storage, bucket security, and Row Level Security (RLS) to support the premium CYVRIX Technologies platform.

---

## 1. Project Initialization

1. Sign in to your [Supabase Dashboard](https://supabase.com).
2. Create a new project:
   - **Name**: `CYVRIX Technologies`
   - **Database Password**: *Securely generate and save this password*
   - **Region**: `London (eu-west-2)` (for UK performance and GDPR compliance)
   - **Plan**: Free or Pro

---

## 2. Environment Variables Integration

Inside your Next.js application, configure the connection to your Supabase instance by copying the database credentials into your `.env.local` or Vercel dashboard.

```bash
# PostgreSQL direct connection (used by Prisma)
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres?sslmode=require&schema=public"

# Supabase Auth & Storage API variables (if using client-side SDK)
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"
```

---

## 3. Database Migration and Schema Provisioning

Prisma is used as the ORM to manage state and relational queries. Run these commands inside the `cyvrix-next` root directory to synchronize the database schema:

```bash
# 1. Install dependencies
npm install

# 2. Generate the custom Prisma client
npm run prisma:generate

# 3. Apply schema migrations directly to Supabase
npx prisma db push

# 4. Seed baseline CYVRIX system structures and default Admin account
npm run seed
```

> [!WARNING]  
> The default seeded administrator email is `admin@cyvrix.co.uk` and the default password is `ChangeMeNow!2026`. You **must** log in immediately upon deployment and update your password in the profile section.

---

## 4. Storage Buckets Configuration

CYVRIX requires four storage buckets within Supabase Storage. Create these buckets under **Storage > Buckets**:

| Bucket Name | Public Access | Allowed File Types | Purpose |
| :--- | :---: | :--- | :--- |
| `public-media` | **Enabled** | Images, SVGs, PDFs | Public website assets, service icons, blog illustrations. |
| `private-documents` | *Disabled* | PDFs, DOCX, XLSX | High-security SLA contracts, audit maps, corporate proposals. |
| `ticket-attachments` | *Disabled* | Images, logs, PDFs | Active support desk screenshots and diagnostic attachments. |
| `avatars` | **Enabled** | JPEGs, PNGs, SVGs | Profile photos for staff, agents, and client accounts. |

---

## 5. Storage Row Level Security (RLS) Policies

To enforce tenant isolation and satisfy UK security compliance regulations, apply the following custom RLS policies to the storage objects under **Storage > Policies**:

### A. `public-media` Bucket
- **Read (SELECT)**: Allow `public` access (anonymous reads).
- **Write/Modify (INSERT, UPDATE, DELETE)**: Restrict to authenticated users with roles of `SUPER_ADMIN`, `ADMIN`, or `CONTENT_MANAGER`.
  ```sql
  -- SQL representation for Write restriction
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      JOIN public.roles r ON ur.role_id = r.id 
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')
    )
  )
  ```

### B. `private-documents` Bucket
- **Read (SELECT)**: Allow if the user's `client_company_id` matches the document metadata, or if the user is a `SUPER_ADMIN`, `ADMIN`, or `SALES_USER`.
- **Write/Modify**: Restrict to `SUPER_ADMIN` or `ADMIN`.

### C. `ticket-attachments` Bucket
- **Read (SELECT)**: Allow access if the user is the ticket submitter or is an authorized agent/analyst (`SUPER_ADMIN`, `ADMIN`, `SUPPORT_AGENT`).
- **Write (INSERT)**: Allowed for authenticated users submitting a support ticket.

### D. `avatars` Bucket
- **Read (SELECT)**: Allow `public` access.
- **Write (INSERT, UPDATE)**: Allow authenticated users to upload only their own avatar (`auth.uid() = owner_id`).

---

## 6. Verification and Diagnostics

To confirm the integration is performing properly:
1. Log in to the [CYVRIX Admin Panel](/admin/login) using the seeded credentials.
2. Visit `/admin/audit-logs` or `/admin/users` to verify active records.
3. Test a public form (e.g., [Book Consultation](/book-consultation) or [Contact](/contact)) and verify that the request is successfully written to the database under `/admin/leads` or `/admin/quotes`.
