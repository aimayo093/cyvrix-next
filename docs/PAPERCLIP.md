# Connecting Paperclip to the CYVRIX website

Paperclip runs on your own computer, so the website cannot call it. Instead,
Paperclip's agents call the website: they read what is happening and submit
drafts, and you approve anything before it goes public. Why it is built this
way is in `docs/DECISIONS.md` section 15.

```
Paperclip (your computer)                    cyvrix.co.uk
  CEO agent ──── read token ───────────▶  GET  /api/integrations/paperclip/snapshot
  CEO / CMO ──── read token ───────────▶  GET  /api/integrations/paperclip/feed
  Copywriter ─── draft token ──────────▶  POST /api/integrations/paperclip/drafts
  Social Mgr ─── draft token ──────────▶  POST /api/integrations/paperclip/drafts
  any drafter ── draft token ──────────▶  GET  /api/integrations/paperclip/drafts?since=…
                                                       │
                                     you, in /admin/ai-drafts: edit, approve, reject
```

## 1. Make two tokens

Run this twice, once per token, and keep each value somewhere safe (a password
manager). They must be different. Never paste them into a chat or a ticket.

```bash
openssl rand -hex 32
```

- **Read token**: lets an agent see enquiries, tickets, privacy requests and
  the company snapshot. **Do not give it to any agent running on DeepSeek** (or
  any model provider without a UK or EU data-processing agreement): the feed
  contains names and contact details. The snapshot has no personal data, but
  shares the token. See DECISIONS section 15.
- **Draft token**: lets an agent submit drafts and see your review. It cannot
  read client data. Give it to the marketing agent.

## 2. Add them to Vercel

Vercel → the **cyvrix-next** project → **Settings → Environment Variables**,
Production, **Sensitive** on:

| Name | Value |
| --- | --- |
| `PAPERCLIP_READ_TOKEN` | the read token |
| `PAPERCLIP_DRAFT_TOKEN` | the draft token |

Then **Deployments → latest Production → ⋯ → Redeploy**. Until a token is set,
its routes answer 404, as if they did not exist.

The Security Center's **Paperclip Integration Tokens** check confirms both are
set, long enough and different. AI drafts shows "drafts on · read on".

## 3. Let Paperclip through the firewall

Bot protection challenges anything that is not a browser, which includes
Paperclip. Add one rule:

Vercel → project → **Firewall → Configure → + New Rule**

- **Name:** `Paperclip integration`
- **If:** *Request Path* → *Starts with* → `/api/integrations/`
- **Then:** **Bypass**
- **Save**, then **Review changes → Publish**

The tokens still protect these routes, and the site rate-limits them (300
requests an hour per address, 120 reads and 60 draft calls an hour in total).

## 4. Give the tokens to Paperclip

In Paperclip, add the tokens as company secrets (for example
`CYVRIX_READ_TOKEN` and `CYVRIX_DRAFT_TOKEN`) and reference them only from the
agents that need each one. Load `docs/paperclip-skill.md` into every agent
that talks to the website: it explains the API, the content rules and how to
read your feedback.

## 5. A suggested team

| Agent | Reports to | Token | Heartbeat | Job |
| --- | --- | --- | --- | --- |
| CEO | you (board) | read | daily | Read `/snapshot`, set the week's priorities, raise **proposals** |
| CMO | CEO | read | daily | Read `/snapshot` and `/feed`, plan content, brief the team |
| Copywriter | CMO | draft | every 8 hours | Write **blog** and **email** drafts |
| Social Manager | CMO | draft | every 12 hours | Write **social** drafts for LinkedIn first |

Start with one agent, the Copywriter, and check one draft end to end before
adding the rest. Paperclip budgets cap spend per agent; set them before
turning heartbeats on.

## 6. Reviewing

Open **Admin → AI drafts** (the sidebar badge counts what is waiting):

- **Blog**: approving creates a *draft* post in Blog & Insights. Publish it from there.
- **Email**: approving opens the Email page with subject and body filled in. Add the recipient and send.
- **Social**: approving makes it ready. Copy it (or "Open in LinkedIn"), post it, then **Mark as posted**.
- **Proposals**: accept or reject. You carry out the action.

Anything that breaks the site's claims rules (a certification not held, an
uptime figure, a guarantee, a client count, a superlative) shows in red and
cannot be approved until you edit it out. Rejecting needs a reason: the agent
reads it on its next heartbeat and should do better next time.

## Checking it works

```bash
curl -s https://cyvrix.co.uk/api/integrations/paperclip/snapshot -H "Authorization: Bearer $CYVRIX_READ_TOKEN"
```

A JSON snapshot means reading works. A 404 means the token is not set in
Vercel (or the deploy predates it); 401 means the token is wrong; an HTML page
mentioning "Vercel Security Checkpoint" means the firewall rule in step 3 is
missing.
