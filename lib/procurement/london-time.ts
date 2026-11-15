/**
 * A London wall-clock time from a datetime-local field ("YYYY-MM-DDTHH:MM"),
 * converted to the instant it names. Pure, so it is tested without a browser.
 *
 * Refuses what would otherwise be stored wrongly:
 *   - impossible dates (31 February), which JavaScript silently rolls over;
 *   - the hour that does not exist when the clocks go forward (01:00–01:59 on
 *     the last Sunday of March);
 *   - the hour that happens twice when the clocks go back (01:00–01:59 on the
 *     last Sunday of October), where the deadline would be ambiguous.
 */
export type LondonTime = { ok: true; date: Date } | { ok: false; reason: string };

const FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function londonWallTime(instant: Date): string {
  const parts = FORMAT.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function londonWallTimeToUtc(local: string): LondonTime {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return { ok: false, reason: "Enter the date and time as shown by the date picker." };
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  // Procurement deadlines are current or future dates. A fixed range also keeps
  // clear of Date.UTC treating years 0–99 as 1900–1999.
  if (year < 2000 || year > 2100) return { ok: false, reason: "Enter a year between 2000 and 2100." };
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    naive.getUTCFullYear() !== year ||
    naive.getUTCMonth() !== month - 1 ||
    naive.getUTCDate() !== day ||
    naive.getUTCHours() !== hour ||
    naive.getUTCMinutes() !== minute
  ) {
    return { ok: false, reason: "That date does not exist." };
  }

  // London is UTC+0 (GMT) or UTC+1 (BST); try both and keep the ones that read back.
  const matches = [0, 1]
    .map((offsetHours) => new Date(naive.getTime() - offsetHours * 3_600_000))
    .filter((candidate) => londonWallTime(candidate) === local);
  if (matches.length === 0) return { ok: false, reason: "That time does not exist in London: the clocks go forward then. Use 02:00 or later." };
  if (matches.length > 1) return { ok: false, reason: "That time happens twice in London: the clocks go back then. Use 02:00 or later." };
  return { ok: true, date: matches[0] };
}
