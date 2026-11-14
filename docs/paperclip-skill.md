# Skill: working with the CYVRIX website

Load this into every Paperclip agent that reads from or writes to
cyvrix.co.uk. It tells you what you can do, how, and the rules your writing
must follow. A person reviews everything you submit; nothing you send is
published automatically.

## Who CYVRIX is

A small managed IT and cybersecurity company in **Neath, South Wales**,
incorporated in August 2024. On-site work covers **Neath, Swansea and Port
Talbot**; remote managed services reach anywhere in the UK. Say the local part
out loud: it is a genuine advantage.

It serves four buyers, and good content helps at least one of them without
putting off the others:

1. **The owner or director with no internal IT** (10–50 staff). Not technical. Wants one accountable person and the truth in plain language.
2. **The office or operations manager** who inherited IT. Needs something they can forward to a director.
3. **The internal IT person** wanting overflow or a specialism. Judges competence, dislikes copy aimed at the first two.
4. **Procurement at a larger organisation**. Cares about registration, insurance and references.

## Writing rules (these are checked)

Your draft is checked against the same rules as the website. A draft that
breaks one is shown to the reviewer in red and **cannot be approved** until it
is fixed, so get it right first time:

| Never write | Why |
| --- | --- |
| That CYVRIX holds a certification: "ISO 27001 certified", "Cyber Essentials certified", SOC 2, CREST, PCI DSS | None is held. ISO 27001 is in progress. You may write about helping clients with "ISO 27001 readiness" or "Cyber Essentials preparation". |
| An uptime, SLA, availability or satisfaction percentage | None is published. |
| A response time promise ("within 1 hour", "under 15 minutes") | None is published. |
| A rating ("4.9/5", "5 out of 5") | There is no review corpus. |
| A count of clients, staff, engineers, devices or users ("50+ clients") | Not published; CYVRIX is small and says so. |
| Superlatives: "award-winning", "leading provider", "world-class", "best-in-class", "#1", "market leader" | Unsupportable. |
| Guarantees: "guaranteed", "100% secure", "zero downtime", "zero breaches" | Nothing in security is guaranteed. |
| Client names, testimonials, case studies or results | None may be invented. |
| The founder's name, or the company's street address | Deliberately withheld. Use "Neath, Wales". |
| That CYVRIX offers automated or AI assessments | That service has not been built. |
| Prices | Pricing is not published. |

**Tone:** plain English, short sentences, no jargon used to sound clever, no
fear-selling ("hackers are coming for you"). Explain what something is, why it
matters to a small business, and what to do first. British spelling.

## The API

Base URL: `https://cyvrix.co.uk/api/integrations/paperclip`

Send your token as `Authorization: Bearer <token>`. Responses are JSON.

| Status | Meaning |
| --- | --- |
| 200 / 201 | OK / created |
| 401 | Wrong token for this route (a draft token cannot read client data) |
| 404 | This part of the integration is switched off |
| 413 | Body over 100 KB |
| 422 | The draft failed validation; `issues` says which field and why |
| 429 | Too many requests; wait for `Retry-After` seconds |

### Read (read token only)

`GET /snapshot` gives the company at a glance: open enquiries and tickets, what
is overdue, the last 30 days, the Security Center score, website traffic and
the drafts queue. **A `null` value means "could not be read", not zero.** Do
not plan around a null.

`GET /feed?cursor=…` gives new leads, tickets, client-visible ticket messages,
privacy requests and the list of unsubscribed addresses. Pass back the
`cursor` you were given to get only what is new. **Never contact an
unsubscribed address.** You cannot reply to anyone through the API; suggest a
reply as a proposal instead.

### Submit a draft (draft token)

`POST /drafts` with `Content-Type: application/json`.

Every draft needs:

- `kind`: `blog`, `email`, `social` or `proposal`
- `idempotencyKey`: 8–100 characters of letters, digits and `._:-`, unique per draft. Reuse the same key when retrying the same draft and you get the original back instead of a duplicate. Use a new key for a revised draft.
- `source`: `{ "agent": "Copywriter", "role": "Marketing", "issueId": "<Paperclip issue id>" }`

All text is **plain text**. HTML is stripped.

**Blog post:**

```json
{
  "kind": "blog",
  "idempotencyKey": "blog-2026-11-backups-v1",
  "source": { "agent": "Copywriter", "role": "Marketing", "issueId": "MKT-42" },
  "title": "How to check your backups would actually restore",
  "summary": "Most small businesses back up. Fewer have tried a restore. Here is how to test one in an afternoon.",
  "category": "Resilience",
  "tags": ["Backups", "Microsoft 365"],
  "body": "Opening paragraph.\n\n## Why a backup is not the same as a restore\n\nParagraph.\n\n## What to test first\n\nParagraph."
}
```

Separate paragraphs with a blank line. A paragraph starting `## ` is a
heading. **At most 24 paragraphs** (headings count) and **8 tags**; more is
refused rather than cut off.

**Email:** `{ "kind": "email", ..., "subject": "…", "body": "…" }`. The
reviewer adds the recipient and sends it from the admin.

**Social post:** `{ "kind": "social", ..., "network": "linkedin", "text": "…", "link": "https://cyvrix.co.uk/blog/…" }`.
`network` is `linkedin`, `facebook`, `x` or `instagram`. Links must be https.
LinkedIn is the priority for this audience.

**Proposal** (for the CEO and CMO: an action you recommend a person takes):

```json
{
  "kind": "proposal",
  "idempotencyKey": "prop-2026-11-11-lead-followup",
  "source": { "agent": "CEO" },
  "title": "Follow up the Swansea accountancy enquiry",
  "rationale": "Enquiry received 6 days ago, still marked new. They asked about Microsoft 365 security.",
  "action": "Reply offering a 30-minute call this week; mention the Microsoft 365 baseline article.",
  "relatesTo": { "type": "lead", "id": "<lead id from the feed>" }
}
```

The response is the stored draft:

```json
{ "id": "…", "kind": "blog", "status": "PENDING", "title": "…",
  "claimFindings": [ { "rule": "guarantee", "excerpt": "…", "note": "Nothing in security is guaranteed." } ],
  "reviewNote": null, "reviewedAt": null, "publishedRef": null, "createdAt": "…", "updatedAt": "…" }
```

**If `claimFindings` is not empty, fix the wording and submit again with a new
`idempotencyKey`.** A draft with findings cannot be approved.

### Read your review results (draft token)

`GET /drafts?since=<ISO time of your last check>` lists drafts changed since
then. `GET /drafts/<id>` returns one. `status` is:

- `PENDING`: waiting for review
- `APPROVED`: accepted (a blog post now exists as an unpublished draft; an email is ready to send; a social post is ready to post)
- `PUBLISHED`: sent or posted
- `REJECTED`: read `reviewNote`, learn from it, and report it to your manager in Paperclip

Check on each heartbeat and write what you learned from any rejection into your
Paperclip issue, so the next draft is better.
