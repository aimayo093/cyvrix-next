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

const major = (version: string) => Number(cleanVersion(version).split(".")[0]);

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
  return compareVersions(declared, latest) < 0 ? latest : null;
}
