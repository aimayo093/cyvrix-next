import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { changeAccountAndEndSessions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { breachedPasswordProblem } from "@/lib/breached-passwords";
import { enforcePublicSubmissionRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/send-email";
import {
  RESET_TOKEN_TTL_MS,
  hashResetToken,
  isExpired,
  isPlausibleEmail,
  isWellFormedToken,
  newPasswordProblem,
  newResetToken,
  normaliseEmail,
} from "@/lib/password-reset-core";

/**
 * Self-service password reset (DECISIONS §18).
 *
 * - The same reply whether or not an account exists, so the form cannot be
 *   used to discover customers.
 * - Only a token's hash is stored; a link works once, for 30 minutes, and only
 *   while the account's email is still the one it was sent to.
 * - A reset ends every session on every device, and a notice goes to the
 *   account's address. Staff still need their authenticator code afterwards:
 *   the mailbox alone never opens an administrator account.
 */

/**
 * Step one, inside the request: counts the attempt against the rate limits.
 * Throws RateLimitError when the address or network has asked too often.
 * Returns the normalised address, or "" if it is not one.
 *
 * It does no account lookup, so the response takes the same time whether or
 * not an account exists; the lookup and email happen afterwards
 * (sendPasswordResetIfAccount, run with next/server's after()).
 */
export async function admitPasswordResetRequest(rawEmail: unknown, headers: Headers): Promise<string> {
  const email = normaliseEmail(rawEmail);
  if (!isPlausibleEmail(email)) return "";
  // Per network and per address, so neither can be used to flood a mailbox.
  await enforcePublicSubmissionRateLimit("password-reset", email, headers, { ipLimit: 10, emailLimit: 3 });
  return email;
}

/**
 * Step two, after the response: sends a reset link if the address belongs to
 * an active account. Never reports which.
 */
export async function sendPasswordResetIfAccount(email: string, siteUrl: string): Promise<void> {
  if (!email) return;
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, active: true },
    select: { id: true, email: true, name: true },
  });
  if (!user) return;

  // Expired links, anyone's, are cleared on every request, so the table never
  // keeps hashes and addresses past their 30 minutes for long.
  await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);

  const token = newResetToken();
  const tokenId = crypto.randomUUID();
  await prisma.passwordResetToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      tokenHash: hashResetToken(token),
      email: user.email,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const link = `${siteUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  const result = await sendEmail({
    to: user.email,
    subject: "Reset your CYVRIX password",
    text: [
      `Hello${user.name ? ` ${user.name}` : ""},`,
      "",
      "Someone asked to reset the password for your CYVRIX account. To choose a new one, open this link. It works once and expires in 30 minutes.",
      "",
      link,
      "",
      "If this was not you, ignore this email: your password stays as it is.",
      "",
      "CYVRIX",
    ].join("\n"),
  }).catch((error: unknown) => ({ sent: false as const, reason: "send_failed" as const, detail: error instanceof Error ? error.name : "error" }));

  // Only a link that was actually sent replaces the earlier ones. If sending
  // failed, the new token goes and any earlier link still works.
  if (result.sent) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, id: { not: tokenId } } });
  } else {
    await prisma.passwordResetToken.deleteMany({ where: { id: tokenId } }).catch(() => undefined);
  }

  await prisma.auditLog
    .create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        action: result.sent ? "password_reset_requested" : "password_reset_email_failed",
        entityType: "User",
        entityId: user.id,
        metadata: {},
      },
    })
    .catch(() => undefined);
}

export type TokenCheck = { ok: true } | { ok: false; reason: "invalid" | "expired" };

/** Whether a link is still usable, without consuming it: for showing the form. */
export async function checkResetToken(token: unknown): Promise<TokenCheck> {
  if (!isWellFormedToken(token)) return { ok: false, reason: "invalid" };
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { expiresAt: true, email: true, user: { select: { email: true, active: true } } },
  });
  if (!record) return { ok: false, reason: "invalid" };
  if (isExpired(record.expiresAt)) return { ok: false, reason: "expired" };
  // The same account checks completion applies, so nobody types a new
  // password into a form that was always going to refuse it.
  if (!record.user.active || record.user.email.toLowerCase() !== record.email.toLowerCase()) return { ok: false, reason: "invalid" };
  return { ok: true };
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "password"; message: string };

/**
 * Sets the new password. The token is consumed on any final outcome, but a
 * password the rules refuse leaves it usable so the person can try again.
 */
export async function completePasswordReset(token: unknown, password: unknown, confirm: unknown): Promise<ResetResult> {
  const invalid = { ok: false as const, reason: "invalid" as const, message: "This reset link is not valid. Ask for a new one." };
  if (!isWellFormedToken(token)) return invalid;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, email: true, expiresAt: true, tokenHash: true },
  });
  if (!record) return invalid;
  if (isExpired(record.expiresAt)) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
    return { ok: false, reason: "expired", message: "This reset link has expired. Ask for a new one." };
  }

  const problem = newPasswordProblem(password, confirm) ?? (await breachedPasswordProblem(String(password)));
  if (problem) return { ok: false, reason: "password", message: problem };

  // Claimed atomically: of two submissions racing with the same link, only
  // the one whose delete removes the row may go on to set a password.
  // Expiry is enforced here too: the breach lookup above can take seconds,
  // and a link must not be redeemed after its 30 minutes.
  const claimed = await prisma.passwordResetToken.deleteMany({ where: { id: record.id, tokenHash: record.tokenHash, expiresAt: { gt: new Date() } } });
  if (claimed.count !== 1) return invalid;
  // Any other outstanding link for the account goes too.
  await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });

  const user = await prisma.user.findUnique({ where: { id: record.userId }, select: { email: true, active: true, emailVerified: true } });
  // The address changed since the link was sent, or the account was closed.
  if (!user || !user.active || user.email.toLowerCase() !== record.email.toLowerCase()) return invalid;

  // The new password, the end of every session and (since opening the link
  // proved the mailbox) the address's verification land in one transaction.
  await changeAccountAndEndSessions(record.userId, {
    passwordHash: hashPassword(String(password)),
    ...(user.emailVerified ? {} : { emailVerified: new Date() }),
  });

  await prisma.auditLog
    .create({
      data: { id: crypto.randomUUID(), userId: record.userId, action: "password_reset_completed", entityType: "User", entityId: record.userId, metadata: {} },
    })
    .catch(() => undefined);

  // A notice, so someone whose mailbox was used without them knows at once.
  // A failed notice is recorded in the audit log rather than lost silently.
  const notice = await sendEmail({
    to: user.email,
    subject: "Your CYVRIX password was changed",
    text: [
      "The password for your CYVRIX account was just changed using a reset link, and every device was signed out.",
      "",
      "If this was you, there is nothing more to do.",
      "If it was not, contact us straight away at support@cyvrix.co.uk and secure your email account, since the link was sent there.",
      "",
      "CYVRIX",
    ].join("\n"),
  }).catch(() => ({ sent: false as const }));
  if (!notice.sent) {
    await prisma.auditLog
      .create({
        data: { id: crypto.randomUUID(), userId: record.userId, action: "password_reset_notice_failed", entityType: "User", entityId: record.userId, metadata: {} },
      })
      .catch(() => undefined);
  }

  return { ok: true };
}
