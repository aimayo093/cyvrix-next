/**
 * Dates for the Today dashboard, all in Europe/London.
 *
 * A dashboard that buckets by UTC puts a lead received at 00:30 BST on the
 * previous day. Everything a person reads as "today" or "this day" goes
 * through here. No imports, so it can be tested without the app.
 */

export type RangeDays = 7 | 30 | 90;

const RANGES: readonly RangeDays[] = [7, 30, 90];
const TIME_ZONE = "Europe/London";
const DAY_MS = 86_400_000;

/** `?range=` as 7, 30 or 90 days. Anything else is the default, 30. */
export function parseRange(value: string | undefined): RangeDays {
  const parsed = Number(value);
  return (RANGES as readonly number[]).includes(parsed) ? (parsed as RangeDays) : 30;
}

// Built once: the queue calls this once per lead.
const LONDON_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function londonParts(date: Date) {
  const parts = LONDON_PARTS.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: Number(get("hour")) };
}

/** The London calendar date of an instant, as `YYYY-MM-DD`. */
export function londonDayKey(date: Date): string {
  const { year, month, day } = londonParts(date);
  return `${year}-${month}-${day}`;
}

/**
 * The last `range` London dates, oldest first, ending today.
 *
 * Steps whole days back from noon UTC of today's London date. Noon is at
 * least eleven hours from either midnight, so a clock change can neither
 * repeat a date nor skip one.
 */
export function londonDayKeys(range: RangeDays, now: Date): string[] {
  const todayNoon = Date.parse(`${londonDayKey(now)}T12:00:00Z`);
  return Array.from({ length: range }, (_, index) =>
    new Date(todayNoon - (range - 1 - index) * DAY_MS).toISOString().slice(0, 10)
  );
}

/** "Good morning, Paula", by London time, first name only. */
export function greeting(now: Date, name: string | null): string {
  const { hour } = londonParts(now);
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `Good ${part}, ${firstName}` : `Good ${part}.`;
}

/** How long something has been waiting, as a short label: "5h", "2d". */
export function ageLabel(from: Date, now: Date): string {
  const elapsed = now.getTime() - from.getTime();
  if (elapsed <= 0) return "today";
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(elapsed / DAY_MS)}d`;
}
