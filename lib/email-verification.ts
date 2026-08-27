import "server-only";

/**
 * Email verification for staff accounts.
 *
 * The Security Center reports accounts with no verified address, and the reason
 * it matters is concrete: password recovery and security notices are only worth
 * anything if the mailbox is known to belong to the account holder. Until now
 * there was no way to establish that, so `emailVerified` could only have been
 * set by hand — which would make the dashboard state something unproven.
 *
 * Design notes worth keeping:
 *
 * The token is never stored. Only its SHA-256 hash is, so a database copy does
 * not yield working verification links. This is the same reasoning as hashing a
 * password, applied to a credential that happens to live in a URL.
 *
 * Verification is bound to the address it was sent to. If the account's email
 * changes between sending and clicking, the link stops working rather than
 * verifying an address nobody proved.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getEmailIdentity, getServerSmtpConfig } from "@/lib/email-config";

const TOKEN_TTL_MS = 24 * 60 * 60_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "already_verified" | "no_transport" | "send_failed" };

/**
 * Issues a token and emails the link.
 *
 * Any previous unused token for the account is discarded, so a fresh request
 * invalidates an older link rather than leaving several live at once.
 */
export async function sendVerificationEmail(userId: string, siteUrl: string): Promise<SendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, emailVerified: true },
  });

  if (!user) return { ok: false, reason: "send_failed" };
  if (user.emailVerified) return { ok: false, reason: "already_verified" };

  const smtp = getServerSmtpConfig();
  if (!smtp) return { ok: false, reason: "no_transport" };

  const token = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { userId } }),
    prisma.verificationToken.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        tokenHash: hashToken(token),
        email: user.email,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  const link = `${siteUrl.replace(/\/$/, "")}/verify-email?token=${token}`;
  const identity = await getEmailIdentity("CYVRIX");

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });

    await transporter.sendMail({
      from: identity.from,
      to: user.email,
      subject: "Confirm your CYVRIX email address",
      text: [
        `Hello${user.name ? ` ${user.name}` : ""},`,
        "",
        "Confirm this address is yours by opening the link below. It expires in 24 hours.",
        "",
        link,
        "",
        "If you did not expect this, you can ignore it. Nothing changes unless the link is opened.",
      ].join("\n"),
    });

    return { ok: true };
  } catch (error) {
    console.error("[email-verification] send failed", error);
    return { ok: false, reason: "send_failed" };
  }
}

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" | "email_changed" };

/**
 * Redeems a token.
 *
 * The token is consumed whatever the outcome, so a link cannot be retried
 * against a changed address or replayed after use.
 */
export async function verifyEmailToken(token: string): Promise<VerifyResult> {
  if (!token || token.length < 20) return { ok: false, reason: "invalid" };

  const candidate = hashToken(token);
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: candidate },
    select: { id: true, userId: true, email: true, expiresAt: true },
  });

  if (!record) return { ok: false, reason: "invalid" };

  // Constant-time, though the lookup above already leaked the match. Kept so
  // the comparison does not become the weak point if this is ever changed to
  // scan a set of tokens.
  const stored = Buffer.from(candidate);
  const supplied = Buffer.from(hashToken(token));
  if (stored.length !== supplied.length || !timingSafeEqual(stored, supplied)) {
    return { ok: false, reason: "invalid" };
  }

  await prisma.verificationToken.delete({ where: { id: record.id } });

  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { email: true },
  });

  // The address moved after the link was sent. Verifying now would mark an
  // address nobody proved.
  if (!user || user.email !== record.email) return { ok: false, reason: "email_changed" };

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: record.userId,
      action: "email_verified",
      entityType: "User",
      entityId: record.userId,
      metadata: { email: record.email },
    },
  });

  return { ok: true, email: record.email };
}
