/**
 * Long-form Insight articles.
 *
 * Kept separate from the site catalogue in `lib/cyvrix-data.ts` because these
 * are editorial content that grows, not configuration.
 *
 * A body entry beginning with "## " is rendered as a section heading. The same
 * convention works for articles written through the CMS, so an author does not
 * need a separate field to structure a piece.
 *
 * These articles give practical guidance and state no certification, customer
 * outcome, performance figure or client reference.
 */
export type InsightArticle = {
  slug: string;
  title: string;
  category: string;
  author: string;
  excerpt: string;
  tags: string[];
  published: string;
  body: string[];
};

export const insightArticles: InsightArticle[] = [
  {
    slug: "microsoft-365-security-baseline-uk-smes",
    title: "A Microsoft 365 Security Baseline for UK SMEs",
    category: "Cybersecurity",
    author: "CYVRIX Editorial",
    excerpt:
      "The controls most growing businesses should review first: identity, administrator roles, sharing defaults, email authentication and recovery, in the order that actually reduces risk.",
    tags: ["Microsoft 365", "SME security", "MFA"],
    published: "2026-05-07",
    body: [
      "Most Microsoft 365 tenants were configured once, quickly, by whoever set the business up, and never revisited. That is not a criticism; it is what happens when a platform works well enough that nobody has a reason to open the admin centre. The problem is that the defaults were designed to make adoption easy, not to protect an organisation that has since grown.",
      "This is the order we work through with clients. It is sequenced by risk reduction per unit of effort, rather than by how interesting the settings are.",

      "## Start with identity, because that is where incidents start",
      "The overwhelming majority of real compromises begin with a credential rather than an exploit. Someone reuses a password, or approves a multi-factor prompt they did not initiate, or an account belonging to a person who left eighteen months ago is still active and still has a mailbox.",
      "Enforce multi-factor authentication on every account, without exceptions for convenience. The exception made for the director who finds it irritating is precisely the account an attacker will target, because it is the one worth having. Prefer an authenticator app or hardware key over SMS, which can be intercepted through a SIM swap.",
      "Then disable legacy authentication protocols. These predate modern sign-in and cannot enforce multi-factor at all, so leaving them enabled means the control you have just configured can be bypassed entirely. Newer tenants block most of them by default, but tenants created some years ago frequently still permit them.",

      "## Know who holds administrative access",
      "Open the list of accounts holding Global Administrator and read it properly. In most organisations it contains at least one person who no longer needs it, one shared account whose password lives in a document somewhere, and one consultant from a project that finished.",
      "Reduce it to the smallest number of named individuals who genuinely need it. Give those people a separate administrative account rather than attaching elevated rights to the mailbox they read email in all day, because that mailbox is the thing most likely to receive a malicious attachment.",
      "Record who holds what, and review it when people change roles rather than annually. Access accumulates: people gain permissions when they move teams and rarely lose the old ones.",

      "## Fix sharing defaults before they become a data question",
      "SharePoint and OneDrive default to sharing behaviour that suits collaboration rather than confidentiality. Anonymous links that never expire are the common finding: a document shared with a client two years ago remains reachable by anyone holding the URL, including anyone that client forwarded it to.",
      "Set link expiry, restrict anonymous sharing where the business does not need it, and review guest access. Guests accumulate quietly, and each one is an account outside your control with a view into your tenant.",

      "## Make email provable, not merely functional",
      "SPF, DKIM and DMARC are frequently half configured: SPF exists, DKIM was never enabled, and DMARC is set to none, which instructs receiving servers to do nothing. In that state you have the appearance of email authentication without the protection.",
      "Configure all three properly and move DMARC to a policy that actually rejects. This stops your domain being used to impersonate you to your own clients, which is a commercial problem as much as a technical one. An invoice fraud email that appears to come from your domain becomes your reputational problem regardless of where it originated.",

      "## Assume the platform is not your backup",
      "Microsoft protects the service. It does not protect you from a user deleting a folder, a departing employee clearing a mailbox, or ransomware encrypting synchronised files. Retention policies help, but a retention policy is a defined window, not a backup.",
      "Decide what you would need to recover and over what period, then check that your current arrangement delivers it. Then test a restore. An untested backup is a belief rather than a control.",

      "## Write it down",
      "Whatever you configure, record what was set and why. The value of a baseline is that someone can later tell the difference between a deliberate decision and configuration drift. Without that record, the next person to review the tenant has to reconstruct the reasoning from scratch, and usually will not.",
      "None of this requires additional licensing in most cases. It requires deciding that the tenant deserves the same attention as the rest of the business.",
    ],
  },
  {
    slug: "backup-is-not-business-continuity",
    title: "Backup Is Not the Same as Business Continuity",
    category: "Business Technology",
    author: "CYVRIX Editorial",
    excerpt:
      "Backups answer whether the data still exists. Continuity answers whether the organisation can keep operating. Confusing the two is how businesses find the gap at the worst possible moment.",
    tags: ["Backup", "Continuity", "Resilience"],
    published: "2026-04-18",
    body: [
      "Almost every organisation we speak to has backups. Considerably fewer have restored from them deliberately. Fewer still could say how long the business would be unable to operate while that restore ran.",
      "These are different questions, and the distance between them is where continuity planning lives.",

      "## What a backup actually answers",
      "A backup answers one question: does a copy of this data still exist somewhere. That is necessary and it is not sufficient. It says nothing about how long recovery takes, whether the systems that read the data are available, or whether anyone knows the sequence to bring things back.",
      "The classic failure is a backup that has run successfully for years against a scope defined when the business was smaller. It captures the file server nobody uses any more and misses the cloud platform everyone moved to. The job reports success every night, because it is succeeding at the wrong thing.",

      "## Start from the operational question",
      "Rather than asking what is backed up, ask what the organisation must be able to do. Take orders. Pay staff. Reach client records. Answer the phone. For each, work back to the systems that make it possible and the data those systems need.",
      "That produces a much shorter and more honest list than an inventory of servers, and it usually surfaces a dependency nobody had documented: a spreadsheet on someone's desktop, a licence key held by a person rather than the company, an integration nobody can reconfigure.",

      "## Two numbers that make the conversation concrete",
      "Recovery time objective is how long you can be without something before the impact becomes serious. Recovery point objective is how much recent work you can afford to lose. Both are business decisions rather than technical ones, and both cost more as they approach zero.",
      "Setting them honestly is more useful than setting them ambitiously. A stated objective the arrangement cannot meet is worse than an accurate one, because people plan around it.",

      "## Test the restore, not the backup",
      "A backup job reporting success confirms that data was written. It does not confirm that the data can be read, that it is complete, or that the person who would perform the restore knows how.",
      "Restore something real, on a schedule, and time it. Note what was harder than expected, which credentials were needed and who held them. The first restore attempt always reveals something, and it is considerably better to learn it on a Tuesday afternoon than during an incident.",

      "## Plan for the people, not only the systems",
      "Continuity plans fail on human details. The plan is stored on the system that is down. The person who knows the sequence is on leave. The escalation contact left the supplier last year. Nobody has the account number needed to raise a priority case.",
      "Keep the essentials somewhere that does not depend on the infrastructure being recovered, and make sure more than one person knows where that is.",

      "## Ransomware changed the shape of this",
      "Traditional backup planning assumed failure was accidental. Ransomware is deliberate, and it specifically targets backups, because attackers understand that a business with working backups does not pay.",
      "That makes immutability and separation matter in a way they previously did not. A backup an administrator can delete is a backup an attacker holding administrator credentials can delete. Assume the credentials will be compromised, and design so the copy survives anyway.",

      "## The honest summary",
      "Backup is a mechanism. Continuity is the outcome. If you can restore a file but cannot say how long it would take to resume trading, you have the mechanism without the outcome, and that gap only becomes visible at the worst possible time.",
    ],
  },
  {
    slug: "questions-before-outsourcing-it-support",
    title: "Questions to Ask Before Outsourcing IT Support",
    category: "Managed IT",
    author: "CYVRIX Editorial",
    excerpt:
      "How to compare managed IT providers on the things that determine whether the arrangement works, rather than on the numbers that are easiest to put in a proposal.",
    tags: ["Managed IT", "Procurement", "SLA"],
    published: "2026-03-29",
    body: [
      "Managed IT proposals are difficult to compare because they are written to be difficult to compare. Different scopes, different exclusions, different definitions of the same words. The headline figures that look comparable usually are not.",
      "These are the questions that tend to reveal how an arrangement will actually work in practice.",

      "## What is genuinely included, and what is chargeable",
      "Ask for the exclusions list specifically, and read it before the inclusions. That is where the commercial reality sits. Projects, out-of-hours work, third-party liaison, hardware procurement and anything described as consultancy are the usual boundaries.",
      "A provider who gives you a clear exclusions list is easier to work with than one whose proposal appears to include everything. The second has the same boundaries; you will simply discover them later, during a disagreement.",

      "## How response targets are defined and measured",
      "A response target only means something alongside its definition. Does response mean a person has assessed the issue, or that an automated acknowledgement was generated? Is the clock measured against working hours or elapsed time? Who decides the priority of an issue, you or them?",
      "Be equally careful of very aggressive published figures. A target substantially better than the market is either measuring something undemanding, or it is not being met and nobody is checking.",

      "## Who you will actually deal with",
      "The people in the sales meeting are frequently not the people who will answer your calls. Ask who handles day-to-day work, whether you have a consistent point of contact, and how an issue reaches someone senior when the first line cannot resolve it.",
      "For a smaller organisation this matters more than headcount. A provider who understands your business is more useful than a larger one where you start again with a stranger each time.",

      "## What happens to your documentation",
      "Ask how your environment is documented and whether you get a copy. This is the single most revealing question on the list.",
      "A provider confident in the relationship shares it without hesitation. One that treats documentation as leverage is telling you how an exit would go, and you should believe them.",

      "## How the relationship ends",
      "Discuss offboarding before you sign, when you have the most leverage and the least emotion. Notice period, what is handed over and in what format, who owns licences and domains, and whether there is an exit charge.",
      "Domains and licences bought in the provider's name rather than yours are a recurring and entirely avoidable problem. Check whose name they are in.",

      "## Whether security is included or sold separately",
      "Ask specifically what security the base agreement covers. Patching, endpoint protection, backup monitoring and access review are often assumed by the client and excluded by the provider.",
      "Ask also how they handle their own security. A provider holding administrative access to your systems is part of your attack surface, and it is entirely reasonable to ask how they protect the tools they would use to reach you.",

      "## What the first ninety days look like",
      "A provider who cannot describe onboarding in detail has not thought about it. Expect discovery, documentation, remediation of anything urgent, and a plan for the rest.",
      "Be wary of an arrangement that goes live immediately with no discovery period. Either they intend to learn your environment while being responsible for it, or they do not plan to learn it at all.",

      "## The question underneath all of them",
      "Most of these come down to one thing: will this provider tell you something you do not want to hear? Technology relationships fail when problems are managed rather than raised.",
      "You can usually test this during procurement. Ask something where the honest answer is inconvenient, such as whether a recommendation is genuinely necessary, or what they would not be able to do. How they answer predicts more than the proposal does.",
    ],
  },
];

/** True when a body entry is a section heading rather than a paragraph. */
export function isInsightHeading(entry: string): boolean {
  return entry.startsWith("## ");
}

/** Heading text without its marker. */
export function insightHeadingText(entry: string): string {
  return entry.slice(3).trim();
}
