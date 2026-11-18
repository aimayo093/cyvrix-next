/**
 * Pure rules used by feed ingestion (lib/procurement/ingest.ts), kept apart so
 * they are tested without a database.
 */

/**
 * Two published values can describe the same tender on two portals: either is
 * missing (null; a published zero is a value), or they are within 25% of each
 * other. A bigger gap means two different tenders that happen to share a title.
 */
export function valuesAgree(a: number | null, b: number | null): boolean {
  if (a === null || b === null || a === b) return true;
  return Math.abs(a - b) / Math.max(a, b) <= 0.25;
}

/** Both bounds must agree: equal maxima do not excuse conflicting minima. */
export function rangesAgree(
  a: { valueMin: number | null; valueMax: number | null },
  b: { valueMin: number | null; valueMax: number | null }
): boolean {
  return valuesAgree(a.valueMin, b.valueMin) && valuesAgree(a.valueMax, b.valueMax);
}
