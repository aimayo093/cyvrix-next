/**
 * Editorial content for the industry pages: a representative image, a narrative
 * overview and the practical outcomes CYVRIX can describe for that sector.
 *
 * These are the reviewed defaults. Images are replaceable through the CMS via
 * the `site_images` setting (`industries.<slug>`); the narrative is replaceable
 * through the Industries CMS `content` field.
 *
 * Nothing here states a response time, service level, certification, customer
 * count or measured outcome. Every statement describes capability or approach.
 */
export type IndustryContent = {
  image: string;
  imageAlt: string;
  /** Two paragraphs of narrative shown beneath the hero. */
  overview: string[];
  /** What working with CYVRIX looks like for this sector. */
  outcomes: string[];
};

const UPLOADS = "/uploads";

export const industryContent: Record<string, IndustryContent> = {
  "small-medium-businesses": {
    image: `${UPLOADS}/1780500385277-740712598-alex-kotliarskyi-QBpZGqEMsKg-unsplash.jpg`,
    imageAlt: "A busy open-plan office with staff working at desks",
    overview: [
      "Most small and medium businesses reach a point where technology stops being somebody's side responsibility. Systems have accumulated, suppliers have multiplied, and nobody has a complete picture of what is in use, who owns it or what happens when it fails. The result is rarely one big problem — it is a steady drag of small ones that nobody has time to fix properly.",
      "CYVRIX gives growing organisations a dependable technology function without the overhead of building one internally. We start by understanding what you actually have and what the business depends on, then bring the estate under sensible control: standardised devices, managed identities, tested backups and a clear route to help when something goes wrong.",
    ],
    outcomes: [
      "One accountable partner instead of several disconnected suppliers",
      "A documented view of devices, licences, systems and their owners",
      "Security controls proportionate to the size and risk of the business",
      "Predictable monthly cost rather than unplanned emergency spend",
    ],
  },
  "healthcare-care-providers": {
    image: `${UPLOADS}/1780500151763-478317301-centre-for-ageing-better-eDJ_bljPIIo-unsplash.jpg`,
    imageAlt: "A care worker supporting someone using a tablet device",
    overview: [
      "Healthcare and care settings carry an unusual combination of pressures: highly sensitive personal data, shift-based teams sharing devices, regulatory expectation, and an absolute requirement that systems work when people need them. Technology decisions here are rarely just technical — they affect how care is delivered.",
      "CYVRIX works with care providers to protect access to sensitive records without making the working day harder. That means practical controls around accounts and shared devices, dependable coverage across clinical, office and residential spaces, and recovery planning built around the services people rely on first.",
    ],
    outcomes: [
      "Controlled access to sensitive records across shared and shift-based devices",
      "Appropriate separation between staff, guest and operational connectivity",
      "Data handling practices you can explain to a regulator or commissioner",
      "Continuity planning that starts with care delivery, not the server room",
    ],
  },
  "logistics-transport": {
    image: `${UPLOADS}/1780500790769-997404968-jakub-zerdzicki-ynllMMWBdi0-unsplash.jpg`,
    imageAlt: "Motion light trails representing movement and distribution",
    overview: [
      "Logistics operations run on continuity. When connectivity drops at a depot, when a handheld fails mid-shift, or when the office and the warehouse cannot see the same information, the cost is immediate and measured in delayed movements rather than support tickets.",
      "CYVRIX helps distributed operations stay connected and supportable. We work on coverage and resilience at operational sites, sensible control over mobile and warehouse devices, and clear documentation of how connectivity, devices and line-of-business systems depend on one another — so that when something does fail, the workaround is already understood.",
    ],
    outcomes: [
      "Improved coverage and resilience across depots, warehouses and offices",
      "Mobile and handheld devices managed rather than individually maintained",
      "Documented dependencies between connectivity, devices and core systems",
      "Realistic workarounds prepared before disruption happens",
    ],
  },
  "professional-services": {
    image: `${UPLOADS}/1780500728760-978494894-mario-gogh-VBLHICVh-lI-unsplash.jpg`,
    imageAlt: "A professional services team working in a modern office",
    overview: [
      "Professional services firms hold client information that clients expect to be protected, and increasingly they are asked to prove it. Security questionnaires, client audits and insurance renewals now ask questions that are difficult to answer without having done the underlying work.",
      "CYVRIX helps firms protect client data while keeping consultants productive. The focus is identity, sharing and email — the three places where confidential information most often leaks — supported by access rights that keep pace with joiners, movers and leavers rather than drifting over time.",
    ],
    outcomes: [
      "Client information protected through identity, sharing and email controls",
      "Access rights that stay aligned with joiners, movers and leavers",
      "Evidence prepared for client security questionnaires and audits",
      "Secure collaboration that works for hybrid and client-site working",
    ],
  },
  "retail-ecommerce": {
    image: `${UPLOADS}/1780500424789-875536147-shutter-speed-BQ9usyzHx_w-unsplash.jpg`,
    imageAlt: "Parcels and packaging representing retail fulfilment",
    overview: [
      "Retail and e-commerce operations feel technology problems directly in revenue. A point-of-sale outage, a network failure during a peak trading period or a compromised account is not an inconvenience — it is lost trading and, potentially, a reportable incident.",
      "CYVRIX supports secure, resilient retail operations. That covers network segmentation so that payment-adjacent systems are properly separated, dependable connectivity across stores and warehouses, and recovery planning sized for the periods when the business genuinely cannot afford downtime.",
    ],
    outcomes: [
      "Payment-adjacent systems properly separated from general traffic",
      "Connectivity and point-of-sale resilience across sites",
      "Capacity and continuity planning ahead of peak trading periods",
      "Practical protection for customer and order data",
    ],
  },
  "education-training": {
    image: `${UPLOADS}/1780500523335-751842973-asia-culturecenter-IGwScSCN42U-unsplash.jpg`,
    imageAlt: "A classroom of learners working at desks",
    overview: [
      "Education environments have to serve three very different groups — staff, learners and administrators — on constrained budgets, with safeguarding expectations that carry real weight. Systems must be open enough to teach with and controlled enough to be defensible.",
      "CYVRIX designs supportable systems for education and training providers. We concentrate on access control that reflects who each person is, workspace platforms that staff can actually administer, and documentation that means support does not depend on one person's memory.",
    ],
    outcomes: [
      "Access controls that distinguish staff, learners and administrators",
      "Workspace and collaboration platforms configured deliberately",
      "Device management that survives high user volume and turnover",
      "Documented systems that reduce dependence on individual knowledge",
    ],
  },
  "construction-field-teams": {
    image: `${UPLOADS}/1780500571917-487448545-joe-holland-80zZ1s24Nag-unsplash.jpg`,
    imageAlt: "Construction professionals reviewing work on site",
    overview: [
      "Construction and field-based work is hard on technology. Devices get dropped, sites have poor connectivity, teams change between projects, and equipment is lost or replaced more often than in an office environment. Standard corporate IT assumptions do not survive contact with a site.",
      "CYVRIX keeps site teams connected with practices built for the conditions they actually work in: mobile device controls that assume loss, communications that work away from the office, and field support that understands turning up matters more than a ticketing workflow.",
    ],
    outcomes: [
      "Mobile device controls designed around loss, damage and turnover",
      "Communications that work for teams away from a fixed office",
      "On-site support for installations, moves and equipment changes",
      "Access that can be granted and revoked as projects start and finish",
    ],
  },
  "startups-saas-businesses": {
    image: `${UPLOADS}/1780433230805-42051091-christina-wocintechchat-com-m-6Dv3pe-JnSg-unsplash.jpg`,
    imageAlt: "A developer working across multiple screens",
    overview: [
      "Fast-growing technology businesses tend to defer security and infrastructure decisions until somebody external forces the issue — an enterprise prospect's security review, an investor's due diligence, or a customer's contractual requirement. By then the work is urgent and the options are narrower.",
      "CYVRIX helps growing companies build credible security and infrastructure without slowing product delivery. We focus on what is proportionate now and what will be expected next, so that maturity is reached deliberately rather than under deadline pressure.",
    ],
    outcomes: [
      "A security roadmap sized to the stage the business is actually at",
      "Cloud and identity controls that scale with headcount",
      "Evidence ready for due diligence and enterprise security reviews",
      "Automation of the operational work that would otherwise need hires",
    ],
  },
  "finance-fintech": {
    image: `${UPLOADS}/1780429739557-557258564-jakub-zerdzicki-LgE3whpa5VA-unsplash.jpg`,
    imageAlt: "Financial analysis with charts and a calculator",
    overview: [
      "Financial services operate to a higher trust bar than most sectors, and the expectation is not simply that controls exist but that they can be evidenced. Access reviews, audit trails and recovery testing are asked about specifically, and vague answers cost time and credibility.",
      "CYVRIX helps tighten identity, endpoint and governance controls for sensitive operations, with an emphasis on producing the evidence alongside the control. The goal is that when somebody asks how access is managed or when recovery was last tested, the answer is a record rather than an assurance.",
    ],
    outcomes: [
      "Multi-factor authentication and periodic access review in place",
      "Endpoint and administrative controls appropriate to sensitive data",
      "A maintained risk register rather than a one-off assessment",
      "Backup and recovery evidence available when it is requested",
    ],
  },
  "nonprofits-community": {
    image: `${UPLOADS}/1780429502666-526249160-clay-banks-LjqARJaJotc-unsplash.jpg`,
    imageAlt: "Hands joined together representing community organisations",
    overview: [
      "Charities and community organisations carry the same data protection responsibilities as commercial businesses, usually with a fraction of the budget and a mix of staff and volunteers using shared equipment. Good practice has to be achievable, not aspirational.",
      "CYVRIX helps community organisations use secure, maintainable technology within realistic budgets. That means taking advantage of the nonprofit programmes available, setting device and account standards that volunteers can follow, and giving trustees straightforward guidance they can act on.",
    ],
    outcomes: [
      "Workspace platforms set up to make use of nonprofit programmes",
      "Device and account standards that work for volunteer turnover",
      "Data protection guidance that trustees can act on",
      "Support arrangements sized to a realistic operating budget",
    ],
  },
};

const fallbackContent: IndustryContent = {
  image: `${UPLOADS}/1780500385277-740712598-alex-kotliarskyi-QBpZGqEMsKg-unsplash.jpg`,
  imageAlt: "A team working together in an office",
  overview: [
    "Every organisation reaches a point where its technology needs deliberate ownership rather than incremental fixes. The systems people depend on daily deserve the same clarity of responsibility as any other part of the business.",
    "CYVRIX helps organisations understand what they have, secure what matters, and plan changes around how the business actually operates.",
  ],
  outcomes: [
    "A documented view of the systems the organisation depends on",
    "Security controls proportionate to the risk actually carried",
    "A clear route to help when something goes wrong",
    "Changes planned around business operations, not just technology",
  ],
};

/** Only same-origin paths and the configured Supabase host are accepted. */
function safeImage(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  const value = candidate.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https:\/\/[^/]+\.supabase\.co\//.test(value)) return value;
  return fallback;
}

export function getIndustryContent(
  slug: string,
  imageOverride?: string
): IndustryContent {
  const base = industryContent[slug] ?? fallbackContent;
  return { ...base, image: safeImage(imageOverride, base.image) };
}
