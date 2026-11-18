/**
 * Synthetic OCDS releases shaped like the real Find a Tender and Public
 * Contracts Scotland responses (sampled 18 November 2026). Every name, email and
 * number here is invented.
 */
import type { OcdsRelease } from "../../../lib/procurement/ocds";

export function release(over: {
  ocid: string;
  id: string;
  title: string;
  cpv?: string;
  extraCpv?: string[];
  buyer?: string;
  deadline?: string;
  amount?: number;
  tag?: string[];
  description?: string;
  canonical?: string;
  contactEmail?: string | null;
}): OcdsRelease {
  const buyer = over.buyer ?? "Example County Council";
  return {
    ocid: over.ocid,
    id: over.id,
    date: "2026-11-18T08:00:00Z",
    tag: over.tag ?? ["tender"],
    buyer: { id: "B-1", name: buyer },
    parties: [
      {
        id: "B-1",
        name: buyer,
        roles: ["buyer"],
        contactPoint:
          over.contactEmail === null ? undefined : { name: "Pat Example", email: over.contactEmail ?? "procurement@example.gov.uk", telephone: "+44 0000 000000" },
        address: { region: "UKL" },
      },
      { id: "R-1", name: "Example Review Body", roles: ["reviewBody"], contactPoint: { url: "https://review.example" } },
    ],
    links: over.canonical ? [{ rel: "canonical", href: over.canonical }] : undefined,
    tender: {
      title: over.title,
      description: over.description ?? "Synthetic notice for tests.",
      status: "active",
      value: over.amount === undefined ? undefined : { amount: over.amount, currency: "GBP" },
      tenderPeriod: { endDate: over.deadline ?? "2026-12-15T12:00:00Z" },
      classification: { scheme: "CPV", id: over.cpv ?? "72000000" },
      items: [
        {
          additionalClassifications: (over.extraCpv ?? []).map((id) => ({ scheme: "CPV", id })),
          deliveryAddresses: [{ region: "UKL" }],
        },
      ],
    },
  };
}

export const ftsItSupport = release({ ocid: "ocds-h6vhtk-0aaaa1", id: "100001-2026", title: "Managed IT Support Services", cpv: "72253000", amount: 250000 });
export const ftsTraining = release({ ocid: "ocds-h6vhtk-0aaaa2", id: "100002-2026", title: "Leadership training framework", cpv: "80000000" });
export const ftsKeywordOnly = release({
  ocid: "ocds-h6vhtk-0aaaa3",
  id: "100003-2026",
  title: "Library refurbishment including Wi-Fi and structured cabling",
  cpv: "45000000",
});
/** The same tender as ftsItSupport, republished on Public Contracts Scotland under its own OCID. */
export const pcsCopyOfItSupport = release({
  ocid: "ocds-r6ebe6-0000000001",
  id: "rls-1-NOV000001",
  title: "Managed IT support services",
  cpv: "72253000",
  canonical: "https://api.publiccontractsscotland.gov.uk/v1/Notice?id=ocds-r6ebe6-0000000001",
});
export const pcsCyber = release({
  ocid: "ocds-r6ebe6-0000000002",
  id: "rls-1-NOV000002",
  title: "Cyber security assessment",
  cpv: "79000000",
  buyer: "Example Health Board",
  contactEmail: "tenders@example.nhs.example",
});
export const awardOnly = release({ ocid: "ocds-h6vhtk-0aaaa4", id: "100004-2026", title: "Network refresh award", cpv: "32420000", tag: ["award"] });

export const SAMPLE_REPORT = `Cyvrix UK Daily Leads - 18 November 2026

## Commercial opportunities
1. **Example Logistics Ltd** - moving to new Swansea offices, hiring an IT manager. https://example.com/news/move
2. Example Dental Group – replacing its managed service provider (press release) https://example.com/dental

## Government and public sector
- Example Borough Council: invitation to tender for desktop support, deadline 5 December. https://www.find-tender.service.gov.uk/Notice/100009-2026
- Example University RFQ for Wi-Fi survey
  Further detail on a second line, still the same lead.

## Defence and security-cleared
* Example Defence Supplier seeks SC-cleared field engineers (subcontract). https://example.com/defence
* Example Defence Supplier seeks SC-cleared field engineers (subcontract). https://example.com/defence
`;

export const PARAGRAPH_REPORT = `Example Retail Ltd is opening three stores in Cardiff and needs on-site IT.
Source: https://example.com/retail

Example Housing Association published a tender for cyber security services.
https://example.com/housing`;
