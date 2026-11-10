/**
 * Pure parts of the leaked-password check, kept apart so they can be tested
 * without the network. See `lib/breached-passwords.ts`.
 */
import { createHash } from "node:crypto";

/** SHA-1 of the password, upper-case hex, split into the 5-character prefix sent and the suffix kept. */
export function passwordHashParts(password: string): { prefix: string; suffix: string } {
  const digest = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  return { prefix: digest.slice(0, 5), suffix: digest.slice(5) };
}

/**
 * How many times the suffix appears in a Pwned Passwords range response.
 *
 * Each line is `SUFFIX:COUNT`. Padding lines (sent because we ask for them, so
 * the response size says nothing about the prefix) have a count of 0 and are
 * therefore ignored by returning 0 for them like any absent suffix.
 */
export function breachCountFromRange(body: string, suffix: string): number {
  const wanted = suffix.toUpperCase();
  for (const line of body.split(/\r?\n/)) {
    const [candidate, count] = line.trim().split(":");
    if (candidate?.toUpperCase() === wanted) {
      const parsed = Number.parseInt(count ?? "", 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
  }
  return 0;
}

export const BREACHED_PASSWORD_MESSAGE =
  "That password has appeared in a known data breach, so attackers already try it. Choose a different one.";
