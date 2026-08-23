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
  /** Where we are based, for places a full postal address is more than is wanted. */
  registeredTown: "Neath",
  companyType: "Private limited company",
  /** SIC codes recorded against the company that describe the technology business. */
  natureOfBusiness: [
    "62020 — Information technology consultancy activities",
    "62090 — Other information technology service activities",
  ],
  /**
   * Registration with the Information Commissioner's Office as a data protection
   * fee payer.
   *
   * Source: the ICO public register entry at
   * https://ico.org.uk/ESDWebPages/Entry/ZC075683. The ICO returns 403 to
   * automated requests, so this was taken from the register entry supplied by
   * CYVRIX; the organisation name and address match the Companies House record.
   *
   * A data protection fee registration must be renewed annually. Do not publish
   * the reference once it has lapsed -- use `isIcoRegistrationCurrent()`.
   */
  icoRegistered: true,
  icoRegistrationNumber: "ZC075683",
  icoRegisteredOn: "7 January 2026",
  icoRegistrationExpires: "6 January 2027",
  /** ISO date used for the expiry check. */
  icoRegistrationExpiresIso: "2027-01-06",
  icoPaymentTier: "Tier 1",
  /**
   * Data Protection Officer contact, as published on the ICO register entry.
   * UK GDPR requires the DPO's contact details to be published where one is
   * appointed, and this address is already public on the register, so it is
   * safe to state. It is a role contact, not a personal address.
   */
  dataProtectionOfficerEmail: "paul.iyangbe@cyvrix.co.uk",
  /** Other names recorded against the ICO registration. */
  otherNames: ["CYVhub"] as readonly string[],
} as const;

/**
 * Whether the ICO registration is still current.
 *
 * The registration reference is only published while this returns true, so a
 * lapsed registration is never presented as an active credential.
 */
export function isIcoRegistrationCurrent(now: Date = new Date()): boolean {
  return new Date(companyFacts.icoRegistrationExpiresIso).getTime() > now.getTime();
}

/** Days until the ICO registration expires. Negative once it has lapsed. */
export function daysUntilIcoExpiry(now: Date = new Date()): number {
  const expiry = new Date(companyFacts.icoRegistrationExpiresIso).getTime();
  return Math.ceil((expiry - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Certification and accreditation status.
 *
 * `held` items may be described as held. `inProgress` items may only be
 * described as work in progress and must never be presented as achieved,
 * "aligned", "compliant" or "certified" — the certification decision rests with
 * the certification body, not with CYVRIX.
 */
export const certificationStatus = {
  held: [] as Array<{ name: string; issuer: string; reference: string }>,
  inProgress: [
    {
      name: "ISO/IEC 27001",
      issuer: "Information security management system certification",
      note: "Implementation is underway. CYVRIX is not certified to ISO/IEC 27001 and does not claim to be.",
    },
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
  "VAT registration number",
  "Professional indemnity and cyber insurance details",
] as const;

/** Registered-company statement required on UK business websites. */
export function registeredCompanyLine(): string {
  return `${companyFacts.registeredName} is a ${companyFacts.companyType.toLowerCase()} registered in ${companyFacts.registeredIn}, company number ${companyFacts.companyNumber}, with its registered office at ${companyFacts.registeredOffice}.`;
}
