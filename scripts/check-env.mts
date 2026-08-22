/**
 * Reports which environment values actually take effect, and which database the
 * application will talk to.
 *
 * Run with: npm run check:env
 *
 * This exists because both .env and .env.local currently declare DATABASE_URL
 * twice — once pointing at localhost and once at the hosted Supabase pooler.
 * dotenv keeps the last assignment, so the hosted database silently wins while
 * the file reads as though it is local. That is easy to miss and expensive to
 * get wrong: it means a test POST against a local dev server writes to the
 * production database.
 *
 * Nothing here prints a secret. Passwords are replaced before output.
 */
import fs from "node:fs";
import path from "node:path";

type Entry = { key: string; value: string; line: number; file: string };

/** Next loads these in order; a later file overrides an earlier one. */
const ENV_FILES = [".env", ".env.local"];

function parse(file: string): Entry[] {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return [];

  return fs
    .readFileSync(full, "utf8")
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter(({ raw }) => raw && !raw.startsWith("#") && raw.includes("="))
    .map(({ raw, line }) => {
      const eq = raw.indexOf("=");
      const key = raw.slice(0, eq).trim();
      const value = raw.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      return { key, value, line, file };
    });
}

/** Never print credentials. */
function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    const auth = url.username ? `${url.username}:***@` : "";
    const db = url.pathname.replace(/^\//, "").split("?")[0];
    return `${url.protocol}//${auth}${url.hostname}:${url.port || "(default)"}/${db}`;
  } catch {
    return "(not a URL)";
  }
}

function isLocal(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

const all = ENV_FILES.flatMap(parse);
if (all.length === 0) {
  console.log("  No .env files found.");
  process.exit(0);
}

// Effective value: last assignment across the load order wins.
const effective = new Map<string, Entry>();
const duplicates = new Map<string, Entry[]>();
for (const entry of all) {
  const seen = duplicates.get(entry.key) ?? [];
  duplicates.set(entry.key, [...seen, entry]);
  effective.set(entry.key, entry);
}

let problems = 0;

console.log("\n  Duplicate keys (a later assignment silently overrides an earlier one)");
const dupes = [...duplicates.entries()].filter(([, entries]) => entries.length > 1);
if (dupes.length === 0) {
  console.log("    none");
} else {
  for (const [key, entries] of dupes) {
    problems += 1;
    console.log(`    ${key}`);
    for (const entry of entries) {
      const wins = entry === effective.get(key);
      const shown = /URL|URI/i.test(key) ? safeUrl(entry.value) : "(value hidden)";
      console.log(`      ${wins ? "USED  " : "shadow"}  ${entry.file}:${entry.line}  ${shown}`);
    }
  }
}

console.log("\n  Effective database target");
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  const entry = effective.get(key);
  if (!entry) {
    console.log(`    ${key}: not set`);
    continue;
  }
  const local = isLocal(entry.value);
  console.log(`    ${key}: ${safeUrl(entry.value)}`);
  console.log(`      from ${entry.file}:${entry.line} — ${local ? "local" : "REMOTE / hosted"}`);
  if (!local) {
    problems += 1;
    console.log("      Writes from a local dev server will reach this database.");
  }
}

console.log(
  problems === 0
    ? "\n  No issues found.\n"
    : `\n  ${problems} thing${problems === 1 ? "" : "s"} to be aware of before running write operations.\n`
);
