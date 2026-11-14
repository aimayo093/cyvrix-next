/**
 * Pure rules for self-service password reset (DECISIONS §18), so
 * `npm run test:password-reset` can cover them.
 *
 * No `server-only`: it is imported by tests. It imports `node:crypto`, so a
 * client component importing it fails the build anyway.
 */
import { createHash, randomBytes } from "node:crypto";

/** A reset link works for 30 minutes, once. */
export const RESET_TOKEN_TTL_MS = 30 * 60_000;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

/**
 * The one reply to every request, whether or not an account exists, so the
 * form cannot be used to find out who is a customer.
 */
export const RESET_REQUESTED_MESSAGE =
  "If an account exists for that address, we have sent a link to reset its password. It works once and expires in 30 minutes. Check your junk folder if it does not arrive.";

/** 32 random bytes, URL-safe: about 256 bits, far beyond guessing. */
export function newResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this is stored, so a database copy yields no working links. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A token has the shape newResetToken() makes; anything else is refused before a lookup. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(token);
}

export function normaliseEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** A problem with the new password before the leaked-password check, or null. */
export function newPasswordProblem(password: unknown, confirm: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}

export function isExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/**
 * Where /forgot-password goes after a request. It depends on the rate limit
 * alone: the action never knows whether an account exists, because the lookup
 * runs after the response.
 */
export function resetRequestRedirect(outcome: { limited: boolean }): "/forgot-password?sent=1" | "/forgot-password?limited=1" {
  return outcome.limited ? "/forgot-password?limited=1" : "/forgot-password?sent=1";
}
