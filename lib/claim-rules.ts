/**
 * The public-claims rules (DECISIONS section 2).
 *
 * One list, used by the build check (`scripts/check-claims.mts`) and by AI
 * drafts submitted through the Paperclip integration, so content an agent
 * writes is held to the same standard as content a person writes.
 */

export type ClaimRule = { name: string; pattern: RegExp; note: string };

export const CLAIM_RULES: ClaimRule[] = [
  {
    name: "certification held",
    // "ISO 27001 certified" is a claim. "ISO 27001 readiness" is a service.
    pattern:
      /\b(ISO\s?(\/?\s?IEC\s?)?27001|ISO\s?9001|CREST|Cyber\s?Essentials|SOC\s?2|PCI[\s-]?DSS)\b(?!\s*(readiness|submission|preparation|gap|assessment|in progress|not yet|questionnaire))/i,
    note: "Name a certification only as work we help with, or as explicitly not held.",
  },
  {
    name: "uptime or SLA figure",
    pattern: /\b\d{1,3}(\.\d+)?\s?%\s*(uptime|sla|availability|adherence|satisfaction)/i,
    note: "We do not publish availability figures.",
  },
  {
    name: "response time commitment",
    pattern: /\b(<|under|within|less than)\s?\d+\s?(min|minute|hour|hr|second|sec)\b/i,
    note: "We do not publish response times.",
  },
  {
    name: "rating",
    pattern: /\b\d(\.\d)?\s?\/\s?5\b|\b\d(\.\d)?\s?out of\s?5\b/i,
    note: "We have no published review corpus.",
  },
  {
    name: "scale claim",
    pattern: /\b\d{2,}\+?\s?(clients?|customers?|engineers?|staff|employees|businesses|users|endpoints|devices)\b/i,
    note: "We do not publish counts of clients or staff.",
  },
  {
    name: "superlative",
    pattern: /\b(award[- ]winning|leading provider|number one|#1|best[- ]in[- ]class|market leader|world[- ]class)\b/i,
    note: "Unsupportable positioning language.",
  },
  {
    name: "guarantee",
    pattern: /\b(guarantee[sd]?|100%\s?(secure|safe|protected)|zero\s?(downtime|breaches))\b/i,
    note: "Nothing in security is guaranteed.",
  },
];

export type ClaimFinding = { rule: string; excerpt: string; note: string };

/** Every rule a piece of text breaks, with the words around each match. */
export function claimFindings(text: string): ClaimFinding[] {
  const findings: ClaimFinding[] = [];
  for (const rule of CLAIM_RULES) {
    const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`;
    const pattern = new RegExp(rule.pattern.source, flags);
    for (const match of text.matchAll(pattern)) {
      const start = Math.max(0, (match.index ?? 0) - 40);
      const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 40);
      findings.push({ rule: rule.name, excerpt: text.slice(start, end).replace(/\s+/g, " ").trim(), note: rule.note });
    }
  }
  return findings;
}
