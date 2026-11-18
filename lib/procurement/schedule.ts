/**
 * When the official feeds are pulled (spec section 19; 02-design §2.1).
 *
 * The hosting platform's cron runs in UTC and, as with the site's other jobs, once a day:
 * 06:00 UTC, which is 06:00 in London in winter and 07:00 in summer, both
 * before the 09:00 ChatGPT report. The gate below lets a call through only in
 * that early-morning window, so a stray or replayed call at another hour does
 * nothing. The founder can always run a source by hand ("Run now").
 */
export const LONDON_RUN_WINDOW = { fromHour: 5, toHour: 8 } as const;

export function londonHour(at: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(at));
}

export function isScheduledRun(at: Date): boolean {
  const h = londonHour(at);
  return h >= LONDON_RUN_WINDOW.fromHour && h < LONDON_RUN_WINDOW.toHour;
}
