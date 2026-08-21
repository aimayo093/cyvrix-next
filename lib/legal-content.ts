import { companyFacts, isIcoRegistrationCurrent, registeredCompanyLine } from "@/lib/company-facts";
import type { PublicLegalDocument } from "@/lib/public-legal";

/**
 * Reviewed default legal documents.
 *
 * These are used only when no substantive document has been published through
 * Legal Pages in the CMS; a published CMS record always takes precedence.
 *
 * They describe how this application actually behaves — the forms it exposes,
 * the cookies it sets, the processors it depends on — rather than repeating a
 * generic template. Company identity comes from `lib/company-facts.ts`, which
 * is sourced from the Companies House public register.
 *
 * They are drafts prepared from the system's real behaviour, not legal advice.
 * They should be reviewed by a suitably qualified adviser before the business
 * relies on them, and the gaps listed in `unverifiedDetails` should be filled.
 */

const LAST_REVIEWED = "21 August 2026";

const REVIEW_NOTICE =
  "This document describes how the CYVRIX website and client portal currently operate. It is maintained by CYVRIX and has not been through external legal review. If you need a contractual position confirmed, please contact us before relying on this page.";

export const defaultPrivacyPolicy: PublicLegalDocument = {
  title: "Privacy Policy",
  lastReviewed: LAST_REVIEWED,
  reviewNotice: REVIEW_NOTICE,
  paragraphs: [],
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        registeredCompanyLine(),
        `We are the data controller for personal information collected through this website and the CYVRIX client portal. In this policy, "we", "us" and "our" mean ${companyFacts.registeredName}, trading as ${companyFacts.tradingName}.`,
        companyFacts.icoRegistered && isIcoRegistrationCurrent()
          ? `We are registered with the Information Commissioner's Office as a data protection fee payer, registration reference ${companyFacts.icoRegistrationNumber}. The registration runs to ${companyFacts.icoRegistrationExpires} and is renewed annually.`
          : "",
        `Our Data Protection Officer can be contacted at ${companyFacts.dataProtectionOfficerEmail}. Please use that address for any question about how your information is handled, or to exercise any of the rights set out below. You can also reach us through the contact page on this website.`,
      ],
    },
    {
      heading: "The information we collect",
      paragraphs: [
        "We collect only what we need to respond to you and to run the services you have asked for. What we collect depends on how you use the site.",
        "Enquiry and assessment forms: your name, business name, job title, email address, telephone number, and the details you choose to tell us about your organisation and its technology. Assessment forms also ask about matters such as user numbers, locations, cloud platforms and current security arrangements, so that we can respond usefully.",
        "Quote requests: the same contact details, together with the sector, services and requirements you describe.",
        "Newsletter subscription: your email address, the page you subscribed from, and a record that you gave consent.",
        "Career enquiries: your name, contact details and the information you provide about the role you are interested in. This website does not accept CV or document uploads; we will tell you how to send supporting documents if we take an application forward.",
        "Client portal: your name, work email address, the organisation you belong to, your role, and the support tickets, documents and service records associated with your account.",
        "Technical information: your IP address, the pages you request, and error diagnostics. Sign-in attempts to the portal and administration areas are recorded, including whether they succeeded and the source address, so that we can detect attempts to guess credentials.",
      ],
    },
    {
      heading: "Why we use it, and our lawful basis",
      paragraphs: [
        "Responding to enquiries, quotes and assessment requests: our legitimate interest in answering people who contact us about our services, and taking steps at your request before entering into a contract.",
        "Delivering services to clients, including the portal: performance of the contract between us and your organisation.",
        "Newsletter and marketing email: your consent. You can withdraw it at any time using the unsubscribe link in any message, which does not affect anything sent before you withdrew it.",
        "Security, fraud prevention and service integrity, including sign-in monitoring and rate limiting: our legitimate interest in keeping the platform and our clients' information secure.",
        "Meeting our legal and regulatory obligations, including accounting and record-keeping: compliance with a legal obligation.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "Enquiry and assessment records are kept for as long as needed to respond and to manage any resulting relationship, and are then reviewed and removed when they are no longer required.",
        "Client records are kept for the duration of the engagement and afterwards for the period required by our legal, tax and insurance obligations.",
        "Newsletter records are kept until you unsubscribe, after which we keep a minimal record of the withdrawal so that we do not contact you again in error.",
        "Security and audit records, including sign-in events and administrative actions, are kept for a limited period so that incidents can be investigated, and are then removed.",
      ],
    },
    {
      heading: "Who we share it with",
      paragraphs: [
        "We do not sell personal information, and we do not share it for third-party advertising.",
        "We use a small number of service providers who process information on our instructions: a cloud hosting and database provider that stores the website and portal data, an email delivery provider that sends transactional and subscription email, and an error-monitoring provider that records technical diagnostics when something fails. Optional website analytics run only where you have given analytics consent.",
        "We may disclose information where we are required to do so by law, or to establish, exercise or defend legal claims.",
      ],
    },
    {
      heading: "Where your information is held",
      paragraphs: [
        "Our providers may process information outside the United Kingdom. Where that happens, we rely on the safeguards permitted under UK data protection law, such as UK adequacy regulations or the International Data Transfer Agreement or Addendum, so that your information continues to be protected.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "Under UK GDPR and the Data Protection Act 2018 you have the right to be informed about how your information is used, and to request access to a copy of it.",
        "You may ask us to correct information that is inaccurate or incomplete, and to erase information where there is no continuing reason for us to hold it.",
        "You may ask us to restrict how we use your information, object to processing carried out on the basis of our legitimate interests, and request that information you provided to us is transferred to another organisation where that right applies.",
        "Where we rely on consent, you can withdraw it at any time.",
        `To exercise any of these rights, contact our Data Protection Officer at ${companyFacts.dataProtectionOfficerEmail}. We will respond within one month, and will tell you if we need longer because the request is complex.`,
      ],
    },
    {
      heading: "Complaints",
      paragraphs: [
        "If you are unhappy with how we have handled your information, please tell us first so that we have the opportunity to put it right.",
        "You also have the right to complain to the Information Commissioner's Office, the UK supervisory authority for data protection, at ico.org.uk or by telephone on 0303 123 1113.",
      ],
    },
    {
      heading: "Cookies",
      paragraphs: [
        "This website uses a small number of cookies. Optional cookies are not set until you choose to allow them. Our Cookie Policy explains each one and how to change your choice at any time.",
      ],
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        `This policy was last reviewed on ${LAST_REVIEWED}. If we change how we handle personal information we will update this page, and where the change is significant we will make that clear.`,
      ],
    },
  ],
};

