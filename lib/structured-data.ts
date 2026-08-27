/**
 * Schema.org structured data for the public site.
 *
 * Centralised for the same reason the rest of the public claims are: every
 * value here is a public statement about CYVRIX, and search engines treat it as
 * one. Anything that would be a credibility problem in page copy is a
 * credibility problem here too, so this module only emits facts that are
 * verifiable from Companies House, the ICO register, or the site's own content.
 *
 * Deliberately NOT emitted:
 *   - `LocalBusiness` / `ProfessionalService`. Those types describe a place
 *     customers visit. The filed address is a registered office, not a
 *     storefront, and an address mismatch is worse for search than no markup.
 *     `Organization` with a locality-level `PostalAddress` says the true thing.
 *   - `aggregateRating`, `review`, `numberOfEmployees`, `award`. No evidence.
 *   - `hasCredential` for ISO 27001. Not held. See `certificationStatus`.
 *   - `priceRange` and `offers.price`. Pricing is quoted per engagement.
 */
import { companyFacts } from "@/lib/company-facts";
import { canPublishFounderIdentity, founder, founderCertifications } from "@/lib/founder";

export const SITE_URL = "https://cyvrix.co.uk";

/** Stable node id so other graphs can reference the company rather than repeat it. */
export const ORGANISATION_ID = `${SITE_URL}/#organisation`;
const WEBSITE_ID = `${SITE_URL}/#website`;

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];
export type JsonLdObject = { [key: string]: JsonLdValue | undefined };

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * "17 August 2024" as it appears on the register, to the ISO date schema.org wants.
 *
 * Parsed by hand rather than through `Date.parse` + `toISOString`. That pairing
 * reads the string as local midnight and then prints it in UTC, so under BST an
 * incorporation date of 17 August is published as 2024-08-16. A register date
 * has no time and no timezone, and this keeps it that way.
 */
function toIsoDate(readable: string): string | undefined {
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(readable.trim());
  if (!match) return undefined;

  const [, day, monthName, year] = match;
  const month = MONTHS.indexOf(monthName.toLowerCase());
  if (month === -1) return undefined;

  return `${year}-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * The company's address for schema.org.
 *
 * The filed registered office is residential and withheld from the public site,
 * so no street line or postcode is emitted. Leaving them in JSON-LD would put
 * the address in the page source, which is not withholding it. Locality and
 * region are published, which is true and enough for a search engine to place
 * the company.
 */
function registeredAddress(): JsonLdObject {
  if (companyFacts.publishRegisteredOffice) {
    const [street, locality, region, postcode] = companyFacts.registeredOffice
      .split(",")
      .map((part) => part.trim());

    return {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: locality,
      addressRegion: region,
      postalCode: postcode,
      addressCountry: "GB",
    };
  }

  return {
    "@type": "PostalAddress",
    addressLocality: companyFacts.registeredTown,
    addressRegion: "Wales",
    addressCountry: "GB",
  };
}

/**
 * The company itself. Emitted once, site-wide, from the public layout.
 *
 * `identifier` carries the Companies House number and `ZC075683` is the ICO
 * registration; both are checkable against a public register, which is the test
 * every claim on this site has to pass.
 */
export function organisationSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANISATION_ID,
    name: companyFacts.registeredName,
    alternateName: [companyFacts.tradingName, ...companyFacts.otherNames],
    legalName: companyFacts.registeredName,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/cyvrix-logo-color.png`,
    description:
      "CYVRIX LIMITED is a UK managed IT and cybersecurity company providing managed services, cloud and security consulting, field engineering and professional services.",
    foundingDate: toIsoDate(companyFacts.incorporatedOn),
    address: registeredAddress(),
    // Both are true and they are not the same claim. On-site and field work is
    // South Wales; remote managed services reach the whole country. Saying only
    // "United Kingdom" hides the thing a local competitor cannot match.
    areaServed: [
      { "@type": "AdministrativeArea", name: "South Wales" },
      { "@type": "Country", name: "United Kingdom" },
    ],
    identifier: [
      {
        "@type": "PropertyValue",
        name: "Companies House company number",
        value: companyFacts.companyNumber,
      },
      {
        "@type": "PropertyValue",
        name: "ICO registration reference",
        value: companyFacts.icoRegistrationNumber,
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact`,
      areaServed: "GB",
      availableLanguage: "en-GB",
    },
    // A named founder with verifiable credentials is the strongest entity signal
    // available to a company this size, but schema.org Person requires a name and
    // the founder's is withheld by preference. Emitting the node anyway would put
    // the name in the page source, which is not withholding it. So the whole node
    // is omitted until `publishName` is turned on, rather than shipping a
    // half-anonymous Person that leaks the thing it is meant to protect.
    founder: canPublishFounderIdentity()
      ? {
          "@type": "Person",
          name: founder.name,
          jobTitle: founder.role,
          sameAs: [founder.linkedIn],
          hasCredential: founderCertifications.map((certification) => ({
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "certificate",
            name: certification.name,
            recognizedBy: { "@type": "Organization", name: certification.issuer },
          })),
        }
      : undefined,
  };
}

/**
 * The site, including the internal search endpoint so search engines can offer
 * it directly. `/search` is a real route; this is not an aspirational claim.
 */
export function webSiteSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: companyFacts.tradingName,
    publisher: { "@id": ORGANISATION_ID },
    inLanguage: "en-GB",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export type BreadcrumbItem = { name: string; path: string };

/** Trail from the home page down to the current one. */
export function breadcrumbSchema(trail: BreadcrumbItem[]): JsonLdObject {
  const items = [{ name: "Home", path: "/" }, ...trail];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

/**
 * A single service.
 *
 * No `offers` block: we do not publish a price, and inventing one so the markup
 * looks complete would be exactly the kind of claim this site does not make.
 */
export function serviceSchema(service: {
  title: string;
  description: string;
  slug: string;
  category?: string | null;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    url: `${SITE_URL}/services/${service.slug}`,
    serviceType: service.category || undefined,
    provider: { "@id": ORGANISATION_ID },
    areaServed: { "@type": "Country", name: "United Kingdom" },
  };
}

/**
 * An Insight article.
 *
 * `author` is the Organization rather than a fabricated person: these pieces are
 * published under the company name, and inventing a byline to satisfy a schema
 * field would be a claim about a person who does not exist.
 */
export function articleSchema(post: {
  title: string;
  excerpt: string;
  slug: string;
  publishedAt?: string | null;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    author: { "@id": ORGANISATION_ID },
    publisher: { "@id": ORGANISATION_ID },
    datePublished: post.publishedAt || undefined,
    inLanguage: "en-GB",
  };
}

/** Questions and answers as they appear on the page — never a longer set. */
export function faqSchema(faqs: Array<{ question: string; answer: string }>): JsonLdObject | null {
  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Serialise for a `<script type="application/ld+json">` body.
 *
 * `<` is escaped so a stray closing tag inside any CMS-authored value cannot
 * break out of the script element. `undefined` values are dropped by
 * JSON.stringify, which is why optional fields above are left undefined rather
 * than set to empty strings.
 */
export function jsonLdString(schema: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
