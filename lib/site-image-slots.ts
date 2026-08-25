/**
 * Every image on the public site an administrator can replace.
 *
 * Why this exists: hero images across services, industries, pages and the four
 * engines are all read from the `site_images` setting, which meant they were
 * nominally CMS-editable while there was no interface to edit them. This is the
 * registry the admin editor renders from.
 *
 * Slots are derived from the content modules rather than listed by hand. Add a
 * service to `serviceDetailContent` or a page to `pageHeroes` and its slot
 * appears here automatically, so the editor cannot fall behind the site.
 *
 * `defaultImage` is the reviewed image the page falls back to when no override
 * is set. Showing it in the editor is the point: an administrator replacing an
 * image should see what they are replacing.
 */
import { pageHeroes } from "@/lib/page-heroes";
import { serviceEngines } from "@/lib/service-engines";
import { industryContent } from "@/lib/industry-content";
import { serviceDetailContent } from "@/lib/service-detail-content";
import { industries as industryCatalogue, services as serviceCatalogue } from "@/lib/cyvrix-data";

/** Top-level keys of the `site_images` setting. */
export type SiteImageGroup = "hero" | "engines" | "pages" | "services" | "industries";

export type SiteImageSlot = {
  group: SiteImageGroup;
  /** Key within the group. Empty for the single homepage hero. */
  key: string;
  /** Form field name, and the path into the stored object. */
  field: string;
  label: string;
  /** What the page shows when no override is set. */
  defaultImage?: string;
  /** Where this image appears, so the choice is not made blind. */
  appearsOn: string;
};

export type SiteImageSection = {
  group: SiteImageGroup;
  title: string;
  description: string;
  slots: SiteImageSlot[];
};

/** Turn a slug into something readable when no catalogue title exists. */
function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function serviceTitle(slug: string): string {
  return serviceCatalogue.find((service) => service.slug === slug)?.title ?? titleFromSlug(slug);
}

function industryTitle(slug: string): string {
  return industryCatalogue.find((industry) => industry.slug === slug)?.title ?? titleFromSlug(slug);
}

export const siteImageSections: SiteImageSection[] = [
  {
    group: "hero",
    title: "Home page",
    description: "The main image on the home page hero.",
    slots: [
      {
        group: "hero",
        key: "",
        field: "hero",
        label: "Home page hero",
        appearsOn: "/",
      },
    ],
  },
  {
    group: "engines",
    title: "Service engines",
    description: "The four cards on the home page, and the engine headers on the services page.",
    slots: serviceEngines.map((engine) => ({
      group: "engines" as const,
      key: engine.key,
      field: `engines.${engine.key}`,
      label: engine.title,
      defaultImage: engine.image,
      appearsOn: "/ and /services",
    })),
  },
  {
    group: "pages",
    title: "Page heroes",
    description: "The hero image on each of these pages.",
    slots: (Object.keys(pageHeroes) as Array<keyof typeof pageHeroes>).map((key) => ({
      group: "pages" as const,
      key,
      field: `pages.${key}`,
      label: titleFromSlug(String(key)),
      defaultImage: pageHeroes[key].image,
      appearsOn: `/${key}`,
    })),
  },
  {
    group: "services",
    title: "Service pages",
    description: "The hero image on each individual service page.",
    slots: Object.keys(serviceDetailContent).map((slug) => ({
      group: "services" as const,
      key: slug,
      field: `services.${slug}`,
      label: serviceTitle(slug),
      defaultImage: serviceDetailContent[slug].image,
      appearsOn: `/services/${slug}`,
    })),
  },
  {
    group: "industries",
    title: "Industry pages",
    description: "The hero image on each industry page.",
    slots: Object.keys(industryContent).map((slug) => ({
      group: "industries" as const,
      key: slug,
      field: `industries.${slug}`,
      label: industryTitle(slug),
      defaultImage: industryContent[slug].image,
      appearsOn: `/industries/${slug}`,
    })),
  },
];

export const siteImageSlots: SiteImageSlot[] = siteImageSections.flatMap((section) => section.slots);

/** Field names the editor is allowed to write, so a form post cannot set anything else. */
export const siteImageFieldNames: Set<string> = new Set(siteImageSlots.map((slot) => slot.field));

/**
 * Reads the override currently stored for a slot.
 *
 * The setting is a nested object; slot fields are dotted paths into it.
 */
export function readStoredImage(stored: unknown, field: string): string | undefined {
  if (!stored || typeof stored !== "object") return undefined;

  const [group, key] = field.split(".");
  const record = stored as Record<string, unknown>;

  if (!key) {
    return typeof record[group] === "string" ? (record[group] as string) : undefined;
  }

  const groupValue = record[group];
  if (!groupValue || typeof groupValue !== "object") return undefined;

  const value = (groupValue as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * Folds submitted fields back into the nested shape `getSiteImages` reads.
 *
 * Empty values are dropped rather than stored as empty strings, so clearing an
 * image in the editor restores the reviewed default instead of leaving the page
 * with no image at all.
 */
export function buildSiteImagesValue(entries: Iterable<[string, string]>): Record<string, unknown> {
  const value: Record<string, unknown> = {};

  for (const [field, raw] of entries) {
    if (!siteImageFieldNames.has(field)) continue;

    const url = raw.trim();
    if (!url) continue;

    const [group, key] = field.split(".");
    if (!key) {
      value[group] = url;
      continue;
    }

    const existing = (value[group] as Record<string, string> | undefined) ?? {};
    existing[key] = url;
    value[group] = existing;
  }

  return value;
}
