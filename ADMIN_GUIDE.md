# CYVRIX Technologies Admin & CMS Guide

Welcome to the premium CYVRIX Technologies Business Control Panel and CMS. This guide details how to manage the website content, client accounts, support desks, and operations logs.

---

## 1. Initial Login & Setup

The admin panel is securely located at the `/admin` path of the CYVRIX platform. 

### Credentials
- **URL**: `https://your-domain.co.uk/admin` (or `http://localhost:3000/admin` in development)
- **Default Email**: `admin@cyvrix.co.uk`
- **Default Password**: `ChangeMeNow!2026`

> [!IMPORTANT]  
> To protect corporate data and security status, update the administrator password immediately after logging in for the first time. Navigate to the **Profile & Company** section inside the Control Panel to make this update.

---

## 2. Admin Modules Overview

The CYVRIX Admin dashboard is split into dedicated, secure modules designed to manage specific operational areas of the agency:

### A. Website CMS & Page Builder
- **Path**: `/admin/pages`
- Edit public landing pages, legal texts, custom meta descriptions, and Open Graph previews for search optimization (SEO).
- Draft or publish pages dynamically with full sort order control.

### B. Dynamic Services & Industry Managers
- **Paths**: `/admin/services`, `/admin/industries`
- Create and edit service offerings (e.g. *Managed IT Support*, *Cybersecurity Services*) and vertical pages (e.g. *Logistics*, *Fintech*).
- Define included scopes, client problems solved, step-by-step processes, and specific compliance mappings.

### C. Case Studies & Insights (Blog)
- **Paths**: `/admin/case-studies`, `/admin/blog`
- Share corporate success stories detailing client challenges, custom solutions, and positive outcomes.
- Publish search-optimized technology guides and blog posts categorized by strategic tags.

### D. Leads CRM & Quotes Panel
- **Paths**: `/admin/leads`, `/admin/quotes`
- Track inbound sales inquiries submitted via the [Contact Form](/contact).
- Generate, update, and manage formal corporate scopes and proposals for prospects and existing clients.

### E. Support Desk (Tickets)
- **Path**: `/admin/tickets`
- Respond directly to client support tickets submitted through the public help form or the secure Client Portal.
- Track ticket numbers, assign priorities (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), categorize, and post client-facing message replies.

### F. Client Account Management & Document Vault
- **Paths**: `/admin/clients`, `/admin/media`
- Create Client Company records (assigning legal name, custom contacts, and partnership notes).
- Upload critical PDF deliverables, network maps, SLA agreements, or compliance sheets directly into the secure, encrypted **Document Vault**.

### G. Security Audit Logs
- **Path**: `/admin/audit-logs`
- View a permanent, chronological audit trail recording administrative actions (user log-ins, page modifications, proposal creation, and ticket status changes) to ensure complete data integrity.

---

## 3. Creating a New Client Portal Account

To onboard a new corporate client onto the secure Client Portal:

1. **Create the Company Record**:
   - Navigate to `/admin/clients` and click **New Client Company**.
   - Input the registered corporate details (e.g., registered name, primary billing, and security contacts) and save.

2. **Register the Client User**:
   - Navigate to `/admin/users` and click **Create User**.
   - Input the client's email, name, and associate them with the newly created Client Company.
   - Set their role to `CLIENT`.
   - Vercel/Supabase Auth will issue an invite or you can communicate their login credentials.

3. **Upload covered services**:
   - Navigate to `/admin/quotes` and create an active Proposal containing their SLA pricing.
   - Once they accept the proposal, the system activates their Covered Technologies dashboard immediately.
