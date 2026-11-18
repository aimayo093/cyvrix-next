/**
 * Turns a pasted ChatGPT "Cyvrix UK Daily Leads" report into candidate
 * opportunities (founder decision D1, 15 Nov 2026: paste-in import). Pure, so it
 * is tested on sample text (npm run test:procurement-ingest).
 *
 * The report's exact layout is not fixed, so this is forgiving: numbered or
 * bulleted items, or plain paragraphs, grouped under any headings. Every item is
 * kept with its section (the spec says to preserve all categories, commercial
 * and government alike), its first link as evidence, and its own text as a
 * quote. Nothing is inferred beyond that: an item is a "confirmed buying
 * opportunity" only if its text names a tender or a request for quotes.
 */

export type ReportItem = {
  section: string | null;
  title: string;
  url: string | null;
  quote: string;
  kind: "tender" | "commercial";
  confirmedBuying: boolean;
};

export const MAX_REPORT_CHARS = 100_000;
export const MAX_REPORT_ITEMS = 100;

const ITEM_START = /^\s*(?:\d{1,3}[.)]|[-*•▪●])\s+/;
const URL = /https?:\/\/[^\s<>()\]"']+/i;

function stripMarkdown(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Labels a lead uses for its own details, never section headings. */
const FIELD_LABEL = /^(?:sources?|links?|url|website|deadline|closing date|contacts?|value|budget|buyer|organisation|notes?|why|evidence|summary|location|date|status|next steps?|actions?|reasons?|signals?):$/i;

/**
 * `startsBlock`: the line follows a blank line or opens the text. A line that
 * merely ends in a colon is a heading then; straight after a lead it is a
 * heading too, unless it is one of a lead's own field labels ("Source:",
 * "Link:"), which stay part of that lead. Indented lines are never headings.
 */
function isHeading(line: string, startsBlock: boolean): boolean {
  const t = line.trim();
  if (!t || ITEM_START.test(t) || /^\s/.test(line)) return false;
  if (/^#{1,6}\s/.test(t)) return true;
  const plain = stripMarkdown(t);
  if (/^\*\*[^*]+\*\*:?$/.test(t) && plain.length <= 80) return true;
  if (plain.length <= 80 && /:$/.test(plain) && !URL.test(plain) && (startsBlock || !FIELD_LABEL.test(plain))) return true;
  return plain.length >= 4 && plain.length <= 60 && plain === plain.toUpperCase() && /[A-Z]/.test(plain);
}

const PUBLIC_SECTOR = /government|public sector|public-sector|tender|defence|defense|\bmod\b|nhs|council|authority|police|university|framework|procurement/i;
// A published tender or a request for quotes or proposals. Not "deadline" on its
// own, and not a request for information, which is market engagement, not buying.
const BUYING_SIGNAL = /\btenders?\b|\bitts?\b|\brfqs?\b|\brfps?\b|invitations? to tender|requests? for (?:quot|propos)|contract notices?|find a tender|contracts finder|sell2wales/i;

function toItem(section: string | null, lines: string[]): ReportItem | null {
  const block = lines.join("\n").trim();
  if (!block) return null;
  const first = stripMarkdown(lines[0].replace(ITEM_START, ""));
  const title = first.split(/\s+[–—|]\s+|\s+-\s+(?=https?:)/)[0].replace(URL, "").replace(/[\s:–—-]+$/, "").trim().slice(0, 300);
  if (title.length < 4) return null;
  // Trailing punctuation and markdown emphasis (**https://…**) are not part of the link.
  const url = block.match(URL)?.[0].replace(/[.,;:*_]+$/, "") ?? null;
  const context = `${section ?? ""} ${block}`;
  return {
    section,
    title,
    url,
    quote: stripMarkdown(block).slice(0, 1000),
    kind: PUBLIC_SECTOR.test(context) ? "tender" : "commercial",
    confirmedBuying: BUYING_SIGNAL.test(block),
  };
}

export type ParsedReport = { items: ReportItem[]; omitted: number };

/** The leads in a report, at most MAX_REPORT_ITEMS, and how many more were left out. */
export function parseReportWithCount(text: string): ParsedReport {
  const lines = text.slice(0, MAX_REPORT_CHARS).replace(/\r\n?/g, "\n").split("\n");
  const hasMarkers = lines.some((l) => ITEM_START.test(l));
  const items: ReportItem[] = [];
  let section: string | null = null;
  let current: string[] = [];
  let prevBlank = true;
  const flush = () => {
    const item = toItem(section, current);
    if (item) items.push(item);
    current = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const startsBlock = prevBlank;
    prevBlank = !line.trim();
    if (isHeading(line, startsBlock)) {
      flush();
      section = stripMarkdown(line).replace(/:$/, "").slice(0, 120) || section;
      continue;
    }
    if (!line.trim()) {
      // Without list markers, a blank line ends an item; with them, it only ends one at the top level.
      if (!hasMarkers) flush();
      continue;
    }
    if (hasMarkers) {
      if (ITEM_START.test(line) && !/^\s{2,}/.test(raw)) {
        flush();
        current.push(line);
      } else if (current.length) {
        current.push(line);
      }
      // Text before the first item (an introduction) is not an item.
    } else {
      current.push(line);
    }
  }
  flush();

  // The same lead twice in one report (same title and link) is one item.
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    const key = `${i.title.toLowerCase()}|${i.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { items: unique.slice(0, MAX_REPORT_ITEMS), omitted: Math.max(0, unique.length - MAX_REPORT_ITEMS) };
}

export function parseReport(text: string): ReportItem[] {
  return parseReportWithCount(text).items;
}
