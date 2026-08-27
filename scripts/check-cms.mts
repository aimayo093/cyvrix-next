/**
 * Fail the build when the CMS and the public site stop agreeing.
 *
 * Everything checked here was a real defect found on the live site, and each one
 * shared a shape: the admin accepted an edit, saved it, showed it back, and the
 * page rendered something else — or nothing. Nothing errored, so nothing
 * surfaced. That is the failure mode this file exists to make loud.
 *
 * Deliberately static. It parses source rather than querying the database, so it
 * runs in CI without credentials and cannot be defeated by the state of one
 * environment's rows.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const RENDERER = "components/shared/SectionRenderer.tsx";
const ADMIN = "app/admin/pages-cms/page.tsx";
const REVIEWED = "lib/reviewed-page-content.ts";

const rendererSource = read(RENDERER);
const adminSource = read(ADMIN);

type Failure = { check: string; detail: string };
const failures: Failure[] = [];
const notes: string[] = [];

/** The `case "..."` labels the renderer's switch actually handles. */
const rendererCases = new Set(
  [...rendererSource.matchAll(/^\s+case "([^"]+)":/gm)].map((m) => m[1])
);

/** The `type` values the admin offers when creating a section. */
const adminTypes = [...adminSource.matchAll(/\{\s*type:\s*"([^"]+)",\s*name:\s*"([^"]+)"\s*\}/g)].map(
  (m) => ({ type: m[1], name: m[2] })
);

/**
 * Re-implement `normalizeSectionType` by reading its source.
 *
 * Importing it is not an option — the renderer is a client component pulling in
 * React and a hundred icons — and copying the mapping into this file would just
 * create a third thing to keep in sync. Reading the conditionals back is the
 * only version that cannot drift.
 */
function buildNormaliser(): (type: string) => string {
  const body = /function normalizeSectionType\(type: string\): string \{([\s\S]*?)\n\}/.exec(
    rendererSource
  );
  if (!body) {
    failures.push({ check: "normaliser", detail: `Could not find normalizeSectionType in ${RENDERER}.` });
    return (t) => t;
  }

  const rules: Array<{ matches: string[]; result: string }> = [];
  for (const line of body[1].split("\n")) {
    const returned = /return "([^"]+)";/.exec(line);
    if (!returned || !line.includes("t ===")) continue;
    rules.push({
      matches: [...line.matchAll(/t === "([^"]+)"/g)].map((m) => m[1]),
      result: returned[1],
    });
  }

  if (rules.length === 0) {
    failures.push({ check: "normaliser", detail: "normalizeSectionType parsed to zero rules." });
  }

  return (type: string) => {
    const t = (type || "").toLowerCase();
    for (const rule of rules) if (rule.matches.includes(t)) return rule.result;
    return type;
  };
}

const normalise = buildNormaliser();

// ── 1. Every type the admin offers must render ───────────────────────────────
//
// The picker used to offer an About block, a Mission block and a job listing
// list. None had a branch in the renderer, so the section saved, appeared in the
// admin, and drew nothing on the page.
for (const { type, name } of adminTypes) {
  const resolved = normalise(type);
  if (!rendererCases.has(resolved)) {
    failures.push({
      check: "admin offers a section the site cannot render",
      detail: `"${name}" (${type}) normalises to "${resolved}", which ${RENDERER} has no case for. Add the branch, or take it out of the picker.`,
    });
  }
}

// ── 2. Every type the renderer supports must be creatable ────────────────────
//
// The other direction is quieter but just as bad: a section type the renderer
// draws but the admin cannot add is a section you can delete once and never get
// back. Six were in that state.
const creatable = new Set(adminTypes.map(({ type }) => normalise(type)));
for (const rendered of [...rendererCases].sort()) {
  if (!creatable.has(rendered)) {
    failures.push({
      check: "site renders a section the admin cannot create",
      detail: `"${rendered}" has a branch in ${RENDERER} but nothing in the ${ADMIN} picker produces it. Delete one of these and it is gone for good.`,
    });
  }
}

