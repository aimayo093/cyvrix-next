import "server-only";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { openSecret } from "@/lib/secret-box";
import { verifyTotp } from "@/lib/totp";

export type StepUpResult = { ok: true; at: Date } | { ok: false; reason: string };

/**
 * A fresh authenticator code for one founder decision (02-design §5).
 *
 * TOTP only. A recovery code is for getting back into an account, and spending
 * one on an approval would quietly use up the way back in. The counter is
 * advanced, so the same six digits cannot approve twice, and attempts share the
 * sign-in limit's shape (10 per 15 minutes) under their own key.
 */
export async function verifyStepUp(userId: string, submitted: string): Promise<StepUpResult> {
  try {
    await enforceRateLimit(`2fa:step-up:${userId}`, { limit: 10, windowMs: 15 * 60_000 });
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, reason: "Too many attempts. Wait a few minutes and try again." };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnrolledAt: true, twoFactorLastCounter: true },
  });
  if (!user?.twoFactorSecret || !user.twoFactorEnrolledAt) {
    return { ok: false, reason: "Approvals need two-factor sign-in. Set it up on your Profile page first." };
  }
  const secret = openSecret(user.twoFactorSecret);
  if (!secret) return { ok: false, reason: "Your two-factor set-up could not be read. Set it up again on your Profile page." };

  const now = Date.now();
  const result = verifyTotp(secret, submitted, {
    atMs: now,
    lastUsedCounter: user.twoFactorLastCounter === null ? null : Number(user.twoFactorLastCounter),
  });
  if (!result.valid) return { ok: false, reason: "That code was not accepted. Enter the current code from your authenticator app." };

  // Compare-and-set, so two decisions racing with the same code cannot both pass.
  const advanced = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ twoFactorLastCounter: null }, { twoFactorLastCounter: { lt: BigInt(result.counter) } }],
    },
    data: { twoFactorLastCounter: BigInt(result.counter) },
  });
  if (advanced.count !== 1) return { ok: false, reason: "That code has already been used. Wait for the next one." };
  return { ok: true, at: new Date(now) };
}
