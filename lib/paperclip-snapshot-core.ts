/**
 * Pure helpers for the Paperclip company snapshot (DECISIONS §15), so
 * `npm run test:paperclip` can cover them.
 */

/**
 * Routes whose paths can identify a person or only exist behind sign-in. A
 * survey link carries a per-client token, unsubscribe and privacy-request links
 * can too, and signed-in areas say nothing useful about marketing.
 */
const PRIVATE_PREFIXES = ["/admin", "/portal", "/login", "/api", "/security-setup", "/survey", "/unsubscribe", "/privacy-request", "/thank-you"];

/**
 * The website's most-viewed public pages, for the snapshot: query strings and
 * fragments removed (they can carry campaign or personal values), private or
 * token-bearing routes left out. The analytics query returns five pages
 * (lib/site-traffic.ts); ten is only a ceiling. Agents run on a model outside
 * the UK, so only page paths and their counts leave the site.
 */
export function publicTopPages(pages: { path: string; pageviews: number }[]): { path: string; pageviews: number }[] {
  const totals = new Map<string, number>();
  for (const page of pages) {
    const path = page.path.split(/[?#]/)[0] || "/";
    // Skipped, not truncated: cutting would merge distinct long paths under
    // a path that may not exist.
    if (!path.startsWith("/") || path.length > 200) continue;
    if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) continue;
    totals.set(path, (totals.get(path) ?? 0) + page.pageviews);
  }
  return [...totals.entries()]
    .map(([path, pageviews]) => ({ path, pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 10);
}
