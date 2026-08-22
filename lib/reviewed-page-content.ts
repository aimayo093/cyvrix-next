/**
 * Reviewed page content, expressed as CMS sections.
 *
 * Why this exists: every public page falls back to reviewed static content when
 * the CMS has no sections for it, but the moment a page gains one section the
 * fallback stops rendering entirely. Several pages carried thin CMS content that
 * shadowed much better reviewed copy, and the only ways out were to hand-retype
 * everything in the admin or to delete the CMS rows and lose editability.
 *
 * This is the third way. An administrator restores a page from here and the
 * reviewed copy lands in the CMS as ordinary sections they can then edit.
 *
 * Everything below is written to the same standard as the rest of the public
 * site: no certification we do not hold, no performance figure we cannot
 * evidence, no client outcome, and no statistic. `Statistics` sections are
 * deliberately never produced.
 *
 * Images reference `lib/page-heroes.ts` so a page restored here shows the same
 * imagery as its static fallback.
 */
import { pageHeroes } from "@/lib/page-heroes";

export type ReviewedSection = {
  sectionType: string;
  title?: string;
  subtitle?: string;
  body?: string;
  /** Image URL. On Hero this is the background; on Image and text, the panel. */
  mediaId?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  /** "dark" | "light" | "silver" | "brand" | "azure" | "royal" | "teal" | "glassmorphic" */
  backgroundStyle?: string;
  /** Hero: "left" | "center". Image and text: "left" | "right". */
  layoutStyle?: string;
  settings?: Record<string, unknown>;
};

export type ReviewedPage = {
  slug: string;
  /** How the page is described in the admin restore panel. */
  label: string;
  /** What restoring actually changes, in one sentence. */
  summary: string;
  sections: ReviewedSection[];
};

const heroImage = (key: keyof typeof pageHeroes) => pageHeroes[key].image;

