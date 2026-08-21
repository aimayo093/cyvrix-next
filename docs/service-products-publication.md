# Service products publication workflow

## Purpose

The Service Products CMS provides a controlled way to publish productised service plans. It is intended for clear commercial starting points such as Managed IT Essential, Managed IT Business and Managed IT Complete; it is not a substitute for a reviewed proposal or service agreement.

## Prepared database change

`prisma/migrations/20260815000000_service_products_cms/migration.sql` is prepared only. It has not been applied to any database.

The change adds a public description, recommended customer shape, price-display mode, CTA, published status, sort order and update timestamp to `ServicePackage`. Existing records are retained as drafts so nothing becomes public automatically.

## Publishing rules

1. Create or edit the product in **Admin → Service Products**.
2. Confirm its public description, feature list, customer fit and selected enquiry route are accurate.
3. Keep it as a draft until the commercial owner approves the wording.
4. For `EXACT` or `FROM` pricing, enable public price visibility and provide the approved monthly or annual amount. Otherwise the public page falls back to **Request pricing**.
5. Use `HIDDEN` only when no pricing treatment should appear at all.
6. Publish the product deliberately. The public pricing query renders published products only.

## Safety controls

- CTA destinations are restricted to the approved consultation and assessment routes.
- Server actions require an authenticated administrator, validate fields, record an audit event and invalidate the pricing cache.
- The public route filters for published products. If the database is unavailable or no product is published, the page uses the reviewed static managed-service plans without showing an unsupported price.
- No product should promise a response time, SLA, certification, customer outcome or service inclusion that is not covered by the relevant agreement and operational capability.

## Staging checks

Apply the migration only through the approved staging workflow, then confirm draft packages remain private, request-pricing cards show no price, and each CTA retains its selected service in the booking form. Production requires separate approval after those checks pass.
