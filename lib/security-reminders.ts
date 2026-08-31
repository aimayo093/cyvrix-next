import "server-only";

/**
 * The daily nudge to accounts that have not finished securing themselves.
 *
 * The Security Center reports how many accounts have no confirmed address and
 * no second factor, but a number on a dashboard nobody opens does not change
 * anyone's behaviour. This asks the people who can actually fix it.
 *
 * Two rules keep it from becoming noise, which is the failure mode that gets
 * a reminder filtered and then ignored:
 *
 *   - at most one message per account per week, whatever it is short of;
 *   - nothing at all once the account is verified and enrolled.
 *
 * The interval is enforced from the audit log rather than a column, so it
 * survives a restart and leaves a record of what was sent to whom.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail, availableTransports } from "@/lib/send-email";
import { issueVerificationLink } from "@/lib/email-verification";
import { SITE_URL } from "@/lib/structured-data";

const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60_000;
const ACTION = "security_reminder_sent";

export type ReminderRun = {
  considered: number;
  sent: number;
  skippedRecentlyReminded: number;
  failed: number;
};

export async function sendSecurityReminders(): Promise<ReminderRun> {
  const run: ReminderRun = { considered: 0, sent: 0, skippedRecentlyReminded: 0, failed: 0 };

  if (availableTransports().length === 0) return run;

  const outstanding = await prisma.user.findMany({
    where: {
      active: true,
      OR: [{ emailVerified: null }, { twoFactorReady: false }],
    },
    select: { id: true, email: true, name: true, role: true, emailVerified: true, twoFactorReady: true },
  });

  run.considered = outstanding.length;
  const since = new Date(Date.now() - REMINDER_INTERVAL_MS);
  const base = SITE_URL.replace(/\/$/, "");

  for (const user of outstanding) {
    const recent = await prisma.auditLog.findFirst({
      where: { action: ACTION, entityId: user.id, createdAt: { gte: since } },
      select: { id: true },
    });
    if (recent) {
      run.skippedRecentlyReminded += 1;
      continue;
    }

    const isStaff = user.role !== "CLIENT";
    const lines: string[] = [`Hello${user.name ? ` ${user.name}` : ""},`, ""];

    // A confirmation link is only useful if it is a working one, so it is
    // minted fresh here rather than pointing at an older token that may have
    // expired since it was issued.
    if (!user.emailVerified) {
      const issued = await issueVerificationLink(user.id, SITE_URL);
      if (issued.ok) {
        lines.push(
          "Your email address has not been confirmed yet. Until it is, we cannot use it",
          "for password recovery or to tell you about anything affecting your account.",
          "",
          "Confirm it here (the link expires in 24 hours):",
          `  ${issued.link}`,
          ""
        );
      }
    }

    if (!user.twoFactorReady) {
      lines.push(
        "Your account does not have two-factor authentication. Without it, your password",
        "is the only thing protecting it.",
        "",
        "Set it up here, it takes about a minute with an authenticator app:",
        `  ${base}${isStaff ? "/admin/profile" : "/portal/profile-and-company"}`,
        ""
      );
    }

    // Both were resolved between the query and here, or the link could not be
    // minted. Nothing worth sending.
    if (lines.length <= 2) continue;

    lines.push("If you have already done this, you can ignore this message.");

    const result = await sendEmail({
      to: user.email,
      subject: "Finish securing your CYVRIX account",
      text: lines.join("\n"),
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: result.sent ? ACTION : "security_reminder_failed",
        entityType: "User",
        entityId: user.id,
        metadata: {
          unverified: !user.emailVerified,
          noTwoFactor: !user.twoFactorReady,
          reason: result.sent ? null : result.reason,
        },
      },
    });

    if (result.sent) run.sent += 1;
    else run.failed += 1;
  }

  return run;
}
