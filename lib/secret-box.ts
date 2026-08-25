/**
 * Authenticated encryption for secrets held in the database.
 *
 * A TOTP secret is a password equivalent: anyone holding it can generate valid
 * codes forever. Storing it in plaintext would mean a database copy defeats the
 * second factor entirely, which is most of the reason for having one.
 *
 * AES-256-GCM, so the ciphertext is tamper-evident as well as unreadable. The
 * key is derived from AUTH_SECRET with HKDF under a distinct info label, so
 * this key and the session-signing key are different values from the same root
 * and neither can be used in place of the other.
 *
 * Rotating AUTH_SECRET invalidates every stored secret here. That is the honest
 * behaviour: without the key the data is gone, and pretending otherwise would
 * mean keeping a second copy of the key somewhere.
 */

/*
 * No `server-only` import here, deliberately.
 *
 * It would make this untestable: the guard throws under a plain node process,
 * and the parts of two-factor that fail quietly are exactly the parts that need
 * tests. The protection is not lost. This module imports `node:crypto` and
 * reads AUTH_SECRET, so a client component importing it fails the build rather
 * than shipping key derivation to a browser.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const VERSION = "v1";

function rootSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: AUTH_SECRET is required to encrypt stored secrets.");
    }
    return "development-only-change-me";
  }
  return secret;
}

/**
 * A key for one purpose.
 *
 * `info` separates uses, so a value encrypted for two-factor secrets cannot be
 * decrypted by a key derived for anything else later.
 */
function keyFor(info: string): Buffer {
  return Buffer.from(hkdfSync("sha256", rootSecret(), "cyvrix-secret-box", info, KEY_BYTES));
}

/** Encrypts a value. Output is `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function sealSecret(plaintext: string, info = "totp"): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyFor(info), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

/**
 * Decrypts a sealed value, or returns null.
 *
 * Null rather than throwing: a caller reading a secret that was encrypted under
 * a rotated key needs to handle that as "no secret", not as a crash on every
 * request.
 */
export function openSecret(sealed: string, info = "totp"): string | null {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;

  try {
    const [, iv, tag, ciphertext] = parts;
    const decipher = createDecipheriv(ALGORITHM, keyFor(info), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key, or the ciphertext was altered. Both mean unusable.
    return null;
  }
}
