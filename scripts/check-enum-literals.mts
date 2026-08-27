/**
 * Fail the build on a status the database has never had.
 *
 * This has now happened twice, in two admin modules, with the same symptom and
 * the same cause:
 *
 *   - Ticket Management offered `AWAITING_CLIENT`. The enum says
 *     `WAITING_ON_CLIENT`. Choosing it wrote an invalid value and threw from
 *     inside a server action; the filter tab of the same name failed its query
 *     and took the page with it.
 *   - Leads CRM offered `PROPOSAL`. The enum says `PROPOSAL_SENT`. Same result.
 *
 * Both got through because the value was a plain string literal in a dropdown
 * and the write cast through `as any`. A string compiles. The casts are gone
 * now, so TypeScript catches the write — but an option list typed as `string[]`
 * would still offer a dead value silently, and this catches that.
 *
 * The rule: a SCREAMING-CASE literal assigned to, or compared with, a field the
 * schema declares as an enum must be a member of some enum. Field names repeat
 * across models, so the check is against the union of every enum's values
 * rather than the one enum for that exact field — deliberately loose, because a
 * check that fires on a false positive is a check people delete.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const schema = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");

/** Every value of every enum in the schema. */
const allEnumValues = new Set<string>();
const enumNames = new Set<string>();
for (const block of schema.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  enumNames.add(block[1]);
  for (const line of block[2].split("\n")) {
    const value = /^\s{2}([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(line);
    if (value) allEnumValues.add(value[1]);
  }
}

/** Field names the schema declares with an enum type, e.g. `status`, `role`. */
const enumFields = new Set<string>();
for (const block of schema.matchAll(/^model\s+\w+\s*\{([\s\S]*?)^\}/gm)) {
  for (const line of block[1].split("\n")) {
    const field = /^\s{2}(\w+)\s+(\w+)/.exec(line);
    if (field && enumNames.has(field[2])) enumFields.add(field[1]);
  }
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ["node_modules", ".next", "generated", ".git"].includes(entry.name) ? [] : walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const fieldNames = [...enumFields].join("|");
// `status: "X"`, `status === "X"`, `status: { in: ["X", "Y"] }`
const ASSIGNED = new RegExp(`\\b(${fieldNames})\\s*:\\s*"([A-Z][A-Z0-9_]*)"`, "g");
const COMPARED = new RegExp(`\\b(${fieldNames})\\s*[=!]==?\\s*"([A-Z][A-Z0-9_]*)"`, "g");
const IN_LIST = new RegExp(`\\b(${fieldNames})\\s*:\\s*\\{\\s*in:\\s*\\[([^\\]]*)\\]`, "g");

type Problem = { file: string; line: number; field: string; value: string; text: string };
const problems: Problem[] = [];

const files = [
  ...walk(path.join(ROOT, "app")),
  ...walk(path.join(ROOT, "lib")),
  ...walk(path.join(ROOT, "components")),
];

for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  const lines = fs.readFileSync(file, "utf8").split("\n");

  lines.forEach((line, index) => {
    const record = (field: string, value: string) => {
      if (allEnumValues.has(value)) return;
      problems.push({ file: relative, line: index + 1, field, value, text: line.trim().slice(0, 90) });
    };

    for (const match of line.matchAll(ASSIGNED)) record(match[1], match[2]);
    for (const match of line.matchAll(COMPARED)) record(match[1], match[2]);
    for (const match of line.matchAll(IN_LIST)) {
      for (const literal of match[2].matchAll(/"([A-Z][A-Z0-9_]*)"/g)) record(match[1], literal[1]);
    }
  });
}

if (problems.length === 0) {
  console.log(
    `\n  Enum check passed. ${allEnumValues.size} values across ${enumNames.size} enums, ` +
      `${enumFields.size} enum-typed field names.\n`
  );
  process.exit(0);
}

console.error(`\n  Enum check failed: ${problems.length} literal(s) the schema has no value for.\n`);
for (const problem of problems) {
  console.error(`    ${problem.file}:${problem.line}`);
  console.error(`      ${problem.field} = "${problem.value}"  — not a value of any enum`);
  console.error(`      ${problem.text}`);
}
console.error(
  "\n  A status the database rejects fails at write time, inside a server action,\n" +
    "  which surfaces as a page that stops responding. Use the enum from\n" +
    "  @/generated/prisma rather than a string literal.\n"
);
process.exit(1);
