# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CYVRIX sells to four distinct buyers, and all four are real. They arrive with
different questions, and work that serves only one of them fails the others.

**The owner or director with no internal IT.** A 10–50 person business where
someone senior carries technology alongside running the company. Not technical.
Tired of things breaking. Wants one accountable person rather than a supplier
list. Buys on trust and on being told the truth in plain language.

**The office or operations manager.** Someone whose actual job is operations,
finance or practice management, who inherited IT because nobody else would take
it. Buys on relief and responsiveness, and has to justify the spend upward — so
they need something they can forward to a director.

**The internal IT person needing help.** A one-person function or small team
wanting overflow capacity, on-site hands, or a specialism they lack. A technical
buyer who judges competence, not reassurance, and who is put off by copy written
for the first two.

**Procurement at a larger organisation.** A formal supplier process where
insurance, registration and references decide it before anyone meets. This is
the buyer the statutory disclosures, ICO registration and Trust Centre exist for.

## Product Purpose

CYVRIX manages, secures and modernises the technology growing organisations
depend on: day-to-day managed services, cloud and cybersecurity work, on-site
field engineering, and project delivery.

Success is a client who understands their own environment. The company sells
against the pattern where technology is somebody's side responsibility, suppliers
have multiplied, and nobody holds a complete picture.

## Positioning

**South Wales first, UK for remote work.** On-site and field engineering
concentrate around Neath, Swansea and Port Talbot. Remote managed services reach
anywhere in the UK. Being local is a genuine advantage and should be said out
loud rather than hidden behind "UK-wide".

*This is a correction to the live site, which currently says "growing UK
organisations" with no regional emphasis.*

**A competent specialist, not a large company.** Incorporated August 2024. Copy
implying scale is checkable and easy to disprove, and a buyer who catches one
inflated claim discounts the rest of the page.

**Every claim is evidenced or absent.** This is the mechanism a neighbouring firm
could not truthfully copy: not that CYVRIX says it is honest, but that the site
states what it does *not* hold, and a build check fails on unevidenced claims.

## Operating Context

Clients are mid-conversation with a problem — an outage, a supplier ending, a
security questionnaire they cannot answer, an office move. Few arrive browsing.

Field work means travel to client premises across South Wales. Remote work is
Microsoft 365, Azure and Windows estates. Enquiries arrive by form, phone and
email, and the first reply is written by the person who will do the work.

## Capabilities and Constraints

**Delivered today:** managed IT support, endpoint management, backup and disaster
recovery, cloud solutions, Microsoft 365 and Google Workspace support,
cybersecurity services, compliance and risk advisory, network infrastructure,
hardware repair and field support, VoIP, IT consultancy, and web and app work.
Twelve services across four engines.

**The five assessments are offered but not yet deliverable.** The home page's
primary call to action is "Choose an assessment", pointing at an IT Health Check,
Microsoft 365 Security Assessment, Cybersecurity Assessment, Cloud Readiness
Assessment and Network Assessment. The routes and copy exist. The intent is to
deliver them through an automated AI assessment service, **which has not been
built**. Until it is, or until they are delivered manually, the site is
advertising a service the company has said it cannot yet deliver to a standard it
would put its name to.

*This is an open product decision, recorded rather than resolved. Future work
must not describe these as an existing capability.*

**Service structure is undecided.** The site is built around four peer engines
(Managed Services, Cloud & Cybersecurity, Field Engineering, Professional
Services). A later position proposes four pillars — Managed IT, Cloud,
Cybersecurity, Infrastructure — with field engineering and professional services
supporting them. Unresolved. See `docs/DECISIONS.md`.

**Pricing is not published.** No figures on the site, by choice, and none should
be invented.

## Brand Commitments

**Name:** CYVRIX LIMITED, trading as CYVRIX. Also registered as CYVhub.

**Voice:** plain, specific, and willing to say the inconvenient thing. "We say
when something is not needed" is a stated commitment, not decoration. No jargon,
no fear-selling, no superlatives.

**Withheld deliberately, and enforced by a build check:**

- The founder's personal name and LinkedIn profile.
- The registered office. It is residential; only "Neath" is published.

**Visual system:** recorded in `DESIGN.md`. Dark, one accent, two typefaces.

## Evidence on Hand

**Verifiable against a public register:**

- Companies House number 15902542, incorporated 17 August 2024, England and Wales.
- ICO registration ZC075683, expiring 6 January 2027.

**Verifiable with the awarding body, held by the founder personally, not by the
company:** CompTIA A+, Network+, Security+, Cloud+, PenTest+, and ITIL
Foundation. Plus an M.Sc. and a B.Sc.

**Real work history, the founder's own employment rather than CYVRIX contracts:**
a full year of Dell and Lenovo field engineering across Wales in 2025, and
infrastructure and security roles from 2009.

**Absent, and not to be fabricated:**

- No company certifications. ISO 27001 is in progress and not held.
- No Cyber Essentials. Naming it as *readiness work for a client* is accurate;
  naming it as held is not.
- No named clients, testimonials or case studies that can be evidenced. Three of
  each exist in the database and are hidden pending review.
- No published performance figures. No uptime, SLA, response time or rating.
- No partner or accreditation logos.

## Product Principles

1. **Evidenced or absent.** A claim is verifiable against a public register,
   evidenced on request, or it does not appear. `npm run check:claims` fails the
   build on this.
2. **Say the inconvenient thing.** If a client does not need what they are asking
   for, tell them. The site should read the way the company intends to work.
3. **Local is an advantage, not an embarrassment.** Neath and South Wales are
   said plainly. A national voice from a regional firm is the weaker claim.
4. **Serve four buyers without writing for an average of them.** The technical
   buyer and the tired director need different pages, not one hedged page.
5. **Small is the position.** A named engineer who understands the environment is
   the offer. Nothing should imply a call centre.

## Accessibility & Inclusion

WCAG 2.2 AA is the working standard, and specific failures have already been
found and fixed rather than assumed: form fields without programmatic labels,
missing reduced-motion support. Public forms must carry real labels, every
interactive element a visible focus state, and all motion must respect
`prefers-reduced-motion`.
