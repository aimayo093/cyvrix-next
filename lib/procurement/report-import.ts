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

function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || ITEM_START.test(t)) return false;
  if (/^#{1,6}\s/.test(t)) return true;
  const plain = stripMarkdown(t);
  if (/^\*\*[^*]+\*\*:?$/.test(t) && plain.length <= 80) return true;
  if (plain.length <= 80 && /:$/.test(plain) && !URL.test(plain)) return true;
  return plain.length >= 4 && plain.length <= 60 && plain === plain.toUpperCase() && /[A-Z]/.test(plain);
}

const PUBLIC_SECTOR = /government|public sector|public-sector|tender|defence|defense|\bmod\b|nhs|council|authority|police|university|framework|procurement/i;
const BUYING_SIGNAL = /\btender\b|\bitt\b|\brfq\b|\brfp\b|\brfi\b|invitation to tender|request for (?:quot|propos|informat)|contract notice|find a tender|contracts finder|sell2wales|deadline/i;

function toItem(section: string | null, lines: string[]): ReportItem | null {
  const block = lines.join("\n").trim();
  if (!block) return null;
  const first = stripMarkdown(lines[0].replace(ITEM_START, ""));
  const title = first.split(/\s+[–—|]\s+|\s+-\s+(?=https?:)/)[0].replace(URL, "").replace(/[\s:–—-]+$/, "").trim().slice(0, 300);
  if (title.length < 4) return null;
  const url = block.match(URL)?.[0].replace(/[.,;:]+$/, "") ?? null;
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

export function parseReport(text: string): ReportItem[] {
  const lines = text.slice(0, MAX_REPORT_CHARS).replace(/\r\n?/g, "\n").split("\n");
  const hasMarkers = lines.some((l) => ITEM_START.test(l));
  const items: ReportItem[] = [];
  let section: string | null = null;
  let current: string[] = [];
  const flush = () => {
    const item = toItem(section, current);
    if (item) items.push(item);
    current = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (isHeading(line)) {
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

  // The same title twice in one report is one item.
  const seen = new Set<string>();
  return items
    .filter((i) => {
      const key = i.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_REPORT_ITEMS);
}
