/**
 * Checks secret sealing and recovery codes.
 *
 * Run with: npm run test:mfa
 *
 * These two hold the parts of two-factor that fail quietly. A broken seal still
 * returns a string, and a recovery code that is not consumed still logs you in,
 * so neither shows up by using the feature normally.
 */
process.env.AUTH_SECRET ??= "test-secret-for-mfa-storage-checks";

import { openSecret, sealSecret } from "../lib/secret-box";
import { consumeRecoveryCode, generateRecoveryCodes, normaliseRecoveryCode } from "../lib/recovery-codes";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? (passed += 1) : (failed += 1);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

console.log("\n  Secret sealing");
const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const sealed = sealSecret(secret);
check("round trips", openSecret(sealed), secret);
check("ciphertext is not the plaintext", sealed.includes(secret), false);
check("versioned", sealed.startsWith("v1."), true);
check("two seals of the same value differ", sealSecret(secret) === sealSecret(secret), false);
check("rejects a tampered tag", openSecret(sealed.replace(/\.([^.]+)\.([^.]+)$/, ".AAAAAAAAAAAAAAAAAAAAAA.$2")), null);
check("rejects a truncated value", openSecret("v1.abc"), null);
check("rejects an unknown version", openSecret(sealed.replace(/^v1\./, "v9.")), null);

// A key derived for a different purpose must not open this.
check("wrong purpose cannot open it", openSecret(sealed, "something-else"), null);

console.log("\n  Recovery codes");
const set = generateRecoveryCodes();
check("ten codes", set.plain.length, 10);
check("ten hashes", set.hashed.length, 10);
check("codes are unique", new Set(set.plain).size, 10);
check("format is XXXXX-XXXXX", /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/.test(set.plain[0]), true);
check("no ambiguous characters", /[IO01]/.test(set.plain.join("")), false);
check("hash is not the code", set.hashed.some((h, i) => h.includes(set.plain[i])), false);

console.log("\n  Redeeming");
const first = consumeRecoveryCode(set.plain[0], set.hashed);
check("accepts a valid code", first.valid, true);
check("returns nine remaining", first.valid ? first.remaining.length : -1, 9);

const reuse = first.valid ? consumeRecoveryCode(set.plain[0], first.remaining) : { valid: true };
check("the same code cannot be used twice", reuse.valid, false);

check("accepts lower case", consumeRecoveryCode(set.plain[1].toLowerCase(), set.hashed).valid, true);
check("accepts a missing dash", consumeRecoveryCode(set.plain[1].replace("-", ""), set.hashed).valid, true);
check("accepts spaces", consumeRecoveryCode(set.plain[1].replace("-", " "), set.hashed).valid, true);
check("rejects an unknown code", consumeRecoveryCode("AAAAA-BBBBB", set.hashed).valid, false);
check("rejects the wrong length", consumeRecoveryCode("AAAAA", set.hashed).valid, false);
check("rejects empty", consumeRecoveryCode("", set.hashed).valid, false);
check("normalises consistently", normaliseRecoveryCode(" a7k2m-9pqrt "), "A7K2M9PQRT");

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
