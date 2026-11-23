/**
 * The procurement off switch (docs/procurement/04-delivery.md §4). Setting
 * PROCUREMENT_ENABLED to "false" (or "0" / "off") and redeploying hides the
 * admin pages, refuses the server actions and uploads, makes the procurement
 * agent API answer 404 and stops the daily feed run. Unset, it stays on, so
 * adding the switch changes nothing until the founder uses it.
 * Pure, so it is tested without a database.
 */
export function procurementEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const raw = (env.PROCUREMENT_ENABLED ?? "").trim().toLowerCase();
  return !["false", "0", "off"].includes(raw);
}
