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
import { companyFacts } from "../lib/company-facts";

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

// Details withheld by the company's own decision. Each is caught being typed
// straight into source, which is how a withheld value usually comes back: not
// through the guarded reference, but through someone writing it into a heading
// or a CMS section because it read better.
type Withheld = { withheld: boolean; needles: string[]; owner: string; rule: string; note: string };

const WITHHELD: Withheld[] = [
  {
    withheld: !founder.publishName,
    needles: [founder.name],
    owner: path.join("lib", "founder.ts"),
    rule: "withheld founder name",
    note: "founder.publishName is false, so the personal name must not be written into source. Use founderPublicLabel(), or set publishName to true if it should be published.",
  },
  {
    withheld: !companyFacts.publishRegisteredOffice,
    // The street line and the postcode, either of which identifies the property.
    needles: ["44 Addison Road", "SA11 2AY"],
    owner: path.join("lib", "company-facts.ts"),
    rule: "withheld registered office",
    note: "companyFacts.publishRegisteredOffice is false. The filed address is residential. Use companyFacts.registeredLocation, or set the flag to true if it should be published.",
  },
];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const sourceFiles = ["app", "components", "lib"]
  .map((dir) => path.join(process.cwd(), dir))
  .filter((root) => fs.existsSync(root))
  .flatMap(walk);

for (const entry of WITHHELD) {
  if (!entry.withheld) continue;
  for (const file of sourceFiles) {
    const relative = path.relative(process.cwd(), file);
    if (relative === entry.owner) continue;
    const contents = fs.readFileSync(file, "utf8");
    for (const needle of entry.needles) {
      if (!contents.includes(needle)) continue;
      failures.push({ where: relative, rule: entry.rule, excerpt: needle, note: entry.note });
    }
  }
}

// The hosting platform is not named in public copy. It says nothing useful to a
// visitor, and the company would rather its supplier chain were not advertised
// on the site. Admin pages are exempt: those mentions are setup instructions
// that only work if they name where to put the setting.
{
  const vendor = "Vercel";
  const exemptPrefixes = [path.join("app", "admin"), path.join("app", "portal")];

  for (const file of sourceFiles) {
    const relative = path.relative(process.cwd(), file);
    if (exemptPrefixes.some((prefix) => relative.startsWith(prefix))) continue;

    // Strip technical references before looking for prose. Package specifiers
    // like "@vercel/analytics/react" and environment variables like
    // VERCEL_PROJECT_PRODUCTION_URL are identifiers the platform defines; a
    // visitor never sees them and renaming them would break the code.
    const contents = fs
      .readFileSync(file, "utf8")
      .replace(/@vercel\/[\w/.-]+/g, "")
      .replace(/\bVERCEL_[A-Z0-9_]+/g, "");

    // A substring test rather than a word-boundary regex built from a template
    // literal. In a template literal `\b` is the backspace character, not a
    // word boundary, so that pattern matches nothing and the check passes
    // forever without ever looking at anything.
    if (!contents.toLowerCase().includes(vendor.toLowerCase())) continue;

    failures.push({
      where: relative,
      rule: "hosting platform named in public copy",
      excerpt: vendor,
      note: "Public copy refers to \"our analytics\" and \"our hosting platform\" rather than naming the supplier. Admin pages under app/admin are exempt.",
    });
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
