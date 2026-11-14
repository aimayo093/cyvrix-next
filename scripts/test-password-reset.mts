/**
 * Self-service password reset (DECISIONS §18). Run: npm run test:password-reset
 */
import fs from "node:fs";
import path from "node:path";
import {
  PASSWORD_MIN_LENGTH,
  RESET_REQUESTED_MESSAGE,
  RESET_TOKEN_TTL_MS,
  hashResetToken,
  isExpired,
  isPlausibleEmail,
  isWellFormedToken,
  newPasswordProblem,
  newResetToken,
  resetRequestRedirect,
  normaliseEmail,
} from "../lib/password-reset-core";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

// ── Tokens ────────────────────────────────────────────────────────────────
const a = newResetToken();
const b = newResetToken();
check("tokens are long and URL-safe", /^[A-Za-z0-9_-]{43}$/.test(a), true);
check("two tokens differ", a === b, false);
check("a fresh token is well formed", isWellFormedToken(a), true);
check("the stored hash is not the token", hashResetToken(a) === a, false);
check("hashing is stable", hashResetToken(a) === hashResetToken(a), true);
check("hash is SHA-256 hex", /^[0-9a-f]{64}$/.test(hashResetToken(a)), true);
// FIPS 180-2 test vector: a wrong digest, not just a wrong format, fails CI.
check("hash is really SHA-256", hashResetToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
check("short token refused before lookup", isWellFormedToken("abc"), false);
check("odd characters refused", isWellFormedToken(`${a.slice(0, 40)}'; drop`), false);
check("non-string refused", isWellFormedToken(undefined), false);

// ── Expiry ────────────────────────────────────────────────────────────────
check("link lasts 30 minutes", RESET_TOKEN_TTL_MS, 30 * 60_000);
const now = new Date("2026-11-15T09:00:00Z");
check("future expiry is live", isExpired(new Date(now.getTime() + 1000), now), false);
check("past expiry is dead", isExpired(new Date(now.getTime() - 1000), now), true);
check("exact expiry is dead", isExpired(now, now), true);

// ── Email ─────────────────────────────────────────────────────────────────
check("email trimmed and lower-cased", normaliseEmail("  Info@Example.CO.UK "), "info@example.co.uk");
check("non-string email is empty", normaliseEmail(42), "");
check("plausible address accepted", isPlausibleEmail("a@b.co"), true);
check("not an address refused", isPlausibleEmail("not-an-email"), false);

// ── New password ──────────────────────────────────────────────────────────
check("too short refused", newPasswordProblem("short", "short"), `Use at least ${PASSWORD_MIN_LENGTH} characters.`);
check("mismatch refused", newPasswordProblem("long enough 1", "long enough 2"), "The two passwords do not match.");
check("too long refused", newPasswordProblem("x".repeat(201), "x".repeat(201)), "Use at most 200 characters.");
check("good password accepted", newPasswordProblem("a sensible passphrase", "a sensible passphrase"), null);

// ── The same reply for every address ──────────────────────────────────────
check("reply never says whether an account exists", /no account|not found|does not exist|unknown/i.test(RESET_REQUESTED_MESSAGE), false);
// The page's outcome depends on the rate limit alone; it never sees the account.
check("not limited: the same outcome for any address", resetRequestRedirect({ limited: false }), "/forgot-password?sent=1");
check("limited: refused, still without naming the account", resetRequestRedirect({ limited: true }), "/forgot-password?limited=1");
check("the page's redirect comes only from that rule", /redirect\(resetRequestRedirect\(\{ limited \}\)\)/.test(fs.readFileSync(path.join(process.cwd(), "app/(auth)/forgot-password/page.tsx"), "utf8")), true);

// ── Structural guards on the server code ──────────────────────────────────
const server = fs.readFileSync(path.join(process.cwd(), "lib/password-reset.ts"), "utf8");
const page = fs.readFileSync(path.join(process.cwd(), "app/(auth)/forgot-password/page.tsx"), "utf8");
check("reset link uses the configured site URL", page.includes("SITE_URL") && !/headers\(\)\.get\(["']host["']\)|x-forwarded-host/i.test(page + server), true);
check("only the token hash is stored", /tokenHash: hashResetToken\(token\)/.test(server), true);
check("a reset ends every session", /changeAccountAndEndSessions\(/.test(server), true);
check("leaked passwords are refused", /breachedPasswordProblem\(/.test(server), true);
check("requests are rate limited", /enforcePublicSubmissionRateLimit\(/.test(server), true);
check("tokens are consumed", /passwordResetToken\.deleteMany\(/.test(server), true);
const resetPage = fs.readFileSync(path.join(process.cwd(), "app/(auth)/reset-password/page.tsx"), "utf8");
check("the reset page sends no referrer", /referrer: "no-referrer"/.test(resetPage), true);
check("a token is claimed atomically before the password changes", server.includes("claimed.count !== 1") && server.indexOf("claimed.count") < server.indexOf("changeAccountAndEndSessions("), true);
check("the account lookup runs after the response", /after\(\(\) =>\s*sendPasswordResetIfAccount/.test(page), true);
check("the request step does no account lookup", !server.slice(server.indexOf("export async function admitPasswordResetRequest"), server.indexOf("export async function sendPasswordResetIfAccount")).includes("prisma.user"), true);
check("both pages read the URL inside Suspense", [page, resetPage].every((src) => src.includes("React.Suspense")), true);

if (failures) {
  console.error(`\n  ${failures} password-reset check(s) failed.`);
  process.exit(1);
}
console.log("\n  All password-reset checks passed.");
