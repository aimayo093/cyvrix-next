# Staging trust-release checklist

## Scope and guardrail

This checklist is for a **staging environment only**. It does not authorise a production migration, content publication, deployment, account change or external message.

The local branch contains Prisma client and schema changes that expect the Trust & Credentials and Service Products columns to exist. Do not deploy the related code to an environment until the prepared migrations have been applied and verified there.

## Before staging

- [ ] Confirm the target is an isolated staging database and application URL.
- [ ] Capture a restorable backup or snapshot of the affected staging database.
- [ ] Record the migration filename and current migration history.
- [ ] Confirm `DATABASE_URL` targets staging and no production credentials are loaded.
- [ ] Confirm all reviewers understand that public trust rendering remains disabled.

## Apply and verify

- [ ] Apply `prisma/migrations/20260814000000_trust_credentials_controls/migration.sql` in staging through the approved migration workflow.
- [ ] Apply `prisma/migrations/20260815000000_service_products_cms/migration.sql` in staging through the approved migration workflow.
- [ ] Regenerate the Prisma client from the staging-compatible schema.
- [ ] Confirm every affected table has the review, evidence, expiry, permission and public-visibility columns.
- [ ] Confirm existing partner logos, client logos and compliance cards are hidden; testimonials are unapproved/unfeatured; case studies are unpublished.
- [ ] Confirm the verification-status constraint accepts only `PENDING`, `VERIFIED`, `EXPIRED` and `REJECTED`.
- [ ] Confirm existing service packages remain drafts and the new product fields for customer fit, price display, CTA, public status and sort order are present.

## Content and behaviour checks

- [ ] Create one fully evidenced credential and one fully permissioned customer-proof record.
- [ ] Verify incomplete, expired, rejected and permissionless records save with public visibility disabled.
- [ ] Verify a verified, current record can be marked for public visibility but is still not rendered while `renderVerifiedTrustContent` is disabled.
- [ ] Enable rendering only in staging after the public query filters have been reviewed.
- [ ] Verify a qualifying record renders in its intended location.
- [ ] Change the record to expired, remove evidence or remove permission; verify it disappears without relying on a manual content deletion.
- [ ] Verify all four enquiry routes still preselect the correct service.
- [ ] Create a service product as a draft, then publish it only after its public description, CTA and any exact/from price have been approved.
- [ ] Verify the pricing page never displays a price when price visibility is off, a price is missing, or the product uses Request pricing/Hidden mode.
- [ ] Check the homepage, Services, Contact, Case Studies and each enquiry route in a browser.

## Rollback

- [ ] If schema or application checks fail, disable the staging deployment or revert the application release before touching data.
- [ ] Keep public trust rendering disabled throughout investigation.
- [ ] Restore the staging backup/snapshot if database state must be reverted. Do not improvise a destructive down migration against production.
- [ ] Record the failure, the exact migration state and corrective action before retrying.

## Production gate

Production requires a separate approval after the staging checklist passes, real evidence has been reviewed, browser checks pass, and a production backup/rollback owner is named.
