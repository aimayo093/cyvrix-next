export const publicLegalPageDefinitions = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    route: "/privacy-policy",
    description: "How personal information is handled across CYVRIX services.",
  },
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    route: "/terms",
    description: "The terms that apply to CYVRIX services and engagements.",
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    route: "/cookie-policy",
    description: "How cookies and similar technologies are described for CYVRIX services.",
  },
] as const;

export type PublicLegalSlug = (typeof publicLegalPageDefinitions)[number]["slug"];

export function findPublicLegalPageDefinition(slug: string) {
  return publicLegalPageDefinitions.find((page) => page.slug === slug) ?? null;
}