export const defaultTermsOfService: PublicLegalDocument = {
  title: "Terms and Conditions",
  lastReviewed: LAST_REVIEWED,
  reviewNotice: REVIEW_NOTICE,
  paragraphs: [],
  sections: [
    {
      heading: "About these terms",
      paragraphs: [
        registeredCompanyLine(),
        "These terms govern your use of this website and the CYVRIX client portal. By using the site you accept them. If you do not accept them, please do not use the site.",
        "Where CYVRIX supplies services to your organisation, those services are governed by the separate written agreement between us. If anything in that agreement differs from these terms, the agreement takes precedence for the services it covers.",
      ],
    },
    {
      heading: "Using this website",
      paragraphs: [
        "You may use this website for lawful purposes connected with evaluating or receiving our services.",
        "You must not attempt to gain unauthorised access to any part of the site, its infrastructure or any account that is not yours; introduce malicious code; interfere with the availability of the service; or extract content systematically for reuse without our written permission.",
        "We may suspend or withdraw access to the site, in whole or in part, without notice where we consider it necessary, including for maintenance or security reasons.",
      ],
    },
    {
      heading: "Client portal accounts",
      paragraphs: [
        "Portal accounts are issued to named individuals at organisations we work with. You are responsible for keeping your credentials confidential and for activity carried out under your account.",
        "You must tell us promptly if you believe an account has been compromised, or if someone with an account no longer needs access.",
        "Access is granted by role. We may change, suspend or remove access where it is no longer appropriate, including when an engagement ends.",
      ],
    },
    {
      heading: "Information on this site",
      paragraphs: [
        "The content of this website is provided for general information about our services. It does not constitute technical, security, legal or financial advice, and should not be relied on as such.",
        "We describe our capabilities honestly and do not publish certifications, partner status, customer references or performance figures that we cannot evidence. Where a page describes readiness or preparation work for a certification, that does not mean CYVRIX issues or awards that certification.",
        "We take reasonable care to keep the site accurate and current, but we do not warrant that it is free from errors or that it will always be available.",
      ],
    },
    {
      heading: "Intellectual property",
      paragraphs: [
        "The content, design, branding and code of this website belong to CYVRIX or our licensors and are protected by intellectual property law.",
        "You may view and print pages for your own internal use in evaluating or receiving our services. You may not otherwise copy, republish, adapt or commercially exploit any part of the site without our written permission.",
      ],
    },
    {
      heading: "Our liability",
      paragraphs: [
        "Nothing in these terms limits or excludes our liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for anything else that cannot lawfully be limited or excluded.",
        "Subject to that, we are not liable for any loss arising from your use of this website, including loss of profit, loss of business, business interruption, or loss of data arising from reliance on information published here.",
        "Liability in relation to services we supply is dealt with in the written agreement covering those services.",
      ],
    },
    {
      heading: "Links to other sites",
      paragraphs: [
        "Where this website links to a third-party site, that link is provided for convenience. We do not control those sites and are not responsible for their content, availability or privacy practices.",
      ],
    },
    {
      heading: "Changes and governing law",
      paragraphs: [
        `We may update these terms from time to time. They were last reviewed on ${LAST_REVIEWED}, and the version published on this page at the time you use the site is the version that applies.`,
        `These terms and any dispute arising from them are governed by the law of ${companyFacts.registeredIn}, and the courts of ${companyFacts.registeredIn} have exclusive jurisdiction.`,
      ],
    },
  ],
};

