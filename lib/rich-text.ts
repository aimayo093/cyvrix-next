/**
 * The one section type whose `body` is HTML rather than plain text.
 *
 * Every other section renders its body inside a `<p>` as a React text node,
 * which is why the distinction matters: send HTML down that path and the reader
 * sees the tags. That is what `/about`, `/careers` and `/support` were doing —
 * roughly 1,400 characters of visible `<p>` and `</strong>` on the About page —
 * because `normalizeSectionType` folded "Custom rich text" into "Text block"
 * before the dedicated branch could match it.
 *
 * Sanitising happens here, on the server, for two reasons. `SectionRenderer` is
 * a client component, so calling `xss` inside it would ship the library to every
 * visitor. And the admin write path is not the only way content reaches these
 * rows: the Restore control in Pages & Core Section Builder writes reviewed
 * content straight from `reviewed-page-content.ts`, and a migration or a direct
 * database edit bypasses `sanitize()` entirely. The renderer is the last point
 * where every path converges, so the guarantee belongs as close to it as it can
 * get without crossing into the bundle.
 */
import xss, { type IFilterXSSOptions } from "xss";

/**
 * Matched loosely because the stored value has drifted: seeded rows carry the
 * human label "Custom rich text" and anything created through the admin would
 * carry a snake_case key.
 */
export function isRichTextSection(sectionType: string | null | undefined): boolean {
  const normalised = (sectionType || "").trim().toLowerCase();
  return normalised === "custom rich text" || normalised === "custom_rich_text";
}

/**
 * Only the tags the editor actually produces: paragraphs, bold, and links.
 *
 * Deliberately narrow. A wider list is not more useful — nothing in the content
 * uses it — and every extra tag is another thing to reason about. `href` is the
 * only attribute allowed, and `xss` rejects `javascript:` URLs in it by default.
 */
const ALLOWED: IFilterXSSOptions = {
  whiteList: {
    p: [],
    strong: [],
    em: [],
    br: [],
    ul: [],
    ol: [],
    li: [],
    a: ["href", "title", "target", "rel"],
  },
  // Drop the tag but keep what it wrapped, so an unexpected `<div>` loses its
  // markup rather than its sentence.
  stripIgnoreTag: true,
  // For these two, the content is not text worth keeping.
  stripIgnoreTagBody: ["script", "style"],
};

export function sanitiseRichText(html: string): string {
  return xss(html, ALLOWED);
}

/**
 * Sanitise the body of every rich-text section in a list, leaving the rest
 * untouched.
 *
 * Plain-text sections must not pass through `xss`: it would turn an honest
 * "response < 4 hours" into "response &lt; 4 hours", and a React text node
 * prints that escape literally. Type first, then sanitise.
 */
export function withSanitisedRichText<T extends { sectionType: string; body: string | null }>(
  sections: T[]
): T[] {
  return sections.map((section) =>
    isRichTextSection(section.sectionType) && section.body
      ? { ...section, body: sanitiseRichText(section.body) }
      : section
  );
}
