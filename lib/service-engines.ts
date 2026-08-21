import {
  BriefcaseBusiness,
  Headphones,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ServiceEngineInclude = {
  title: string;
  slug: string;
};

export type ServiceEngine = {
  /** Stable key used for CMS image overrides. */
  key: string;
  title: string;
  /** How the work is scoped and bought. Commercial structure only — never a price, response time or service level. */
  engagement: string;
  /** Short summary used on cards. */
  description: string;
  /** Longer explanation used where there is room for it. */
  detail: string;
  /** What an organisation gets from this engine. Capability statements only — no metrics or guarantees. */
  outcomes: string[];
  /** Who this engine typically suits. */
  suitedTo: string;
  /** Detailed service routes that belong to this engine. */
  includes: ServiceEngineInclude[];
  /** Default representative image. Replaceable through the CMS. */
  image: string;
  imageAlt: string;
  href: string;
  cta: string;
  /** Optional second route, e.g. published plans for the recurring engine. */
  secondaryHref?: string;
  secondaryLabel?: string;
  icon: LucideIcon;
};

/**
 * The four commercial engines are the site's single service taxonomy.
 *
 * Every public surface that presents the offering reads from this list, so the
 * homepage, the Services page and any future navigation cannot drift into
 * competing category sets. Each engine states its engagement model because
 * buyers self-select by how they buy as much as by capability.
 */
export const serviceEngines: ServiceEngine[] = [
  {
    key: "managed-services",
    title: "Managed Services",
    engagement: "Ongoing monthly service",
    description:
      "Practical support, proactive care and clear accountability for the technology your people rely on every day.",
    detail:
      "Managed Services gives your organisation a dependable technology function without the cost and complexity of building one internally. We take ownership of day-to-day support, keep the device estate current and supportable, and monitor the systems your teams depend on so problems are found and dealt with rather than left to accumulate. You get a named route to help, a documented environment, and a partner who understands how your business actually works — not a queue and a ticket number.",
    outcomes: [
      "A single accountable route for everyday IT problems",
      "Devices kept patched, encrypted and consistently configured",
      "Backups managed and recovery tested rather than assumed",
      "Licensing, suppliers and renewals tracked in one place",
      "Regular reviews that surface risk before it becomes disruption",
    ],
    suitedTo:
      "Organisations without an internal IT team, or an internal team that needs practical capacity behind it.",
    includes: [
      { title: "Managed IT Support", slug: "managed-it-support" },
      { title: "Endpoint Management", slug: "endpoint-management" },
      { title: "Backup and Disaster Recovery", slug: "backup-and-disaster-recovery" },
    ],
    image: "/uploads/1780406947743-525642280-christina-wocintechchat-com-m-8YJwLFscI-s-unsplash.jpg",
    imageAlt: "A support engineer working at a desk with multiple screens",
    href: "/book-consultation?service=Managed%20Services",
    cta: "Explore managed support",
    secondaryHref: "/pricing",
    secondaryLabel: "View managed IT plans",
    icon: Headphones,
  },
  {
    key: "cloud-cybersecurity",
    title: "Cloud & Cybersecurity",
    engagement: "Consulting and specialist projects",
    description:
      "Reduce risk, improve resilience and move forward with a clear plan for cloud, identity and security controls.",
    detail:
      "Cloud and security work is where most organisations carry the most unmanaged risk, usually because platforms grew faster than the controls around them. We start by understanding what you actually have — identities, data, sharing, devices, administrative access — then set out proportionate improvements in an order that makes sense commercially. That might be tightening Microsoft 365 before any migration, planning a move to Azure properly, or getting the evidence together for a client security questionnaire or Cyber Essentials submission.",
    outcomes: [
      "A clear picture of where risk actually sits across identity, data and devices",
      "Microsoft 365 and cloud platforms configured deliberately rather than by default",
      "Administrative access, sharing and retention brought under control",
      "Migration and adoption planned around people and operational risk",
      "Readiness work and evidence for security questionnaires and assessments",
    ],
    suitedTo:
      "Organisations modernising their platforms, facing client security scrutiny, or preparing for a certification assessment.",
    includes: [
      { title: "Cloud Solutions", slug: "cloud-solutions" },
      { title: "Microsoft 365 and Google Workspace Support", slug: "microsoft-365-google-workspace-support" },
      { title: "Cybersecurity Services", slug: "cybersecurity-services" },
      { title: "Compliance and Risk Advisory", slug: "compliance-risk-advisory" },
    ],
    image: "/uploads/1780433792737-726998000-growtika-KPZNNKQbTMw-unsplash.jpg",
    imageAlt: "Server infrastructure in a data centre",
    href: "/book-consultation?service=Cloud%20%26%20Cybersecurity",
    cta: "Book a security review",
    icon: ShieldCheck,
  },
  {
    key: "field-engineering",
    title: "Field Engineering",
    engagement: "Contract and call-off delivery",
    description:
      "On-site expertise for deployments, refreshes, surveys, smart hands and multi-site technology rollouts.",
    detail:
      "Some work simply has to happen on site, and it has to happen without disrupting the people already there. Our field engineering capability covers hardware refreshes, installs, moves and changes, structured cabling and rack work, site surveys and smart hands support for remote teams. We are used to working to a schedule across multiple locations, arriving prepared, leaving the site tidy, and reporting back clearly on what was done and what still needs attention.",
    outcomes: [
      "On-site delivery scheduled around your operating hours",
      "Device deployments, refreshes and IMAC work handled end to end",
      "Rack, cabling and network installation carried out to a documented standard",
      "Site surveys that produce something you can actually act on",
      "Smart hands cover for internal teams working remotely",
    ],
    suitedTo:
      "Multi-site organisations, businesses running a refresh programme, and internal teams needing hands on the ground.",
    includes: [
      { title: "Hardware Repair and Field Support", slug: "hardware-repair-field-support" },
      { title: "VoIP and Business Communications", slug: "voip-business-communications" },
    ],
    image: "/uploads/1780431573692-717624100-thisisengineering-w_zE6qlkQKA-unsplash.jpg",
    imageAlt: "An engineer carrying out hands-on technical work",
    href: "/book-consultation?service=Field%20Engineering",
    cta: "Request an engineer",
    icon: Wrench,
  },
  {
    key: "professional-services",
    title: "Professional Services",
    engagement: "Fixed-scope projects",
    description:
      "Migrations, deployments, network projects and consultancy delivered with sound planning and straight answers.",
    detail:
      "Projects go wrong for predictable reasons: unclear scope, dependencies nobody mapped, and decisions made without understanding the operational impact. Our professional services work is deliberately structured to avoid that. We define what is in scope and what is not, identify the dependencies early, agree how success will be judged, and communicate plainly throughout — including when something needs to change. Whether it is an office relocation, a network rebuild, a platform migration or a piece of technology strategy, you get a defined outcome rather than an open-ended engagement.",
    outcomes: [
      "Scope, dependencies and success criteria agreed before work starts",
      "Migrations and deployments planned around business operations",
      "Network and infrastructure projects delivered to a documented design",
      "Straight advice on procurement, architecture and technology strategy",
      "A clear handover so the result stays supportable afterwards",
    ],
    suitedTo:
      "Organisations with a defined piece of work to deliver, or a decision that needs independent technical input.",
    includes: [
      { title: "IT Consultancy", slug: "it-consultancy" },
      { title: "Network Infrastructure", slug: "network-infrastructure" },
      { title: "Web, App, and Digital Solutions", slug: "web-app-digital-solutions" },
    ],
    image: "/uploads/1780429537221-448177094-cytonn-photography-n95VMLxqM2I-unsplash.jpg",
    imageAlt: "A project team working through a plan together",
    href: "/book-consultation?service=Professional%20Services",
    cta: "Discuss a project",
    icon: BriefcaseBusiness,
  },
];

type CatalogueService = { slug: string; title: string; summary?: string | null };

export type ResolvedEngine = Omit<ServiceEngine, "includes"> & {
  includes: Array<{ slug: string; title: string; summary?: string | null }>;
};

/** Image overrides supplied by the CMS, keyed by engine key. */
export type EngineImageOverrides = Record<string, string | undefined>;

/** Only same-origin paths and configured remote hosts are accepted as an image source. */
function safeImage(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  const value = candidate.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https:\/\/[^/]+\.supabase\.co\//.test(value)) return value;
  return fallback;
}

/**
 * Resolves each engine's contents against the live service catalogue, so an
 * unpublished service drops off rather than linking to a page that is no longer
 * available. CMS titles and summaries take precedence over the static labels,
 * and a CMS image override replaces the built-in representative image.
 */
export function resolveEngines(
  services: CatalogueService[],
  imageOverrides: EngineImageOverrides = {}
): ResolvedEngine[] {
  const catalogue = new Map(services.map((service) => [service.slug, service]));

  return serviceEngines.map((engine) => ({
    ...engine,
    image: safeImage(imageOverrides[engine.key], engine.image),
    includes: engine.includes
      .filter((item) => catalogue.has(item.slug))
      .map((item) => {
        const match = catalogue.get(item.slug);
        return {
          slug: item.slug,
          title: match?.title ?? item.title,
          summary: match?.summary ?? null,
        };
      }),
  }));
}

/**
 * Catalogue services that no engine claims — for example a service added in the
 * CMS after this mapping was written. They are surfaced separately so new CMS
 * content is never silently dropped from the public site.
 */
export function findUnmappedServices(services: CatalogueService[]): CatalogueService[] {
  const mapped = new Set(serviceEngines.flatMap((engine) => engine.includes.map((item) => item.slug)));
  return services.filter((service) => !mapped.has(service.slug));
}
