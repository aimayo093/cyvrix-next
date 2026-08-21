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
  title: string;
  /** How the work is scoped and bought. Commercial structure only — never a price, response time or service level. */
  engagement: string;
  description: string;
  /** Detailed service routes that belong to this engine. */
  includes: ServiceEngineInclude[];
  href: string;
  cta: string;
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
    title: "Managed Services",
    engagement: "Ongoing monthly service",
    description:
      "Practical support, proactive care and clear accountability for the technology your people rely on every day.",
    includes: [
      { title: "Managed IT Support", slug: "managed-it-support" },
      { title: "Endpoint Management", slug: "endpoint-management" },
      { title: "Backup and Disaster Recovery", slug: "backup-and-disaster-recovery" },
    ],
    href: "/book-consultation?service=Managed%20Services",
    cta: "Explore managed support",
    icon: Headphones,
  },
  {
    title: "Cloud & Cybersecurity",
    engagement: "Consulting and specialist projects",
    description:
      "Reduce risk, improve resilience and move forward with a clear plan for cloud, identity and security controls.",
    includes: [
      { title: "Cloud Solutions", slug: "cloud-solutions" },
      { title: "Microsoft 365 and Google Workspace Support", slug: "microsoft-365-google-workspace-support" },
      { title: "Cybersecurity Services", slug: "cybersecurity-services" },
      { title: "Compliance and Risk Advisory", slug: "compliance-risk-advisory" },
    ],
    href: "/book-consultation?service=Cloud%20%26%20Cybersecurity",
    cta: "Book a security review",
    icon: ShieldCheck,
  },
  {
    title: "Field Engineering",
    engagement: "Contract and call-off delivery",
    description:
      "On-site expertise for deployments, refreshes, surveys, smart hands and multi-site technology rollouts.",
    includes: [
      { title: "Hardware Repair and Field Support", slug: "hardware-repair-field-support" },
      { title: "VoIP and Business Communications", slug: "voip-business-communications" },
    ],
    href: "/book-consultation?service=Field%20Engineering",
    cta: "Request an engineer",
    icon: Wrench,
  },
  {
    title: "Professional Services",
    engagement: "Fixed-scope projects",
    description:
      "Migrations, deployments, network projects and consultancy delivered with sound planning and straight answers.",
    includes: [
      { title: "IT Consultancy", slug: "it-consultancy" },
      { title: "Network Infrastructure", slug: "network-infrastructure" },
      { title: "Web, App, and Digital Solutions", slug: "web-app-digital-solutions" },
    ],
    href: "/book-consultation?service=Professional%20Services",
    cta: "Discuss a project",
    icon: BriefcaseBusiness,
  },
];

type CatalogueService = { slug: string; title: string; summary?: string | null };

export type ResolvedEngine = Omit<ServiceEngine, "includes"> & {
  includes: Array<{ slug: string; title: string; summary?: string | null }>;
};

/**
 * Resolves each engine's contents against the live service catalogue, so an
 * unpublished service drops off rather than linking to a page that is no longer
 * available. CMS titles and summaries take precedence over the static labels.
 */
export function resolveEngines(services: CatalogueService[]): ResolvedEngine[] {
  const catalogue = new Map(services.map((service) => [service.slug, service]));

  return serviceEngines.map((engine) => ({
    ...engine,
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
