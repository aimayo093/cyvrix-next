/**
 * Proves the TOTP implementation against RFC 6238's published test vectors.
 *
 * Run with: npm run test:totp
 *
 * This exists because the implementation is hand-written rather than taken from
 * a package. A hand-written authentication control that nobody checked is worse
 * than a dependency, so it is checked against the numbers in the standard, plus
 * the behaviours the RFC does not specify but an account depends on: replay
 * rejection, drift tolerance, and rejecting malformed input.
 */
import {
  base32Decode,
  base32Encode,
  counterFor,
  generateTotpSecret,
  hotp,
  otpauthUrl,
  totpCode,
  verifyTotp,
} from "../lib/totp";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  const label = ok ? "PASS" : "FAIL";
  const detail = ok ? "" : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  console.log(`  ${label}  ${name}${detail}`);
}

console.log("\n  RFC 6238 test vectors (SHA-1, 8 digits, seed 12345678901234567890)");
// Appendix B. The RFC prints eight digits; the seed is the ASCII string below.
const rfcSecret = Buffer.from("12345678901234567890", "ascii");
const rfcVectors: Array<[number, string]> = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];
for (const [seconds, expected] of rfcVectors) {
  check(`t=${seconds}`, hotp(rfcSecret, counterFor(seconds * 1000), 8), expected);
}

console.log("\n  Base32 round trip (RFC 4648)");
check("empty", base32Encode(Buffer.from("")), "");
check('"f"', base32Encode(Buffer.from("f")), "MY");
check('"fo"', base32Encode(Buffer.from("fo")), "MZXQ");
check('"foo"', base32Encode(Buffer.from("foo")), "MZXW6");
check('"foob"', base32Encode(Buffer.from("foob")), "MZXW6YQ");
check('"fooba"', base32Encode(Buffer.from("fooba")), "MZXW6YTB");
check('"foobar"', base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
check("decode(encode(x)) === x", base32Decode(base32Encode(Buffer.from("foobar"))).toString(), "foobar");

console.log("\n  Generated secrets");
const secret = generateTotpSecret();
check("32 characters", secret.length, 32);
check("base32 alphabet only", /^[A-Z2-7]+$/.test(secret), true);
check("two secrets differ", generateTotpSecret() === generateTotpSecret(), false);

console.log("\n  Verification");
const now = 1_700_000_000_000;
const valid = totpCode(secret, now);
check("accepts the current code", verifyTotp(secret, valid, { atMs: now }).valid, true);
check("accepts a space-separated code", verifyTotp(secret, `${valid.slice(0, 3)} ${valid.slice(3)}`, { atMs: now }).valid, true);
check("rejects a wrong code", verifyTotp(secret, "000000", { atMs: now + 1 }).valid, false);
check("rejects five digits", verifyTotp(secret, "12345", { atMs: now }).valid, false);
check("rejects letters", verifyTotp(secret, "12345a", { atMs: now }).valid, false);
check("rejects empty", verifyTotp(secret, "", { atMs: now }).valid, false);

console.log("\n  Clock drift");
check("accepts one step early", verifyTotp(secret, totpCode(secret, now - 30_000), { atMs: now }).valid, true);
check("accepts one step late", verifyTotp(secret, totpCode(secret, now + 30_000), { atMs: now }).valid, true);
check("rejects two steps early", verifyTotp(secret, totpCode(secret, now - 90_000), { atMs: now }).valid, false);
check("rejects two steps late", verifyTotp(secret, totpCode(secret, now + 90_000), { atMs: now }).valid, false);

console.log("\n  Replay");
const first = verifyTotp(secret, valid, { atMs: now });
check("first use accepted", first.valid, true);
check(
  "same code refused once its counter is recorded",
  verifyTotp(secret, valid, { atMs: now, lastUsedCounter: first.valid ? first.counter : null }).valid,
  false
);
check(
  "an older code is refused too",
  verifyTotp(secret, totpCode(secret, now - 30_000), { atMs: now, lastUsedCounter: first.valid ? first.counter : null }).valid,
  false
);

console.log("\n  otpauth URL");
const url = otpauthUrl({ secret: "JBSWY3DPEHPK3PXP", account: "admin@cyvrix.co.uk", issuer: "CYVRIX" });
check("scheme and label", url.startsWith("otpauth://totp/CYVRIX%3Aadmin%40cyvrix.co.uk?"), true);
check("carries the secret", url.includes("secret=JBSWY3DPEHPK3PXP"), true);
check("declares SHA1/6/30", url.includes("algorithm=SHA1") && url.includes("digits=6") && url.includes("period=30"), true);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
