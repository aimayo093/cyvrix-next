/**
 * Time-based one-time passwords, RFC 6238.
 *
 * Implemented on node's crypto rather than pulled from a package. TOTP is
 * HMAC-SHA1 over a counter and about forty lines; adding a dependency to the
 * one control standing between a password and an administrator account means
 * trusting a supply chain for something the standard specifies exactly. The
 * RFC publishes test vectors, so this can be proved correct instead of assumed:
 * see `scripts/test-totp.mts`.
 *
 * Compatible with Google Authenticator, Microsoft Authenticator, 1Password and
 * Authy: SHA-1, six digits, thirty-second step, which is what those apps expect
 * when the otpauth URL omits the parameters.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Authenticator apps expect SHA-1 here; it is the default every app assumes. */
const ALGORITHM = "sha1";
const DIGITS = 6;
const STEP_SECONDS = 30;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32, no padding, which is what otpauth URLs carry. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw new Error("Secret is not valid base32.");

    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * A new shared secret.
 *
 * Twenty bytes, the SHA-1 block size the RFC recommends, which encodes to the
 * thirty-two character string authenticator apps display.
 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The code for a given counter value. Exposed for the RFC test vectors. */
export function hotp(secret: Buffer, counter: number, digits = DIGITS, algorithm = ALGORITHM): string {
  const counterBuffer = Buffer.alloc(8);
  // Counter is 64-bit big-endian. Written as two 32-bit halves because a
  // JavaScript number cannot hold the full range precisely.
  counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac(algorithm, secret).update(counterBuffer).digest();

  // Dynamic truncation, RFC 4226 section 5.3.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** The counter for a moment in time. */
export function counterFor(atMs: number, stepSeconds = STEP_SECONDS): number {
  return Math.floor(atMs / 1000 / stepSeconds);
}

/** The code an authenticator app is showing right now. */
export function totpCode(secretBase32: string, atMs: number): string {
  return hotp(base32Decode(secretBase32), counterFor(atMs));
}

export type TotpVerification =
  | { valid: true; counter: number }
  | { valid: false; counter: null };

/**
 * Checks a submitted code.
 *
 * `window` allows adjacent steps so a clock a few seconds out still works; one
 * step either side is the usual choice, giving a ninety second acceptance band.
 *
 * Returns the matched counter so the caller can reject a replay. A code stays
 * valid for its whole step, and without recording the counter the same six
 * digits could be used twice — which matters most where it is easiest to
 * capture, over someone's shoulder.
 *
 * Comparison is constant-time. The timing signal is small but free to remove.
 */
export function verifyTotp(
  secretBase32: string,
  submitted: string,
  options: { atMs: number; window?: number; lastUsedCounter?: number | null } = { atMs: Date.now() }
): TotpVerification {
  const code = submitted.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { valid: false, counter: null };

  const window = options.window ?? 1;
  const secret = base32Decode(secretBase32);
  const current = counterFor(options.atMs);

  for (let drift = -window; drift <= window; drift += 1) {
    const counter = current + drift;
    if (counter < 0) continue;

    const expected = Buffer.from(hotp(secret, counter));
    const actual = Buffer.from(code);
    if (expected.length !== actual.length) continue;
    if (!timingSafeEqual(expected, actual)) continue;

    // Replay: this counter, or an earlier one, has already been accepted.
    if (options.lastUsedCounter != null && counter <= options.lastUsedCounter) {
      return { valid: false, counter: null };
    }

    return { valid: true, counter };
  }

  return { valid: false, counter: null };
}

/**
 * The otpauth URL an authenticator app scans.
 *
 * The label carries the issuer as well as the account so the app shows which
 * site a code belongs to when someone has several.
 */
export function otpauthUrl(options: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${options.issuer}:${options.account}`);
  const params = new URLSearchParams({
    secret: options.secret,
    issuer: options.issuer,
    algorithm: ALGORITHM.toUpperCase(),
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Seconds until the current code is replaced, for the enrolment screen. */
export function secondsRemaining(atMs: number, stepSeconds = STEP_SECONDS): number {
  return stepSeconds - Math.floor(atMs / 1000) % stepSeconds;
}
