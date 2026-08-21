/**
 * Representative hero imagery for the public pages that are not services or
 * industries. Each entry is a reviewed default; all are replaceable through the
 * CMS via the `site_images` setting (`pages.<key>`).
 *
 * Only real photography is used. The AI-generated brand images in
 * public/uploads are deliberately excluded: they render fabricated dashboard
 * metrics and garbled interface text.
 */
export type PageHeroKey =
  | "about"
  | "industries"
  | "faq"
  | "request-quote"
  | "book-consultation"
  | "contact";

export type PageHero = {
  image: string;
  imageAlt: string;
};

const UPLOADS = "/uploads";

export const pageHeroes: Record<PageHeroKey, PageHero> = {
  about: {
    image: `${UPLOADS}/1780433144439-906809667-thisisengineering-ZPeXrWxOjRQ-unsplash.jpg`,
    imageAlt: "An engineer working through a technical problem on site",
  },
  industries: {
    image: `${UPLOADS}/1780500324870-943991071-marcin-jozwiak-kGoPcmpPT7c-unsplash.jpg`,
    imageAlt: "An aerial view of industrial and commercial premises",
  },
  faq: {
    image: `${UPLOADS}/1780432959228-436728125-alexandre-debieve-FO7JIlwjOtU-unsplash.jpg`,
    imageAlt: "A close view of computer circuitry",
  },
  "request-quote": {
    image: `${UPLOADS}/1780429537221-448177094-cytonn-photography-n95VMLxqM2I-unsplash.jpg`,
    imageAlt: "Two people agreeing terms across a table",
  },
  "book-consultation": {
    image: `${UPLOADS}/1780406947743-525642280-christina-wocintechchat-com-m-8YJwLFscI-s-unsplash.jpg`,
    imageAlt: "A specialist reviewing systems across multiple screens",
  },
  contact: {
    image: `${UPLOADS}/1780433230805-42051091-christina-wocintechchat-com-m-6Dv3pe-JnSg-unsplash.jpg`,
    imageAlt: "A technical team working together at a desk",
  },
};

/** Only same-origin paths and the configured Supabase host are accepted. */
function safeImage(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  const value = candidate.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https:\/\/[^/]+\.supabase\.co\//.test(value)) return value;
  return fallback;
}

export function getPageHero(key: PageHeroKey, imageOverride?: string): PageHero {
  const base = pageHeroes[key];
  return { ...base, image: safeImage(imageOverride, base.image) };
}
