/**
 * Whether a declared dependency is behind, as the Security Center reports it.
 * Pure, so the rules can be tested without the npm registry.
 */

export function cleanVersion(range: string): string {
  const match = range.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? "";
}

export function compareVersions(a: string, b: string): number {
  const left = cleanVersion(a).split(".").map(Number);
  const right = cleanVersion(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  return 0;
}

/** The leading major number, or NaN when the text does not start with one. */
const major = (version: string) => {
  const match = version.trim().match(/^[\^~>=<v\s]*(\d+)/);
  return match ? Number(match[1]) : Number.NaN;
};

/**
 * The version this package should be compared against, or null when there is
 * nothing to upgrade to.
 *
 * - A pre-release (`8.0.0-rc.33`) is not a release, even when a registry tag
 *   points at one.
 * - `@types/node` describes the Node.js runtime. It should match the runtime's
 *   major version, not the newest Node, or the types allow APIs the server
 *   does not have.
 */
export function upgradeTarget(name: string, declared: string, latest: string, runtimeNodeMajor: number): string | null {
  if (!cleanVersion(declared) || !cleanVersion(latest)) return null;
  if (name === "@types/node") {
    return major(declared) === runtimeNodeMajor ? null : `${runtimeNodeMajor}.x (the Node.js runtime)`;
  }
  if (/^\d+\.\d+\.\d+-/.test(latest.trim())) return null;
  const order = compareVersions(declared, latest);
  // A declared pre-release (^8.0.0-rc.1) is older than its own release (8.0.0),
  // unless another part of the range already names a release
  // (^8.0.0-rc.33 || ^8.0.0).
  const onlyPreReleases = declared.split("||").every((part) => /\d+\.\d+\.\d+-/.test(part));
  if (order === 0 && onlyPreReleases) return latest;
  return order < 0 ? latest : null;
}

export type DependencyHold = { by: string; range: string; maxMajor: number };

/**
 * The installed packages that stop `target` being adopted: those whose peer
 * range for this dependency ends below the target's major. Empty when nothing
 * holds it back, so the package is simply outdated.
 */
export function heldBackBy(target: string, holds: DependencyHold[] | undefined): DependencyHold[] {
  const targetMajor = major(target);
  if (!holds || Number.isNaN(targetMajor)) return [];
  return holds.filter((hold) => hold.maxMajor < targetMajor);
}
