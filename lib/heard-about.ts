/**
 * The answers to "How did you hear about us?" on the enquiry and quote forms.
 *
 * Fixed in code, not in the CMS, so a label edited in the CMS cannot carry
 * arbitrary text into the CRM. Adding an answer is a code change. Pure: no I/O,
 * so scripts/test-enquiry-source.mts can exercise it.
 */
export const HEARD_ABOUT = [
  { value: "search", label: "Google or another search engine" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "social", label: "Facebook, Instagram or X" },
  { value: "recommendation", label: "A recommendation from someone I know" },
  { value: "existing_relationship", label: "An existing client or supplier" },
  { value: "local", label: "A local advert, flyer or vehicle" },
  { value: "event", label: "An event or networking" },
  { value: "directory", label: "A business directory or marketplace" },
  { value: "other", label: "Somewhere else" },
] as const;

export type HeardAbout = (typeof HEARD_ABOUT)[number]["value"];

const VALUES = new Set<string>(HEARD_ABOUT.map((option) => option.value));

/** A known answer, or null. Anything else is discarded, never stored as free text. */
export function normaliseHeardAbout(input: unknown): HeardAbout | null {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";
  return VALUES.has(value) ? (value as HeardAbout) : null;
}

/** The free-text detail, kept only when the answer is "other". */
export function normaliseHeardAboutOther(answer: HeardAbout | null, input: unknown): string | null {
  if (answer !== "other" || typeof input !== "string") return null;
  const text = input.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return text || null;
}

export function heardAboutLabel(value: string | null | undefined): string | null {
  return HEARD_ABOUT.find((option) => option.value === value)?.label ?? null;
}
