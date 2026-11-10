/**
 * Pure parsing for the live security probes, kept apart so it can be tested
 * against real page markup without a network.
 */

/**
 * Same-origin client bundles referenced by a page, as paths without a query.
 *
 * The hosting platform's skew protection appends `?dpl=<deployment>` to every
 * asset, so a pattern that expects `.js"` finds nothing and the source-map
 * check falls back to "not assessed" — which is what happened once the
 * project moved to a paid plan. The query is dropped because the source map, if one is served,
 * lives beside the file at `<path>.map`.
 */
export function clientBundlePaths(html: string, limit = 3): string[] {
  const paths = [...html.matchAll(/src="(\/_next\/static\/[^"?#]+\.js)(?:[?#][^"]*)?"/g)].map((match) => match[1]);
  return [...new Set(paths)].slice(0, limit);
}
