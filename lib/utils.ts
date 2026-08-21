import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Removes a redundant trailing brand segment from a CMS-supplied page title.
 *
 * The root layout appends "| CYVRIX Technologies" to every page title, so a
 * brand suffix typed into the CMS would render twice. Editors reasonably type
 * the full title, so this normalises rather than relying on editorial habit.
 * Returns undefined when nothing usable remains, letting the caller fall back.
 */
export function stripBrandSuffix(title?: string | null): string | undefined {
  if (!title) return undefined;
  const cleaned = title
    .replace(/\s*[|–—-]\s*CYVRIX(\s+(Technologies|Insights|Admin|Client\s+Portal))?\s*$/i, "")
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}
