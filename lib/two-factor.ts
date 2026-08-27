import "server-only";

/**
 * Two-factor enrolment and verification against an account.
 *
 * The pieces below it are tested on their own: `lib/totp.ts` against the RFC
 * 6238 vectors, `lib/secret-box.ts` and `lib/recovery-codes.ts` against the
 * behaviours that fail quietly. This layer is the wiring: what is stored, when
 * a flag becomes true, and what a failed attempt costs.
 *
 * The rule that matters: `twoFactorReady` is set by confirming a live code and
 * by nothing else. Setting it by hand would make the Security Center report a
 * control that does not exist, which is the problem the rest of this codebase
 * spends its time avoiding.
 */
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { openSecret, sealSecret } from "@/lib/secret-box";
import { consumeRecoveryCode, generateRecoveryCodes } from "@/lib/recovery-codes";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const ISSUER = "CYVRIX";

export type EnrolmentOffer = {
  /** Base32, shown so an authenticator can be set up by hand. */
  secret: string;
  otpauthUrl: string;
  /** Inline SVG, so no image host is involved and the secret never leaves the page. */
  qrSvg: string;
};

/**
 * Starts enrolment: generates a secret, stores it sealed, and returns what the
 * screen needs.
 *
 * The secret is stored immediately but `twoFactorEnrolledAt` stays null, so an
 * abandoned enrolment leaves an unusable secret rather than a half-armed
 * account. Starting again overwrites it.
 */
export async function beginEnrolment(userId: string, account: string): Promise<EnrolmentOffer> {
  const secret = generateTotpSecret();
  const url = otpauthUrl({ secret, account, issuer: ISSUER });

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: sealSecret(secret),
      twoFactorEnrolledAt: null,
      twoFactorReady: false,
      twoFactorLastCounter: null,
    },
  });

  return {
    secret,
    otpauthUrl: url,
    qrSvg: await QRCode.toString(url, { type: "svg", margin: 1, width: 200 }),
  };
}

export type ConfirmResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; reason: "no_pending_enrolment" | "bad_code" | "rate_limited" };

/**
 * Completes enrolment by proving the authenticator works.
 *
 * Recovery codes are generated here and returned once. They are stored hashed,
 * so this is the only moment they can be read.
 */
export async function confirmEnrolment(userId: string, submittedCode: string): Promise<ConfirmResult> {
  try {
    enforceRateLimit(`2fa:enrol:${userId}`, { limit: 10, windowMs: 15 * 60_000 });
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, reason: "rate_limited" };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnrolledAt: true },
  });

  if (!user?.twoFactorSecret || user.twoFactorEnrolledAt) {
    return { ok: false, reason: "no_pending_enrolment" };
  }

  const secret = openSecret(user.twoFactorSecret);
  if (!secret) return { ok: false, reason: "no_pending_enrolment" };

  const result = verifyTotp(secret, submittedCode, { atMs: Date.now() });
  if (!result.valid) return { ok: false, reason: "bad_code" };

  const codes = generateRecoveryCodes();

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnrolledAt: new Date(),
      twoFactorReady: true,
      twoFactorRecoveryCodes: codes.hashed,
      twoFactorLastCounter: BigInt(result.counter),
    },
  });

  return { ok: true, recoveryCodes: codes.plain };
}

export type ChallengeResult =
  | { ok: true; usedRecoveryCode: boolean; recoveryCodesRemaining: number }
  | { ok: false; reason: "not_enrolled" | "bad_code" | "rate_limited" };

/**
 * Verifies a code at sign-in, accepting either a TOTP code or a recovery code.
 *
 * A TOTP code advances the stored counter so the same six digits cannot be
 * replayed inside their step. A recovery code is removed from the stored set,
 * because a recovery code that still worked afterwards would be a password that
 * never expires.
 */
