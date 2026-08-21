/**
 * Verified registered details for the operating company.
 *
 * Sourced from the Companies House public register for CYVRIX LIMITED
 * (company number 15902542) and confirmed on 21 August 2026:
 * https://find-and-update.company-information.service.gov.uk/company/15902542
 *
 * These values appear in legal documents, so only add a field here when it can
 * be verified against an authoritative public register or a document the
 * company holds. Anything unverified belongs in `unverifiedDetails` below,
 * which is never rendered as fact.
 */
export const companyFacts = {
  /** Exact registered name as recorded at Companies House. */
  registeredName: "CYVRIX LIMITED",
  /** Trading name used across the website. */
  tradingName: "CYVRIX",
  companyNumber: "15902542",
  incorporatedOn: "17 August 2024",
  registeredIn: "England and Wales",
  registeredOffice: "44 Addison Road, Neath, Wales, SA11 2AY",
  companyType: "Private limited company",
  /** SIC codes recorded against the company that describe the technology business. */
  natureOfBusiness: [
    "62020 — Information technology consultancy activities",
    "62090 — Other information technology service activities",
  ],
} as const;

/**
 * Details a legal document normally states that CYVRIX has not yet confirmed.
 *
 * Each entry is deliberately absent from the published pages. Supply the real
 * value through the Legal Pages CMS before relying on the document, rather than
 * substituting a plausible-looking placeholder.
 */
export const unverifiedDetails = [
  "ICO data protection fee registration number",
  "VAT registration number",
  "Named data protection contact or Data Protection Officer",
  "Professional indemnity and cyber insurance details",
] as const;

/** Registered-company statement required on UK business websites. */
export function registeredCompanyLine(): string {
  return `${companyFacts.registeredName} is a ${companyFacts.companyType.toLowerCase()} registered in ${companyFacts.registeredIn}, company number ${companyFacts.companyNumber}, with its registered office at ${companyFacts.registeredOffice}.`;
}
