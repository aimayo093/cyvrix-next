import "server-only";

/**
 * The registered office as filed at Companies House for CYVRIX LIMITED.
 *
 * WITHHELD FROM THE PUBLIC SITE (DECISIONS §4). It is a residential address and
 * `companyFacts.publishRegisteredOffice` is false, so nothing may render it:
 * not the footer, not a page, not JSON-LD. `scripts/check-claims.mts` fails the
 * build if the street line or postcode appears anywhere else in source.
 *
 * It lives apart from `lib/company-facts.ts`, behind `server-only`, because
 * that module is imported by client components (the footer, the login page).
 * Withholding means withholding from the page source, and a client import of
 * an object holding this string can put it in the browser bundle whatever the
 * flag says. `server-only` makes such an import a build error instead.
 */
export const REGISTERED_OFFICE = "44 Addison Road, Neath, Wales, SA11 2AY";