export async function verifyChallenge(userId: string, submitted: string): Promise<ChallengeResult> {
  try {
    enforceRateLimit(`2fa:challenge:${userId}`, { limit: 10, windowMs: 15 * 60_000 });
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, reason: "rate_limited" };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      twoFactorEnrolledAt: true,
      twoFactorRecoveryCodes: true,
      twoFactorLastCounter: true,
    },
  });

  if (!user?.twoFactorSecret || !user.twoFactorEnrolledAt) return { ok: false, reason: "not_enrolled" };

  const secret = openSecret(user.twoFactorSecret);
  if (!secret) return { ok: false, reason: "not_enrolled" };

  const totp = verifyTotp(secret, submitted, {
    atMs: Date.now(),
    lastUsedCounter: user.twoFactorLastCounter === null ? null : Number(user.twoFactorLastCounter),
  });

  if (totp.valid) {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorLastCounter: BigInt(totp.counter) },
    });
    const remaining = Array.isArray(user.twoFactorRecoveryCodes) ? user.twoFactorRecoveryCodes.length : 0;
    return { ok: true, usedRecoveryCode: false, recoveryCodesRemaining: remaining };
  }

  const stored = Array.isArray(user.twoFactorRecoveryCodes)
    ? (user.twoFactorRecoveryCodes as string[])
    : [];
  const recovery = consumeRecoveryCode(submitted, stored);

  if (!recovery.valid) return { ok: false, reason: "bad_code" };

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorRecoveryCodes: recovery.remaining },
  });

  return { ok: true, usedRecoveryCode: true, recoveryCodesRemaining: recovery.remaining.length };
}

/** Turns two-factor off, clearing everything rather than leaving a stale secret. */
export async function disableTwoFactor(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnrolledAt: null,
      twoFactorReady: false,
      twoFactorRecoveryCodes: undefined,
      twoFactorLastCounter: null,
    },
  });
}

/** Issues a fresh set, invalidating the old one. */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorRecoveryCodes: codes.hashed },
  });
  return codes.plain;
}

export type TwoFactorState = {
  enrolled: boolean;
  enrolledAt: Date | null;
  /** Null when not enrolled. Low numbers are worth warning about. */
  recoveryCodesRemaining: number | null;
  /** A secret exists but was never confirmed with a live code. */
  pending: boolean;
};

export async function getTwoFactorState(userId: string): Promise<TwoFactorState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnrolledAt: true, twoFactorRecoveryCodes: true },
  });

  const enrolled = Boolean(user?.twoFactorEnrolledAt);
  return {
    enrolled,
    enrolledAt: user?.twoFactorEnrolledAt ?? null,
    pending: Boolean(user?.twoFactorSecret) && !enrolled,
    recoveryCodesRemaining: enrolled
      ? Array.isArray(user?.twoFactorRecoveryCodes)
        ? user.twoFactorRecoveryCodes.length
        : 0
      : null,
  };
}

const RECOVERY_FLASH_COOKIE = "cyvrix_recovery_flash";

/**
 * Hands freshly issued recovery codes to the next render, once.
 *
 * Not the URL. A query string lands in browser history, in the Referer header
 * of anything the page then loads, and in server access logs, so ten working
 * credentials would be written to several places that outlive the tab. This
 * cookie is httpOnly, lives sixty seconds, and is deleted as it is read.
 */
export async function flashRecoveryCodes(codes: string[]) {
  const cookieStore = await cookies();
  cookieStore.set(RECOVERY_FLASH_COOKIE, codes.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60,
    path: "/admin",
  });
}

/** Reads and clears the codes. Returns null when there are none to show. */
export async function takeRecoveryCodes(): Promise<string[] | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RECOVERY_FLASH_COOKIE)?.value;
  if (!raw) return null;

  cookieStore.delete({ name: RECOVERY_FLASH_COOKIE, path: "/admin" });
  const codes = raw.split(",").filter(Boolean);
  return codes.length > 0 ? codes : null;
}
