/**
 * The founder's verifiable professional record.
 *
 * Why this exists: the site had no named person on it anywhere. A company that
 * does not say who is behind it reads as evasive, and for a firm this size the
 * person *is* the credential. Everything here is checkable — certifications
 * against the awarding bodies' own verification services, employment against a
 * public professional profile — which is the same test every other public claim
 * on this site has to pass.
 *
 * Note carefully what this does and does not say. These are certifications held
 * by an individual. They are NOT company accreditations, and nothing here may be
 * presented as one: CYVRIX LIMITED holds no company certifications. See
 * `certificationStatus` in `lib/company-facts.ts`.
 *
 * Prior roles are the founder's own employment history, not CYVRIX client work.
 * Describing the Getronics year as a CYVRIX contract would be a misstatement —
 * it was a role held, and it is written that way throughout.
 *
 * NAME PRIVACY. `publishName` decides whether the founder's personal name
 * reaches the public site at all. While it is false, nothing may render
 * `founder.name` or `founder.linkedIn`: the LinkedIn URL contains the name, and
 * removing a name from visible copy while leaving it in JSON-LD or an href
 * would not be withholding it. `scripts/check-claims.mts` enforces this.
 *
 * Use `founderPublicLabel()` for anything a visitor sees.
 */

export type ProfessionalCertification = {
  name: string;
  issuer: string;
  /** Where anyone can independently confirm it. */
  verifiableAt: string;
};

export type CareerEntry = {
  role: string;
  organisation: string;
  period: string;
  detail: string;
};

export const founder = {
  /**
   * Set to true to publish the personal name and LinkedIn profile. While false,
   * neither may appear anywhere a visitor or a crawler can read them.
   */
  publishName: false,

  /** Withheld from the public site while `publishName` is false. */
  name: "Paul Aimayo Iyangbe",
  /** Withheld from the public site while `publishName` is false. */
  linkedIn: "https://www.linkedin.com/in/paul-iyangbe",

  role: "Founder and Principal Engineer",
  location: "Neath, Wales",

  /** First year of professional IT work, per the professional record. */
  careerStartYear: 2009,

  summary:
    "CYVRIX is led by its founder, a senior infrastructure and cloud engineer who has worked in IT since 2009, delivering second and third line support and infrastructure engineering across managed service, enterprise, healthcare and public sector environments in the UK and internationally. CYVRIX was set up in 2024 to do that work directly for organisations that want an engineer who knows their environment rather than a ticket queue.",

  approach:
    "When you contact CYVRIX, the person who answers is the person who understands your environment. That is the advantage a firm this size has over a consolidator's call centre, and it is deliberate rather than a stage we are trying to grow out of.",
} as const;

/**
 * How the founder is referred to in public copy.
 *
 * Returns the personal name only when `publishName` is true, so a single flag
 * governs every public surface instead of each page deciding for itself.
 */
export function founderPublicLabel(): string {
  return founder.publishName ? founder.name : "our founder";
}

/** True when the personal name and profile link may be rendered publicly. */
export function canPublishFounderIdentity(): boolean {
  return founder.publishName;
}

/**
 * Individual professional certifications the founder holds.
 *
 * Each is verifiable by the issuing body. CompTIA operates a public credential
 * verification service; ITIL Foundation is verifiable through PeopleCert.
 *
 * While the founder's name is withheld a stranger cannot run those checks
 * unaided, so public copy offers evidence on request rather than implying
 * independent verification is available to anyone who looks.
 */
export const founderCertifications: ProfessionalCertification[] = [
  { name: "CompTIA Security+", issuer: "CompTIA", verifiableAt: "CompTIA credential verification" },
  { name: "CompTIA PenTest+", issuer: "CompTIA", verifiableAt: "CompTIA credential verification" },
  { name: "CompTIA Cloud+", issuer: "CompTIA", verifiableAt: "CompTIA credential verification" },
  { name: "CompTIA Network+", issuer: "CompTIA", verifiableAt: "CompTIA credential verification" },
  { name: "CompTIA A+", issuer: "CompTIA", verifiableAt: "CompTIA credential verification" },
  { name: "ITIL Foundation", issuer: "PeopleCert", verifiableAt: "PeopleCert certificate verification" },
];

export const founderEducation = [
  { qualification: "M.Sc. Information Technology", institution: "National Open University of Nigeria" },
  { qualification: "B.Sc. Computer Science", institution: "University of Benin" },
];

/**
 * Selected roles, described as the founder's own experience.
 *
 * End clients are not named. The Getronics work was delivered to that company's
 * customers under their contract, and naming those organisations here would
 * publish someone else's client list.
 */
export const founderExperience: CareerEntry[] = [
  {
    role: "Field Service Engineer, Dell and Lenovo hardware support",
    organisation: "Getronics Limited",
    period: "2025",
    detail:
      "A full year of on-site field engineering for business and public sector sites across Wales: warranty and out-of-warranty repair on Dell and Lenovo laptops, desktops, workstations and servers, diagnosing hardware, firmware, BIOS and connectivity faults, working to agreed service levels.",
  },
  {
    role: "Network and IT Support Specialist",
    organisation: "Rancilio International Limited",
    period: "2020 to 2022",
    detail:
      "Infrastructure and endpoint support across Windows servers and workstations, structured cabling, routers, wireless and firewalls, with CCTV and access control as part of a wider network security remit.",
  },
  {
    role: "IT Support Specialist",
    organisation: "Clickspection Concept Limited",
    period: "2009 to 2020",
    detail:
      "Endpoint, server, application and network support for business clients, including investigating security weaknesses and suspicious activity, configuring firewalls and endpoint protection, and building internal assessment tooling in Python and Bash.",
  },
];

/** Areas the founder works in day to day, for a capability summary. */
export const founderCapabilities = [
  "Windows Server 2012 to 2022, Active Directory and Group Policy",
  "Microsoft 365, Entra ID and Intune",
  "Microsoft Azure and hybrid cloud infrastructure",
  "Virtualisation with Hyper-V and VMware",
  "Networking, firewalls, VLANs, VPN and structured cabling",
  "Backup, disaster recovery and business continuity",
  "Vulnerability assessment and network security review",
  "ITIL-aligned incident, problem and change management",
];

/*
 * Deliberately no "years of experience" helper.
 *
 * Any such figure needs the current date, and `new Date()` in a prerendered
 * Server Component either fails the build or silently freezes at build time.
 * "since 2009" is the same fact, never goes stale, and needs no dynamic
 * boundary to render.
 */
