export const assessmentOffers = [
  {
    slug: "it-health-check",
    title: "Free IT Health Check",
    serviceInterest: "Managed IT Services",
    eyebrow: "Technology foundations",
    description:
      "A focused first conversation to identify the practical technology priorities worth addressing next.",
    outcomes: [
      "A clearer picture of the current technology estate and ownership.",
      "The risks, constraints or improvement areas you want to explore.",
      "A sensible next step, whether that is support, project work or a deeper assessment.",
    ],
    scopeLabel: "What would you like the health check to focus on?",
    scopeOptions: [
      "Overall technology support and ownership",
      "End-user experience and device management",
      "Backup, recovery or business continuity",
      "A mix of technology priorities",
    ],
  },
  {
    slug: "microsoft-365-security",
    title: "Microsoft 365 Security Assessment",
    serviceInterest: "Cybersecurity",
    eyebrow: "Identity and collaboration security",
    description:
      "Discuss the Microsoft 365 security controls, identity risks and operational priorities most relevant to your organisation.",
    outcomes: [
      "A shared view of the Microsoft 365 areas that need attention.",
      "The right starting point for identity, email, endpoint or collaboration security work.",
      "Practical next steps proportionate to your environment.",
    ],
    scopeLabel: "Which Microsoft 365 area is most relevant?",
    scopeOptions: [
      "Identity and access controls",
      "Email and collaboration security",
      "Endpoint management and device posture",
      "A wider Microsoft 365 security review",
    ],
  },
  {
    slug: "cybersecurity-assessment",
    title: "Cybersecurity Assessment",
    serviceInterest: "Cybersecurity",
    eyebrow: "Security readiness",
    description:
      "Start a security-focused conversation about current risks, resilience priorities and the right scope for further work.",
    outcomes: [
      "The security concerns and business context that should shape the work.",
      "An appropriate route into a targeted review, remediation plan or ongoing security support.",
      "Clear boundaries for any follow-up activity before sensitive information is shared.",
    ],
    scopeLabel: "What is the main reason for this assessment?",
    scopeOptions: [
      "Risk or resilience planning",
      "A compliance-readiness conversation",
      "A recent security concern or operational change",
      "A wider security improvement programme",
    ],
  },
  {
    slug: "cloud-readiness",
    title: "Cloud Readiness Assessment",
    serviceInterest: "Cloud Services",
    eyebrow: "Cloud planning",
    description:
      "Explore the workloads, operating model and constraints that should inform a cloud migration or modernisation plan.",
    outcomes: [
      "The cloud objectives, dependencies and delivery constraints worth considering.",
      "A clearer route into discovery, migration planning or platform improvement work.",
      "A proportionate next step before committing to a project scope.",
    ],
    scopeLabel: "What are you considering in the cloud?",
    scopeOptions: [
      "Moving a workload or application",
      "Modernising Microsoft 365 or endpoint operations",
      "Improving resilience, backup or recovery",
      "Developing a broader cloud strategy",
    ],
  },
  {
    slug: "network-assessment",
    title: "Network Assessment",
    serviceInterest: "Infrastructure",
    eyebrow: "Infrastructure and connectivity",
    description:
      "Frame the performance, resilience, coverage or change requirements that should guide a network review.",
    outcomes: [
      "The locations, users and operational requirements relevant to the network conversation.",
      "A practical route into surveys, remediation, refresh or project delivery.",
      "Clear next steps without sharing network credentials or sensitive configurations.",
    ],
    scopeLabel: "What does the network assessment need to address?",
    scopeOptions: [
      "Performance, reliability or coverage",
      "A site move, expansion or refresh",
      "Security segmentation or resilience",
      "A multi-site infrastructure review",
    ],
  },
] as const;

export type AssessmentSlug = (typeof assessmentOffers)[number]["slug"];

export function findAssessmentOffer(slug: string) {
  return assessmentOffers.find((offer) => offer.slug === slug);
}
