# Trust & Credentials publication workflow

## Current preview state

The prepared migration at `prisma/migrations/20260814000000_trust_credentials_controls/migration.sql` has **not** been applied. Public trust content is deliberately withheld until the migration, CMS controls and review process below are complete. This includes partner logos, customer logos, compliance badges, testimonials, case-study previews and CMS statistics.

## Required CMS changes

Add the following fields to the Partner Logos, Trusted Logos, Compliance Cards, Testimonials and Case Studies editors:

| Field | Required before publication | Purpose |
| --- | --- | --- |
| Verification status | `VERIFIED` | Prevents a draft, expired or rejected record from being public. |
| Verification reference | Yes | Certificate number, partner directory identifier, customer approval reference or review ticket. |
| Evidence URL | Yes | Private evidence record or authoritative public verification page. |
| Evidence reviewer and review date | Yes | Makes the decision accountable and auditable. |
| Expiry date | When the record can expire | Removes an expired certification, partnership or permission from public display. |
| Permission confirmed | Yes for customer logos, testimonials and case studies | Confirms the client approved the exact public use. |
| Permission evidence and date | Yes for customer proof | Links the signed release or written approval and its date. |
| Public visibility | `true` only after all checks pass | A separate, deliberate publishing control. |

The CMS should make `Public visibility` unavailable unless the required fields are complete. If an expiry date is in the past, it should automatically clear public visibility and show a reviewer task.

The local CMS actions now enforce this gate on every save: an incomplete, expired or non-verified record is saved with `public_visibility = false`. Permission evidence is required for customer logos, testimonials and case studies; it is not required for an issuer credential unless the issuer's terms require it.

## Publication rules

A public query must require all applicable conditions:

```text
is_visible = true
AND public_visibility = true
AND verification_status = VERIFIED
AND evidence_url is present
AND (expires_at is null OR expires_at > now)
AND permission_confirmed = true
```

For testimonials, retain the existing `approved` and `featured` controls as additional requirements. For case studies, retain `published` as an additional requirement. Do not use a brand logo, a title such as "certified", a quote, an outcome or a client name as a substitute for the evidence record.

## Editorial requirements

- Credentials: use the issuer's exact name and status; link to an authoritative verification page where one exists. Do not infer certification from a product capability, framework alignment or advisory experience.
- Partner and customer logos: obtain approval for the specific logo, placement and link. Keep the approval private and record any end date.
- Testimonials: store the exact approved wording, attribution format and approval evidence. Never create representative quotes or anonymised client descriptions that could be read as real customer feedback.
- Case studies: publish only a factual challenge, agreed scope, delivery summary and client-approved outcomes. Attribute metrics to their method and period, or omit them.
- Metrics: include a source, measurement period and reviewer. Do not publish response, uptime, satisfaction or project-result figures without evidence.

## Safe release sequence

1. Back up and review the affected database records in a non-production environment.
2. Apply the prepared migration there, regenerate the Prisma client, and use the implemented CMS validation described above.
3. The public queries now enforce the publication rules. Keep `renderVerifiedTrustContent` in `components/shared/SectionRenderer.tsx` disabled until the migration is applied, a small set of records is reviewed, and their rendering has been checked.
4. Add a small number of fully evidenced records and verify their public pages, expiry behaviour and removal behaviour.
5. Obtain a separate approval before applying the migration or changing production content.

The prepared migration hides existing trust and proof records rather than deleting them, so every existing record must be consciously reviewed before it can reappear.