// ── 3. Reviewed content must survive a restore ───────────────────────────────
//
// Restore writes these straight into the CMS. A section type here that the
// renderer does not know would be written successfully and then vanish.
const reviewedSource = read(REVIEWED);
const reviewedTypes = new Set(
  [...reviewedSource.matchAll(/sectionType:\s*"([^"]+)"/g)].map((m) => m[1])
);
for (const type of [...reviewedTypes].sort()) {
  const resolved = normalise(type);
  if (!rendererCases.has(resolved)) {
    failures.push({
      check: "reviewed content uses a section the site cannot render",
      detail: `${REVIEWED} contains sectionType "${type}" (normalises to "${resolved}"), which the renderer would drop on restore.`,
    });
  }
}

// ── 4. A CMS-backed page must read its sections ──────────────────────────────
//
// `/contact` had three sections an administrator could edit and a route that
// never looked at them. docs/DECISIONS.md says the CMS wins for that page; the
// code did not implement it.
//
// The home page is the deliberate exception: it renders through PremiumHome,
// which reads the Hero section and nothing else.
const BESPOKE_ROUTES: Record<string, string> = {
  home: "renders through components/public/PremiumHome.tsx",
};

const reviewedSlugs = [...reviewedSource.matchAll(/^\s+slug: "([^"]+)",$/gm)].map((m) => m[1]);
for (const slug of reviewedSlugs) {
  if (BESPOKE_ROUTES[slug]) continue;
  const route = `app/(public)/${slug}/page.tsx`;
  if (!fs.existsSync(path.join(ROOT, route))) {
    failures.push({
      check: "reviewed page has no route",
      detail: `${REVIEWED} defines "${slug}" but ${route} does not exist.`,
    });
    continue;
  }
  // The route may hand its sections to a client component rather than render
  // them directly — /contact does — so the whole route folder counts.
  const folder = path.join(ROOT, "app/(public)", slug);
  const rendersSections = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".tsx"))
    .some((file) => fs.readFileSync(path.join(folder, file), "utf8").includes("SectionRenderer"));

  if (!rendersSections) {
    failures.push({
      check: "CMS-backed page ignores its own sections",
      detail: `Nothing in app/(public)/${slug}/ renders SectionRenderer, so a section an administrator adds to "/${slug}" is discarded.`,
    });
  }
}

// ── 5. Settings keys written by the admin must be read somewhere ─────────────
//
// A `settingsJson_*` input with no reader is a field that saves and does
// nothing. This one reports rather than fails: a key can legitimately be read by
// a component this check does not know about, and a false build failure teaches
// people to bypass the check.
const writtenKeys = new Set(
  [...adminSource.matchAll(/name="settingsJson_([A-Za-z0-9_]+)"/g)].map((m) => m[1])
);
const readSurface = [RENDERER, "components/public/PremiumHome.tsx"]
  .filter((p) => fs.existsSync(path.join(ROOT, p)))
  .map(read)
  .join("\n");
for (const key of [...writtenKeys].sort()) {
  if (!new RegExp(`settings\\.${key}\\b|"${key}"|\\.${key}\\b`).test(readSurface)) {
    notes.push(`settingsJson_${key} is editable in the admin but nothing reads it.`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const label = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

if (notes.length > 0) {
  console.log(`\n  ${label(notes.length, "note", "notes")}\n`);
  for (const note of notes) console.log(`    - ${note}`);
}

if (failures.length === 0) {
  console.log(
    `\n  CMS check passed. ${label(adminTypes.length, "section type", "section types")} offered, ` +
      `${label(rendererCases.size, "renderer branch", "renderer branches")}, ` +
      `${label(reviewedSlugs.length, "reviewed page", "reviewed pages")}.\n`
  );
  process.exit(0);
}

console.error(`\n  CMS check failed: ${label(failures.length, "problem", "problems")}.\n`);
let heading = "";
for (const failure of failures) {
  if (failure.check !== heading) {
    console.error(`  ${failure.check}`);
    heading = failure.check;
  }
  console.error(`    - ${failure.detail}`);
}
console.error(
  "\n  Each of these is silent at runtime: the admin saves, and the page shows\n" +
    "  something else. Fix the mismatch rather than relaxing the check.\n"
);
process.exit(1);
