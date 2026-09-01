/**
 * Editorial content for the individual service pages: a representative image
 * and a narrative that explains what the service is actually for.
 *
 * These are the reviewed defaults. Images are replaceable through the CMS via
 * `site_images` (`services.<slug>`); the narrative is replaceable through the
 * Services CMS `content.overview` field.
 *
 * Nothing here states a response time, service level, certification, customer
 * count or measured outcome. Every statement describes capability or approach.
 */
export type ServiceDetailContent = {
  image: string;
  imageAlt: string;
  /** Two paragraphs shown beneath the hero. */
  overview: string[];
  /** Signals that this service is the right conversation to be having. */
  rightWhen: string[];
};

const UPLOADS = "/uploads";

export const serviceDetailContent: Record<string, ServiceDetailContent> = {
  "managed-it-support": {
    image: `${UPLOADS}/1780406947743-525642280-christina-wocintechchat-com-m-8YJwLFscI-s-unsplash.jpg`,
    imageAlt: "A support engineer working across several screens",
    overview: [
      "Managed IT support is the difference between technology that gets attention and technology that only gets attention when it breaks. Most organisations reach us with the same pattern: a handful of people absorbing IT problems alongside their real jobs, a supplier list nobody fully owns, and no single view of what is running where.",
      "We take that on properly. Day-to-day support requests come to us, the device estate is brought to a consistent standard, and the systems your teams depend on are monitored so that problems surface before they interrupt work. You get a named route to help and a documented environment, rather than a queue and a ticket number.",
    ],
    rightWhen: [
      "IT problems are being absorbed by people whose job is something else",
      "Nobody can say with confidence what devices and licences are in use",
      "Support depends on one person's memory or availability",
      "Costs arrive as unplanned emergencies rather than a predictable line",
    ],
  },
  "cybersecurity-services": {
    image: `${UPLOADS}/1780430224413-838749840-adi-goldstein-EUsVwEOsblE-unsplash.jpg`,
    imageAlt: "Abstract circuitry representing digital security",
    overview: [
      "Security work goes wrong when it starts with products rather than with understanding. We begin by establishing where risk actually sits in your organisation: who has access to what, how identities are protected, what happens on the endpoints, and which data would genuinely hurt to lose or expose.",
      "From there we set out proportionate improvements in an order that makes commercial sense. That usually means fixing identity and email first, because that is where most real incidents begin, then working through endpoint protection, vulnerability management and the awareness of the people using the systems every day.",
    ],
    rightWhen: [
      "A client or insurer has started asking questions you cannot answer confidently",
      "Security has been bought as products rather than planned as controls",
      "Nobody is certain who holds administrative access",
      "You need to know where you stand before deciding what to spend",
    ],
  },
  "cloud-solutions": {
    image: `${UPLOADS}/1780433792737-726998000-growtika-KPZNNKQbTMw-unsplash.jpg`,
    imageAlt: "Server infrastructure in a data centre",
    overview: [
      "Cloud adoption fails more often through planning than through technology. Workloads get moved without understanding their dependencies, licensing is bought before the requirement is clear, and the organisation ends up paying more for something harder to support than what it replaced.",
      "We plan cloud work around how the business actually operates. That means understanding the current estate and its constraints first, sequencing the migration so each step leaves things working, and configuring the destination deliberately rather than accepting defaults that were never designed for your risk profile.",
    ],
    rightWhen: [
      "Ageing on-premise hardware is approaching a decision point",
      "Cloud spend has grown without anyone owning it",
      "A migration has stalled, or an earlier one left loose ends",
      "You need hybrid working to be properly supportable rather than tolerated",
    ],
  },
  "network-infrastructure": {
    image: `${UPLOADS}/1780489287611-46531032-kirill-sh-eVWWr6nmDf8-unsplash.jpg`,
    imageAlt: "Structured network cabling in an equipment rack",
    overview: [
      "Network problems are rarely reported as network problems. They arrive as slow applications, dropped calls, unreliable stock scanners or a site that mysteriously performs worse after lunch. Diagnosing them properly means looking at the whole path rather than the symptom.",
      "We design and build business networks that can be supported after we leave: sensible segmentation, firewalls configured to a documented rule set, wireless coverage designed around the building rather than guessed, and resilient connectivity where an outage would stop work rather than merely annoy people.",
    ],
    rightWhen: [
      "Performance complaints keep recurring without a clear cause",
      "Wireless coverage was never designed, only added to",
      "Guest, staff and operational traffic share the same network",
      "A move, expansion or refit is coming and the network needs planning",
    ],
  },
  "structured-cabling": {
    image: `${UPLOADS}/1780489287611-46531032-kirill-sh-eVWWr6nmDf8-unsplash.jpg`,
    imageAlt: "Structured cabling terminated into a patch panel in an equipment rack",
    overview: [
      "Cabling is the one part of an installation nobody looks at until it fails, and by then the people who put it in have usually gone. The faults it causes rarely announce themselves as cabling: a link that negotiates at a lower speed, a camera that drops overnight, a desk that works until someone moves it.",
      "We supply, install, test and commission copper and fibre, and hand over the evidence: every link tested, both ends labelled, and as-built records that let the next person trace a run without pulling ceiling tiles. Afterwards it can be supported as it changes, because installations always do.",
    ],
    rightWhen: [
      "A move, refit or expansion needs cabling planned rather than improvised",
      "Nobody can say with certainty where an existing run goes",
      "Faults keep being blamed on the network without evidence either way",
      "The original installation was never tested, labelled or documented",
    ],
  },
  "it-consultancy": {
    image: `${UPLOADS}/1780500728760-978494894-mario-gogh-VBLHICVh-lI-unsplash.jpg`,
    imageAlt: "A consultancy team working through a plan",
    overview: [
      "Sometimes the useful thing is not delivery but an independent view. A supplier has proposed something expensive, an internal team disagrees on direction, due diligence is coming, or a decision has been deferred so long that it is now urgent.",
      "We give a straight technical opinion, grounded in what your organisation can realistically absorb. That may be a technology strategy, an architecture review, procurement support, or simply telling you that the thing you were about to buy will not solve the problem you have. We would rather say that early than be paid to implement it.",
    ],
    rightWhen: [
      "A significant technology decision needs an independent second opinion",
      "A supplier proposal is hard to evaluate on its merits",
      "Investor or client due diligence is approaching",
      "Strategy exists in people's heads but not on paper",
    ],
  },
  "backup-and-disaster-recovery": {
    image: `${UPLOADS}/1780433920983-572280452-growtika-KPZNNKQbTMw-unsplash.jpg`,
    imageAlt: "Data centre infrastructure supporting backup systems",
    overview: [
      "Almost every organisation has backups. Far fewer have tested a restore. The gap between those two states is where businesses discover, at the worst possible moment, that the backup covered the wrong systems, or ran successfully for months against a location nobody could reach.",
      "We treat recovery as the requirement and backup as the mechanism. That means starting from what the organisation must be able to do after a disruption, working back to what has to be recoverable and how quickly, and then testing that the restore actually works rather than trusting a green tick.",
    ],
    rightWhen: [
      "Backups run, but a restore has never been tested end to end",
      "Nobody can say how long recovery would actually take",
      "Cloud data is assumed to be backed up by the provider",
      "An insurer or client has asked about continuity arrangements",
    ],
  },
  "microsoft-365-google-workspace-support": {
    image: `${UPLOADS}/1780433230805-42051091-christina-wocintechchat-com-m-6Dv3pe-JnSg-unsplash.jpg`,
    imageAlt: "A specialist reviewing collaboration platform settings",
    overview: [
      "Microsoft 365 and Google Workspace are where most organisations now keep their working life, and where most have never revisited the settings applied on day one. Sharing defaults, legacy authentication, unmanaged administrative accounts and unclear retention accumulate quietly until something forces the issue.",
      "We bring these platforms under deliberate control: identity and administrative access first, then sharing, retention and email protection, then the licensing question of whether you are paying for capability you already own or duplicating it elsewhere.",
    ],
    rightWhen: [
      "The tenant was set up quickly and never reviewed",
      "Sharing and guest access have grown without oversight",
      "Licensing costs are unclear or suspected to be duplicated",
      "Leavers' accounts and data are handled inconsistently",
    ],
  },
  "endpoint-management": {
    image: `${UPLOADS}/1780500385277-740712598-alex-kotliarskyi-QBpZGqEMsKg-unsplash.jpg`,
    imageAlt: "Managed laptops in use across an open-plan office",
    overview: [
      "Endpoints are where the organisation meets its technology, and where most compromises begin. An estate that grew by buying a laptop whenever someone joined tends to be inconsistent in every way that matters: patch level, encryption, software, and who actually has administrative rights.",
      "We bring devices to a defined standard and keep them there. New starters get a consistent build, patching happens on a schedule rather than when someone remembers, encryption is verified rather than assumed, and a lost device can be dealt with in minutes rather than becoming an incident.",
    ],
    rightWhen: [
      "Devices were bought individually and configured ad hoc",
      "Patching depends on users accepting prompts",
      "You cannot confirm which machines are encrypted",
      "Onboarding and offboarding differ every time",
    ],
  },
  "hardware-repair-field-support": {
    image: `${UPLOADS}/1780492476209-187358937-hugo-clement-puCEUxEr3xk-unsplash.jpg`,
    imageAlt: "Detailed hardware repair work on a circuit board",
    overview: [
      "Some work has to happen where the equipment is, and it has to happen without disrupting the people already working there. Remote support has limits: a failed switch, a refit, a floor of machines to replace or a site that needs surveying all require somebody physically present and properly prepared.",
      "Our field capability covers repair, replacement, installs, moves and changes, rack and cabling work, and smart hands for teams working remotely. We arrive with what the job needs, work to the schedule agreed, leave the site tidy, and report back on what was done and what still needs attention.",
    ],
    rightWhen: [
      "Hardware has failed and remote support has reached its limit",
      "A refresh programme needs hands across multiple sites",
      "An internal team needs someone on the ground they can direct",
      "An office move or refit is being planned",
    ],
  },
  "voip-business-communications": {
    image: `${UPLOADS}/1780493290807-85791472-AdobeStock_204075016-scaled.jpg`,
    imageAlt: "Business telephone handsets ready for deployment",
    overview: [
      "Business telephony has become a software problem wearing hardware's clothes. Call quality issues are usually network issues, number porting is usually a process issue, and the features that sell a system are rarely the ones that matter once it is in daily use.",
      "We plan communications around how your teams actually work: who needs to be reachable, what happens out of hours, how calls route between sites and remote staff, and whether the underlying connectivity can carry it reliably. Then we handle the migration, including the parts other suppliers describe as somebody else's problem.",
    ],
    rightWhen: [
      "An existing phone contract or ISDN line is ending",
      "Call quality is inconsistent and nobody has traced why",
      "Remote and office staff are on separate systems",
      "Call routing no longer reflects how the business operates",
    ],
  },
  "compliance-risk-advisory": {
    image: `${UPLOADS}/1780493389816-59071924-Compliance-and-risk-management_iStock.jpg`,
    imageAlt: "Compliance and risk management documentation",
    overview: [
      "Compliance work becomes expensive when it starts at the deadline. A client security questionnaire, an insurance renewal or a certification assessment arrives, and the organisation discovers that the evidence for controls it genuinely has was never written down.",
      "We help you understand what is actually being asked, what you already satisfy, and what genuinely needs to change. Where you are preparing for a standard such as Cyber Essentials, we help you close the gaps and assemble the evidence. The certification decision always rests with the certification body; we do not issue or award it.",
    ],
    rightWhen: [
      "A client questionnaire or audit is due and evidence is scattered",
      "Cyber Essentials or a similar standard is being considered",
      "An insurer has asked questions about your controls",
      "Risk is discussed but never recorded anywhere durable",
    ],
  },
  "web-app-digital-solutions": {
    image: `${UPLOADS}/1780490746398-305791110-denny-muller-JySoEnr-eOg-unsplash.jpg`,
    imageAlt: "Web browsers and digital platforms",
    overview: [
      "Digital projects go wrong for the same reasons infrastructure projects do: unclear scope, unmapped dependencies and decisions made without understanding the operational impact. The technology is rarely the hard part.",
      "We deliver web and application work with the scope, dependencies and success criteria agreed before anything is built, and with the security and hosting considerations handled as part of the project rather than discovered afterwards. You get something supportable, not just something delivered.",
    ],
    rightWhen: [
      "An existing site or application has become difficult to maintain",
      "A build is needed and security has to be part of it from the start",
      "Manual processes are consuming time that could be automated",
      "A previous project was delivered but never properly handed over",
    ],
  },
};

const fallbackContent: ServiceDetailContent = {
  image: `${UPLOADS}/1780500385277-740712598-alex-kotliarskyi-QBpZGqEMsKg-unsplash.jpg`,
  imageAlt: "A technology team at work",
  overview: [
    "Every engagement starts by understanding the context: the systems in use, the people who depend on them, and the outcome the organisation actually needs.",
    "From there we agree a proportionate approach, sequence the work so each step leaves things better than it found them, and communicate clearly throughout.",
  ],
  rightWhen: [
    "A technology priority needs owning rather than deferring",
    "An independent technical view would help the decision",
    "Existing arrangements are no longer fit for how the business works",
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

export function getServiceDetailContent(
  slug: string,
  imageOverride?: string
): ServiceDetailContent {
  const base = serviceDetailContent[slug] ?? fallbackContent;
  return { ...base, image: safeImage(imageOverride, base.image) };
}
