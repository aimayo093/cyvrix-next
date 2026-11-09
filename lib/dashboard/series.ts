/**
 * Per-day series for the Today dashboard's trends.
 *
 * The database returns only the days that had something. A chart needs every
 * day, so missing days are filled with 0 here — a real zero, because the query
 * ran and found nothing, unlike a failed query, which never reaches this code.
 */

export type DayCount = { day: string; count: number };

/** One entry per key, in key order. Rows for days outside the keys are ignored. */
export function fillDailySeries(rows: { day: string; count: number | bigint }[], keys: string[]): DayCount[] {
  const byDay = new Map(rows.map((row) => [row.day, Number(row.count)]));
  return keys.map((day) => ({ day, count: byDay.get(day) ?? 0 }));
}

export function seriesTotal(series: DayCount[]): number {
  return series.reduce((sum, point) => sum + point.count, 0);
}

const round = (value: number) => Number(value.toFixed(1));

/**
 * SVG `points` for a line across `width` x `height`, highest value at the top.
 * A series with no variation (all zero, or one value) draws a flat line at
 * mid-height rather than dividing by zero.
 */
export function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = max === min;

  if (values.length === 1) {
    const y = round(height / 2);
    return `0,${y} ${round(width)},${y}`;
  }

  const step = width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = round(index * step);
      const y = flat ? round(height / 2) : round(height - ((value - min) / (max - min)) * height);
      return `${x},${y}`;
    })
    .join(" ");
}
