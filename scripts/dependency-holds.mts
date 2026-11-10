/**
 * Which newer major releases of our direct dependencies are held back by an
 * installed package, and by which. Written to lib/generated/dependency-holds.json
 * at build time, where node_modules exists; the deployed scan reads it.
 *
 * A package is held back when something installed declares a peer range that
 * stops at a lower major: eslint-config-next's plugins accept ESLint up to 9,
 * so ESLint 10 cannot be adopted however often a scan says it is out.
 * Run: npm run scan:deps (part of the build).
 */
import fs from "node:fs";
import path from "node:path";
import semver from "semver";

const ROOT = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const direct = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));

type Hold = { by: string; range: string; maxMajor: number };
const holds: Record<string, Hold[]> = {};

/** The highest major the range admits, or null when it has no ceiling. */
function maxMajor(range: string): number | null {
  if (!semver.validRange(range)) return null;
  if (semver.intersects(range, ">=1000.0.0")) return null;
  for (let major = 999; major >= 0; major--) {
    if (semver.intersects(range, `${major}.x`)) return major;
  }
  return null;
}

function visit(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("@")) {
      visit(full);
      continue;
    }
    const manifest = path.join(full, "package.json");
    if (fs.existsSync(manifest)) {
      try {
        const info = JSON.parse(fs.readFileSync(manifest, "utf8"));
        for (const [name, range] of Object.entries<string>(info.peerDependencies ?? {})) {
          if (!direct.has(name) || info.name === name) continue;
          const ceiling = maxMajor(range);
          if (ceiling === null) continue;
          const list = (holds[name] ??= []);
          if (!list.some((hold) => hold.by === info.name && hold.range === range)) {
            list.push({ by: info.name, range, maxMajor: ceiling });
          }
        }
      } catch {
        // An unreadable manifest is not ours to judge.
      }
    }
    visit(path.join(full, "node_modules"));
  }
}

visit(path.join(ROOT, "node_modules"));
for (const list of Object.values(holds)) list.sort((a, b) => a.maxMajor - b.maxMajor || a.by.localeCompare(b.by));

const out = path.join(ROOT, "lib", "generated", "dependency-holds.json");
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), holds }, null, 2) + "\n");
console.log(`  Dependency holds written: ${Object.keys(holds).length} package(s) with a peer ceiling.`);
