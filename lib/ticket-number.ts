/**
 * Reference numbers for support tickets.
 *
 * There were three copies of this — the portal action, the public form action
 * and the submit API — and all three were the same thing:
 *
 *     `CYV-TKT-${String(Math.floor(Date.now() / 1000)).slice(-6)}`
 *
 * `ticketNumber` is `@unique`, so two tickets raised in the same second collide
 * and the second one fails with a generic "could not create ticket". A client
 * submitting through the portal at the same moment as someone using the contact
 * form is not an unusual event. Worse, six digits of Unix seconds wraps every
 * eleven and a half days, so a collision with an *older* ticket is not a
 * probability, it is a schedule.
 *
 * Random rather than sequential, and checked against the database before use.
 */
import { randomInt } from "node:crypto";

const PREFIX = "CYV-TKT-";
const DIGITS = 6;
const MAX_ATTEMPTS = 8;

/** One candidate. Six digits keeps the format people are already reading. */
export function generateTicketNumber(): string {
  return `${PREFIX}${String(randomInt(0, 10 ** DIGITS)).padStart(DIGITS, "0")}`;
}

/**
 * A number nothing else is using.
 *
 * `isTaken` is passed in rather than importing Prisma here, so this stays
 * testable without a database — and so the caller decides which client and
 * which transaction the check runs on.
 *
 * After `MAX_ATTEMPTS` collisions the space is genuinely crowded and the answer
 * is a longer number, not another retry. Throwing says so instead of looping.
 */
export async function reserveTicketNumber(
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = generateTicketNumber();
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(
    `Could not allocate a free ticket number in ${MAX_ATTEMPTS} attempts. ` +
      `The ${DIGITS}-digit space is too crowded and needs widening.`
  );
}