export const reviewedPages: ReviewedPage[] = [
  {
    slug: "about",
    label: "About",
    summary:
      "Replaces the current five sections, including the Statistics block, with the company story grounded in Companies House and ICO facts.",
    sections: [
      {
        sectionType: "Hero",
        subtitle: "About CYVRIX",
        title: "A technology partner that explains its reasoning.",
        body:
          "CYVRIX LIMITED is a UK managed IT and cybersecurity company, incorporated in August 2024 and registered in England and Wales. We look after the systems businesses depend on every day, and we work in a way that treats the client as someone entitled to understand their own environment.",
        buttonLabel: "Book a Free Review",
        buttonUrl: "/book-consultation",
        backgroundStyle: "dark",
        layoutStyle: "left",
        settings: {
          cardImage: heroImage("about"),
          cardTitle: "About CYVRIX",
          secondaryCtaLabel: "See our Trust Centre",
          secondaryCtaUrl: "/trust",
        },
      },
      {
        sectionType: "Text block",
        subtitle: "What we do",
        title: "Four ways organisations work with us.",
        body:
          "Managed services keep an environment stable month to month. Cloud and cybersecurity work addresses the questions that need answering properly rather than quickly. Field engineering puts a competent person on site when the work needs hands. Professional services covers the migrations, deployments and network projects that sit outside day-to-day support.",
        backgroundStyle: "dark",
      },
      {
        sectionType: "Feature cards",
        subtitle: "How we work",
        title: "The commitments behind the work.",
        body:
          "These are the things a client would actually notice, rather than a values statement.",
        backgroundStyle: "dark",
        settings: {
          features: [
            {
              icon: "check",
              title: "We say when something is not needed",
              description:
                "If you do not need the thing you are asking for, we tell you. A recommendation nobody can defend is not worth making, and selling work that does not help is a short relationship.",
            },
            {
              icon: "shield",
              title: "Claims are evidenced or absent",
              description:
                "We do not publish certifications we do not hold, response times we cannot measure, or client outcomes we cannot show you. Our Trust Centre sets out exactly what we can evidence.",
            },
            {
              icon: "laptop",
              title: "Your environment is documented",
              description:
                "We record what was configured and why, and you get a copy. It is how a colleague picks up your environment without reconstructing the reasoning, and it is what makes leaving us straightforward.",
            },
            {
              icon: "business",
              title: "You talk to people who did the work",
              description:
                "We are a small company. The person who understands your environment is reachable, rather than sitting behind an account manager who has to go and ask.",
            },
          ],
        },
      },
      {
        sectionType: "Image and text",
        subtitle: "Registered and accountable",
        title: "The details you can check for yourself.",
        body:
          "CYVRIX LIMITED is company number 15902542, incorporated on 17 August 2024, with its registered office at 44 Addison Road, Neath, Wales, SA11 2AY. We are registered with the Information Commissioner's Office under reference ZC075683. Every one of those is verifiable against a public register without asking us.",
        mediaId: heroImage("about"),
        buttonLabel: "Open the Trust Centre",
        buttonUrl: "/trust",
        backgroundStyle: "dark",
        layoutStyle: "right",
        settings: {
          points: [
            "Companies House number 15902542",
            "ICO registration ZC075683",
            "Registered in England and Wales",
            "ISO 27001 in progress, not yet held, and not claimed",
          ],
        },
      },
      {
        sectionType: "CTA section",
        title: "Start with a conversation about the work in front of you.",
        body:
          "A short review costs you nothing and tends to be more useful than a proposal. If the honest answer is that you do not need us, you will hear that.",
        buttonLabel: "Book a Free Review",
        buttonUrl: "/book-consultation",
        backgroundStyle: "brand",
        settings: { secondaryBtnLabel: "Contact us", secondaryBtnUrl: "/contact" },
      },
    ],
  },
  {
    slug: "careers",
    label: "Careers",
    summary:
      "Replaces the current four sections with the disciplines we recruit into, what the job is like, the hiring stages and how to apply.",
    sections: [
      {
        sectionType: "Hero",
        subtitle: "Careers",
        title: "Technology work with the reasoning left in.",
        body:
          "We publish roles here when they are genuinely open, and we do not list illustrative vacancies to appear larger than we are. If nothing is advertised and you think you would be useful to us, there is a route below for saying so.",
        buttonLabel: "See current openings",
        buttonUrl: "#openings",
        backgroundStyle: "dark",
        layoutStyle: "left",
        settings: {
          cardImage: heroImage("careers"),
          cardTitle: "Careers at CYVRIX",
          secondaryCtaLabel: "How to apply",
          secondaryCtaUrl: "/contact",
        },
      },
      {
        sectionType: "Feature cards",
        subtitle: "Where we recruit",
        title: "Four areas of work, and what each involves.",
        body:
          "These describe the kind of role we recruit for rather than a list of open positions, so you can judge whether your experience fits before spending time on an application.",
        backgroundStyle: "dark",
        settings: {
          features: [
            {
              icon: "server",
              title: "Managed service engineering",
              description:
                "First and second line support, endpoint and identity administration, patching, monitoring, and the day-to-day work of keeping client environments stable.",
            },
            {
              icon: "shield",
              title: "Cybersecurity",
              description:
                "Security assessment, hardening, monitoring and incident response. Work ranging from reviewing a tenant baseline to helping an organisation respond when something has already gone wrong.",
            },
            {
              icon: "cloud",
              title: "Cloud and infrastructure",
              description:
                "Migration, platform design and the ongoing management of cloud and hybrid environments. Frequently the work that follows a business outgrowing an arrangement that was fine three years ago.",
            },
            {
              icon: "wrench",
              title: "Field engineering",
              description:
                "Site-based delivery: installations, structured cabling, hardware deployment, office moves, and contract work that needs a competent person physically present.",
            },
          ],
        },
      },
      {
        sectionType: "Feature cards",
        subtitle: "Working here",
        title: "What the job is like, before you apply for it.",
        body:
          "Every company describes itself as collaborative and fast-moving. These are the things that would actually change your working week, including the ones that will not suit everybody.",
        backgroundStyle: "dark",
        settings: {
          features: [
            {
              icon: "phone",
              title: "You will talk to clients",
              description:
                "This is not a role where you receive tickets and never speak to the person who raised them. Explaining a technical situation to a business owner is part of the job, not an optional extra.",
            },
            {
              icon: "check",
              title: "Documentation is part of the work",
              description:
                "We write down what was configured and why. It is the difference between a deliberate decision and configuration drift, and it is how a colleague picks up your work.",
            },
            {
              icon: "business",
              title: "We are a small company",
              description:
                "CYVRIX was incorporated in 2024. That means broader work and more direct influence than a large provider, and it also means less structure. It suits people comfortable without a process for everything.",
            },
          ],
        },
      },
      {
        sectionType: "Process/timeline",
        title: "Four stages, and you hear back at each one.",
        body: "What an application actually involves, so you are not guessing.",
        backgroundStyle: "dark",
        settings: {
          steps: [
            {
              title: "You get in touch",
              description:
                "Send a CV and a short note about the work you are looking for. If a role is advertised, say which one. If nothing is advertised, tell us what you do and we will keep it on file.",
            },
            {
              title: "An initial conversation",
              description:
                "A short call covering your experience, what you want next, and whether the work we have is a genuine fit. This is two-way. Ask us the awkward questions here.",
            },
            {
              title: "A practical discussion",
              description:
                "A longer technical conversation about real scenarios rather than trivia. We care how you approach a problem you have not seen before, and how you explain it to someone non-technical.",
            },
            {
              title: "A decision, either way",
              description:
                "We tell you the outcome and the reasoning behind it. If it is a no, you will hear that too, rather than being left to work it out from our silence.",
            },
          ],
        },
      },
      {
        sectionType: "Career openings",
        title: "Active openings",
        body:
          "Roles are published here when they are genuinely open. If nothing is listed, we are still glad to read a speculative application.",
        backgroundStyle: "dark",
      },
      {
        sectionType: "Custom rich text",
        title: "How to send us your CV",
        backgroundStyle: "dark",
        body:
          "<p>Start through the contact form and tell us you are applying. Include the role if one is advertised, a short note on the work you are looking for, and attach your CV as a PDF or Word document. We will confirm receipt.</p>" +
          "<p>Please do not include your date of birth, National Insurance number, passport details, bank details or any other identity document in an application. We do not need them at this stage and will ask separately if an offer is made.</p>" +
          "<p>Documents sent to us are checked before anyone opens them, and files that fail the check are rejected rather than stored. Applications are visible only to the people involved in hiring and are never added to a marketing list. We keep unsuccessful applications for up to twelve months in case something suitable opens, then delete them; ask us at any point and we will remove yours sooner.</p>" +
          "<p>CYVRIX LIMITED is registered with the Information Commissioner's Office under reference ZC075683. Our <a href=\"/privacy-policy\">privacy policy</a> sets out your rights over the information you send us.</p>",
      },
      {
        sectionType: "CTA section",
        title: "Think you would be useful to us?",
        body: "Tell us what you do and what you are looking for. We read every speculative application.",
        buttonLabel: "Start an application",
        buttonUrl: "/contact",
        backgroundStyle: "brand",
      },
    ],
  },
  {
    slug: "support",
    label: "Support Desk",
    summary:
      "Replaces the current two sections with the three support routes, what to include in a request, and how to report a suspected security incident.",
    sections: [
      {
        sectionType: "Hero",
        subtitle: "Support",
        title: "Support routed through the right channel.",
        body:
          "Getting to the right route first is most of what determines how quickly something is resolved. This page sets out the three ways to reach us, what to include so the first reply is useful, and what to do if you have a security incident rather than a fault.",
        buttonLabel: "Raise an enquiry",
        buttonUrl: "/contact",
        backgroundStyle: "dark",
        layoutStyle: "left",
        settings: {
          cardImage: heroImage("support"),
          cardTitle: "Support Desk",
          secondaryCtaLabel: "Client portal sign in",
          secondaryCtaUrl: "/login",
        },
      },
      {
        sectionType: "Feature cards",
        subtitle: "Choose a route",
        title: "Three ways in, depending on who you are.",
        backgroundStyle: "dark",
        settings: {
          features: [
            {
              icon: "check",
              title: "Existing clients",
              description:
                "Use the portal, support address or escalation path agreed for your service. That route already knows your environment, your agreement and who can approve changes, which is why it resolves faster than a general enquiry.",
            },
            {
              icon: "support",
              title: "New to CYVRIX",
              description:
                "Tell us what has happened and what it is stopping you doing. If the honest answer is that another supplier is better placed, we will say so rather than take the work.",
            },
            {
              icon: "business",
              title: "A project rather than a fault",
              description:
                "Migrations, office moves, cabling, new sites and platform changes are scoped rather than ticketed. A conversation about dates and what has to keep running beats a support request.",
            },
          ],
        },
      },
      {
        sectionType: "Feature cards",
        subtitle: "Before you write",
        title: "Six things that turn a report into a diagnosis.",
        body:
          "Most first replies from any support desk are a request for more information. Including these removes that round trip entirely.",
        backgroundStyle: "dark",
        settings: {
          features: [
            {
              icon: "monitor",
              title: "What you were doing",
              description:
                "The action that led to the problem, and whether it used to work. Something that broke yesterday is a different investigation from behaviour that has never worked.",
            },
            {
              icon: "business",
              title: "Who is affected",
              description:
                "One person, a team, or everyone. Named users and their email addresses help more than a count, because we can check those accounts directly.",
            },
            {
              icon: "alert",
              title: "The exact wording of any error",
              description:
                "A screenshot or the text itself. Paraphrased errors send investigations in the wrong direction more often than any other single thing.",
            },
            {
              icon: "check",
              title: "When it started",
              description:
                "An approximate time is enough. It lets us line the problem up against sign-in records, updates and configuration changes.",
            },
            {
              icon: "scale",
              title: "What the business impact is",
              description:
                "Whether people can still work, and what they cannot do. This is what determines the order things are picked up in.",
            },
            {
              icon: "wrench",
              title: "Anything that changed recently",
              description:
                "A new device, a password reset, an office move, a supplier update, a new starter. Recent change is the usual explanation.",
            },
          ],
        },
      },
      {
        sectionType: "Custom rich text",
        title: "If you think you have been compromised, say so first",
        backgroundStyle: "dark",
        body:
          "<p>A suspected compromise is handled differently from a fault. Say in your first sentence that you believe this is a security incident, because it changes who picks it up and what they do first.</p>" +
          "<p>Do not wait until you are certain. A false alarm costs an hour. A real incident left for a day while somebody decides whether it counts is considerably more expensive, and the early hours are the ones where containment is still cheap.</p>" +
          "<p><strong>Signs this is an incident:</strong> you entered credentials into a page you now doubt; you approved a multi-factor prompt you did not initiate; colleagues report email from your address that you did not send; files have been renamed or encrypted; a payment or bank detail change was requested by email; an account is signed in from a location nobody recognises.</p>" +
          "<p><strong>While you wait:</strong> leave affected machines switched on but disconnect them from the network, because powering off destroys evidence held in memory. Do not delete suspicious email; forward a copy and keep the original. Tell colleagues not to act on any payment request until it has been confirmed by phone on a number they already had.</p>" +
          "<p><strong>Never send credentials.</strong> Do not include passwords, multi-factor codes, API keys or recovery codes in a support request. We will never ask you for a password, and any message that does is not from us. If you have already sent a credential to anyone, change it now and tell us.</p>",
      },
      {
        sectionType: "Contact section",
        title: "Open a support request",
        body:
          "Tell us what has happened and what it is stopping you doing. Do not include passwords, access tokens or sensitive configuration data.",
        backgroundStyle: "dark",
      },
    ],
  },
  {
    slug: "contact",
    label: "Contact",
    summary:
      "Keeps the enquiry form and replaces the surrounding copy. Removes nothing you have entered in Contact Us CMS.",
    sections: [
      {
        sectionType: "Hero",
        subtitle: "Contact",
        title: "Tell us what you are trying to fix.",
        body:
          "A short description of the situation is more useful than a formal brief. We will tell you whether it is something we can help with, roughly what it involves, and if another supplier is better placed we will say so.",
        buttonLabel: "Book a Free Review",
        buttonUrl: "/book-consultation",
        backgroundStyle: "dark",
        layoutStyle: "left",
        settings: {
          cardImage: heroImage("contact"),
          cardTitle: "Contact CYVRIX",
          secondaryCtaLabel: "Request a quote",
          secondaryCtaUrl: "/request-quote",
        },
      },
      {
        sectionType: "Contact section",
        title: "Secure enquiry form",
        body:
          "Please do not include passwords, access tokens or sensitive configuration data in an enquiry.",
        backgroundStyle: "dark",
      },
      {
        sectionType: "Feature cards",
        subtitle: "What happens next",
        title: "How an enquiry is handled.",
        backgroundStyle: "dark",
        settings: {
          features: [
            {
              icon: "check",
              title: "We read it properly",
              description:
                "Enquiries go to a person, not a queue that generates an automated reply and nothing else. If we need more detail to answer usefully, we will ask.",
            },
            {
              icon: "business",
              title: "An honest answer about fit",
              description:
                "If the work is outside what we do well, or another supplier is better placed, we say so. That is a shorter conversation than discovering it three months in.",
            },
            {
              icon: "shield",
              title: "Your details stay with us",
              description:
                "Enquiries are used to respond to you and are visible only to the people handling them. They are not added to a marketing list. CYVRIX LIMITED is registered with the ICO under reference ZC075683.",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "faq",
    label: "FAQ",
    summary: "Keeps the question list and gives the page a hero with imagery and fuller framing.",
    sections: [
      {
        sectionType: "Hero",
        subtitle: "Frequently asked questions",
        title: "Clear answers, including the inconvenient ones.",
        body:
          "The questions organisations actually ask before committing to a technology provider, answered without hedging. If yours is not here, ask us directly and we will answer it the same way.",
        buttonLabel: "Ask us something else",
        buttonUrl: "/contact",
        backgroundStyle: "dark",
        layoutStyle: "left",
        settings: {
          cardImage: heroImage("faq"),
          cardTitle: "Frequently asked questions",
          secondaryCtaLabel: "Book a Free Review",
          secondaryCtaUrl: "/book-consultation",
        },
      },
      {
        sectionType: "FAQ preview",
        title: "All questions",
        backgroundStyle: "dark",
      },
      {
        sectionType: "CTA section",
        title: "Still deciding?",
        body:
          "A short review is usually more useful than more reading. It costs nothing and comes with an honest answer about whether we are the right fit.",
        buttonLabel: "Book a Free Review",
        buttonUrl: "/book-consultation",
        backgroundStyle: "brand",
        settings: { secondaryBtnLabel: "Contact us", secondaryBtnUrl: "/contact" },
      },
    ],
  },
];

export function getReviewedPage(slug: string): ReviewedPage | undefined {
  return reviewedPages.find((page) => page.slug === slug);
}

export const reviewedPageSlugs: string[] = reviewedPages.map((page) => page.slug);

/**
 * Guard against a Statistics section ever being introduced here.
 *
 * The whole point of this module is that restored content carries no
 * unevidenced claims, and the Statistics renderer exists to display figures.
 */
export function findDisallowedSections(): Array<{ slug: string; sectionType: string }> {
  const disallowed = new Set(["Statistics"]);
  return reviewedPages.flatMap((page) =>
    page.sections
      .filter((section) => disallowed.has(section.sectionType))
      .map((section) => ({ slug: page.slug, sectionType: section.sectionType }))
  );
}