export const defaultCookiePolicy: PublicLegalDocument = {
  title: "Cookie Policy",
  lastReviewed: LAST_REVIEWED,
  reviewNotice: REVIEW_NOTICE,
  paragraphs: [],
  sections: [
    {
      heading: "What cookies are",
      paragraphs: [
        "Cookies are small text files that a website stores in your browser. They are used to keep you signed in, to remember a choice you have made, and in some cases to understand how a site is used.",
        "This site keeps its use of cookies deliberately small. Nothing optional is set until you choose to allow it.",
      ],
    },
    {
      heading: "Strictly necessary cookies",
      paragraphs: [
        "These are required for the site to work, and are always active. They cannot be switched off.",
        "cyvrix_cookie_consent — records the cookie choices you have made, and whether you have hidden the preferences control. It is a first-party cookie, restricted to same-site requests, sent only over HTTPS in production, and stored for up to one year so that we do not ask you again on every visit.",
        "cyvrix_session — set only when you sign in to the client portal or administration area. It identifies your signed-in session, is signed to prevent tampering, and expires after eight hours.",
      ],
    },
    {
      heading: "Analytics cookies",
      paragraphs: [
        "These help us understand which pages are useful. They are optional, and the analytics script is not loaded at all until you allow this category.",
        "If you allow analytics, we use Vercel Analytics to record aggregate page views and basic performance information. If you do not allow it, no analytics script is loaded and no analytics cookie is set.",
      ],
    },
    {
      heading: "Preference and marketing cookies",
      paragraphs: [
        "These categories appear in the preferences panel so that your choice is recorded, and they default to off.",
        "We do not currently set any preference or marketing cookie. If that changes, this policy will be updated to describe the cookie before it is used, and your existing choice will continue to be respected.",
      ],
    },
    {
      heading: "Changing your choice",
      paragraphs: [
        "You can change your cookie choices at any time using the Cookie Preferences control in the footer of any page. Your updated choice takes effect immediately.",
        "You can also hide the floating preferences button if you prefer a cleaner page. Hiding it does not change any choice you have made, and the footer control remains available.",
      ],
    },
    {
      heading: "Browser controls",
      paragraphs: [
        "Most browsers let you see the cookies a site has set, delete them, and block cookies entirely. Blocking strictly necessary cookies will prevent parts of this site from working, including signing in to the client portal.",
        "Guidance for the browser you use is normally available in its help or privacy settings.",
      ],
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        `This policy was last reviewed on ${LAST_REVIEWED}. It will be updated if the cookies used by this site change.`,
      ],
    },
  ],
};

const DEFAULTS: Record<string, PublicLegalDocument> = {
  "privacy-policy": defaultPrivacyPolicy,
  "terms-of-service": defaultTermsOfService,
  "cookie-policy": defaultCookiePolicy,
};

/** Reviewed default document for a legal slug, used when the CMS has none published. */
export function getDefaultLegalDocument(slug: string): PublicLegalDocument | null {
  return DEFAULTS[slug] ?? null;
}
