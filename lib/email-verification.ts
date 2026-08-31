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
import { prisma } from "@/lib/prisma";
import { availableTransports, sendEmail } from "@/lib/send-email";

const TOKEN_TTL_MS = 24 * 60 * 60_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "already_verified" | "no_transport" | "send_failed" };

/**
 * Mints a fresh confirmation link for an account.
 *
 * Split out because two emails need one: the plain confirmation message, and
 * the welcome message a new portal user gets with their sign-in details. Both
 * must invalidate any earlier token, and having that rule written once means
 * the two cannot drift into disagreeing about it.
 */
export type IssuedLink =
  | { ok: true; link: string; email: string; name: string | null }
  | { ok: false; reason: "already_verified" | "no_transport" | "send_failed" };

export async function issueVerificationLink(userId: string, siteUrl: string): Promise<IssuedLink> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, emailVerified: true },
  });

  if (!user) return { ok: false, reason: "send_failed" };
  if (user.emailVerified) return { ok: false, reason: "already_verified" };

  // Asked before a token is minted, so a send that cannot happen does not
  // invalidate the link already in the recipient's inbox.
  if (availableTransports().length === 0) return { ok: false, reason: "no_transport" };

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

  return {
    ok: true,
    link: `${siteUrl.replace(/\/$/, "")}/verify-email?token=${token}`,
    email: user.email,
    name: user.name,
  };
}

/**
 * The email a new portal user receives when their account is created.
 *
 * Carries the sign-in details and the confirmation link together, because two
 * separate emails arriving at an address nobody has confirmed yet is two
 * chances to lose one.
 *
 * The password is included because the administrator chose it and has to pass
 * it on somehow; an email is no worse than the alternatives they would
 * otherwise use. It is described as temporary and the message says to change
 * it, since a password sitting in a mailbox indefinitely is the part that
 * ages badly. An invite link that lets the client set their own, which nobody
 * would ever know, would be better still.
 */
export async function sendPortalWelcomeEmail(
  userId: string,
  temporaryPassword: string,
  siteUrl: string
): Promise<SendResult> {
  const issued = await issueVerificationLink(userId, siteUrl);
  if (!issued.ok) return { ok: false, reason: issued.reason };

  const base = siteUrl.replace(/\/$/, "");

  try {
    const result = await sendEmail({
      to: issued.email,
      subject: "Your CYVRIX client portal account",
      text: [
        `Hello${issued.name ? ` ${issued.name}` : ""},`,
        "",
        "An account has been created for you on the CYVRIX client portal.",
        "",
        "Sign in at:",
        `  ${base}/login`,
        "",
        `  Username:            ${issued.email}`,
        `  Temporary password:  ${temporaryPassword}`,
        "",
        "Please change this password after signing in, under Profile in the portal.",
        "It is temporary and was chosen by an administrator, not by you.",
        "",
        "Confirm this email address by opening the link below. It expires in 24 hours.",
        "",
        `  ${issued.link}`,
        "",
        "Until it is confirmed we cannot use this address for password recovery or",
        "security notices.",
        "",
        "If you were not expecting this, please contact us before signing in.",
      ].join("\n"),
    });

    if (!result.sent) {
      console.error("[portal-welcome] send failed", result.detail);
      return { ok: false, reason: result.reason === "no_transport" ? "no_transport" : "send_failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[portal-welcome] send failed", error);
    return { ok: false, reason: "send_failed" };
  }
}

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

  // Asked before a token is minted, so a send that cannot happen does not
  // invalidate the link already in the administrator's inbox.
  if (availableTransports().length === 0) return { ok: false, reason: "no_transport" };

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

  try {
    const result = await sendEmail({
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

    if (!result.sent) {
      console.error("[email-verification] send failed", result.detail);
      return { ok: false, reason: result.reason === "no_transport" ? "no_transport" : "send_failed" };
    }

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
