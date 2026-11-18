/**
 * Pure rules used by feed ingestion (lib/procurement/ingest.ts), kept apart so
 * they are tested without a database.
 */

/**
 * Two published values can describe the same tender on two portals: either is
 * missing, or they are within 25% of each other. A bigger gap means two
 * different tenders that happen to share a title.
 */
export function valuesAgree(a: number | null, b: number | null): boolean {
  if (a === null || b === null || a === 0 || b === 0) return true;
  return Math.abs(a - b) / Math.max(a, b) <= 0.25;
}
