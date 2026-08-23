/**
 * Fails if the reviewed page content contains a claim we cannot evidence.
 *
 * Run with: npm run check:claims
 *
 * The public site's rule is that a claim is either verifiable against a public
 * register or absent. That rule is easy to hold while writing and easy to lose
 * later, when someone adds "99.8% uptime" to a feature card because the layout
 * looked empty. This turns the rule into something that fails a build.
 *
 * It reads `lib/reviewed-page-content.ts` only. Database content is checked
 * separately, because that is authored through the CMS at runtime.
 */
import fs from "node:fs";
import path from "node:path";
import { reviewedPages, findDisallowedSections } from "../lib/reviewed-page-content";
import { founder } from "../lib/founder";

type Rule = { name: string; pattern: RegExp; note: string };

const RULES: Rule[] = [
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

type Failure = { where: string; rule: string; excerpt: string; note: string };
const failures: Failure[] = [];

function check(where: string, value: unknown) {
  if (value === null || value === undefined) return;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return;

  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (!match) continue;
    const start = Math.max(0, match.index - 50);
    failures.push({
      where,
      rule: rule.name,
      excerpt: text.slice(start, match.index + match[0].length + 50).replace(/\s+/g, " "),
      note: rule.note,
    });
  }
}

let sectionCount = 0;
for (const page of reviewedPages) {
  for (const [index, section] of page.sections.entries()) {
    sectionCount += 1;
    const where = `/${page.slug} section ${index + 1} [${section.sectionType}]`;
    check(where, section.title);
    check(where, section.subtitle);
    check(where, section.body);
    check(where, section.settings);
  }
}

// Every section type we emit must be one SectionRenderer actually handles.
// Its switch returns null for anything unknown, so a typo would silently
// publish an empty page rather than fail.
const rendererSource = fs.readFileSync(
  path.join(process.cwd(), "components/shared/SectionRenderer.tsx"),
  "utf8"
);
const handled = new Set(
  [...rendererSource.matchAll(/^\s+case "([^"]+)":/gm)].map((match) => match[1])
);

for (const page of reviewedPages) {
  for (const [index, section] of page.sections.entries()) {
    if (handled.has(section.sectionType)) continue;
    failures.push({
      where: `/${page.slug} section ${index + 1}`,
      rule: "unknown section type",
      excerpt: section.sectionType,
      note: `SectionRenderer has no case for this, so it would render nothing. Known types: ${[...handled].sort().join(", ")}`,
    });
  }
}

// The founder's personal name is withheld by preference. Catch it being typed
// straight into public copy, which is how a withheld name usually comes back:
// not through the guarded `founder.name` reference, but through someone writing
// it into a heading or a CMS section because it read better.
if (!founder.publishName) {
  const publicDirs = ["app", "components", "lib"];
  const skip = new Set([path.join("lib", "founder.ts")]);

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });

  for (const dir of publicDirs) {
    const root = path.join(process.cwd(), dir);
    if (!fs.existsSync(root)) continue;
    for (const file of walk(root)) {
      const relative = path.relative(process.cwd(), file);
      if (skip.has(relative)) continue;
      if (!fs.readFileSync(file, "utf8").includes(founder.name)) continue;
      failures.push({
        where: relative,
        rule: "withheld founder name",
        excerpt: founder.name,
        note: "founder.publishName is false, so the personal name must not be written into source. Use founderPublicLabel(), or set publishName to true if it should be published.",
      });
    }
  }
}

const disallowed = findDisallowedSections();
for (const entry of disallowed) {
  failures.push({
    where: `/${entry.slug}`,
    rule: "disallowed section type",
    excerpt: entry.sectionType,
    note: "Statistics sections exist to display figures we cannot evidence.",
  });
}

console.log(
  `\n  Checked ${sectionCount} section(s) across ${reviewedPages.length} reviewed page(s)` +
    ` against ${RULES.length} claim rules,\n  and validated every section type against the` +
    ` ${handled.size} the renderer handles.\n`
);

if (failures.length === 0) {
  console.log("  No unevidenced claims found.\n");
  process.exit(0);
}

for (const failure of failures) {
  console.log(`  FAIL  ${failure.where}`);
  console.log(`        rule    : ${failure.rule}`);
  console.log(`        found   : ...${failure.excerpt}...`);
  console.log(`        why     : ${failure.note}\n`);
}
console.log(`  ${failures.length} problem(s).\n`);
process.exit(1);
