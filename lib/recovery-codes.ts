/**
 * Single-use recovery codes for administrators who lose their authenticator.
 *
 * Without these, enabling two-factor on the only administrator account is a
 * lock-out waiting to happen: there is no self-service password reset in this
 * application, so a lost phone would mean a lost site.
 *
 * Codes are hashed, never stored in a form that could be read back. They are
 * shown once at enrolment and cannot be recovered afterwards, only regenerated.
 *
 * scrypt is used for consistency with `lib/password.ts`. A recovery code has
 * far more entropy than a chosen password, so the work factor matters less
 * here, but there is no reason to hold two standards in one codebase.
 */

/*
 * No `server-only` import here, deliberately.
 *
 * It would make this untestable: the guard throws under a plain node process,
 * and the parts of two-factor that fail quietly are exactly the parts that need
 * tests. The protection is not lost: this module imports `node:crypto`, so a
 * client component importing it fails the build rather than shipping code
 * that hashes credentials to a browser.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Excludes I, O, 0 and 1, which people transcribe wrongly from a printout. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_COUNT = 10;
const GROUP_LENGTH = 5;
const GROUPS = 2;

/** One code, formatted as two readable groups: "A7K2M-9PQRT". */
function generateCode(): string {
  const groups: string[] = [];
  for (let group = 0; group < GROUPS; group += 1) {
    let out = "";
    // rejection-free: 32 symbols divides 256 evenly, so no modulo bias.
    for (const byte of randomBytes(GROUP_LENGTH)) out += ALPHABET[byte % ALPHABET.length];
    groups.push(out);
  }
  return groups.join("-");
}

export function hashRecoveryCode(code: string): string {
  const normalised = normaliseRecoveryCode(code);
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(normalised, salt, 64).toString("hex")}`;
}

/** Accepts what a person actually types: lower case, spaces, missing dash. */
export function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function matches(code: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(normaliseRecoveryCode(code), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export type RecoveryCodeSet = {
  /** Shown to the administrator once, then unrecoverable. */
  plain: string[];
  /** Stored. */
  hashed: string[];
};

export function generateRecoveryCodes(count = CODE_COUNT): RecoveryCodeSet {
  const plain = Array.from({ length: count }, generateCode);
  return { plain, hashed: plain.map(hashRecoveryCode) };
}

export type RecoveryCodeCheck =
  | { valid: true; remaining: string[] }
  | { valid: false; remaining: null };

/**
 * Checks a submitted code and consumes it.
 *
 * Returns the remaining hashes so the caller writes back a set with this code
 * removed. A recovery code that still worked after being used would be a
 * password that never expires, which is the opposite of the point.
 *
 * Every stored hash is compared even after a match, so the time taken does not
 * reveal the position of the matching code.
 */
export function consumeRecoveryCode(submitted: string, storedHashes: string[]): RecoveryCodeCheck {
  if (normaliseRecoveryCode(submitted).length !== GROUP_LENGTH * GROUPS) {
    return { valid: false, remaining: null };
  }

  let matchedIndex = -1;
  storedHashes.forEach((stored, index) => {
    if (matches(submitted, stored) && matchedIndex === -1) matchedIndex = index;
  });

  if (matchedIndex === -1) return { valid: false, remaining: null };

  return { valid: true, remaining: storedHashes.filter((_, index) => index !== matchedIndex) };
}
