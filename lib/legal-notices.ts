import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { SITE_URL } from "@/lib/structured-data";
import { safeMailError } from "@/lib/email-history-core";
import {
  LEGAL_NOTICE_SEND_TIMEOUT_MS,
  legalNoticeDate,
  legalNoticeEmail,
  legalNoticeNotification,
} from "@/lib/legal-notices-core";

/**
 * Tells every active account holder that a public legal document changed
 * (DECISIONS §19): a notification in their account, and an email to each,
 * sent one at a time so no address is ever shown to another recipient.
 *
 * Run after the response (next/server's after()), so publishing never waits on
 * the mail server. Never throws: the outcome is in the audit log.
 */
export async function notifyLegalChange(input: {
  slug: string;
  title: string;
  route: string;
  summary: string;
  /** legalVersionHash of the text visitors now see. */
  versionHash: string;
  /** When the new version was saved: the date the email says it applies from. */
  effectiveAt: Date;
  actorId?: string | null;
}): Promise<void> {
  const url = `${SITE_URL}${input.route}`;
  const date = legalNoticeDate(input.effectiveAt);
  const audit = (action: string, metadata: Record<string, unknown>) =>
    prisma.auditLog
      .create({
        data: {
          id: crypto.randomUUID(),
          userId: input.actorId ?? null,
          action,
          entityType: "LegalPage",
          entityId: input.slug,
          // Counts and reasons only: never an address.
          metadata: { slug: input.slug, title: input.title, version: input.versionHash.slice(0, 16), ...metadata },
        },
      })
      .catch(() => console.error("[legal-notices] could not write the audit entry", action));

  const users = await prisma.user
    .findMany({ where: { active: true }, select: { id: true, email: true, name: true } })
    .catch(() => null);
  if (!users) {
    // Nothing is claimed yet, so saving the same text again retries.
    await audit("legal_change_notice_failed", { error: "could not list account holders" });
    return;
  }

  // One version is announced once. Two saves of the same text at the same
  // moment both reach here; only the one that moves the stored hash proceeds.
  // A database error is not a duplicate: it is logged, and nothing is claimed.
  let claimed: boolean;
  try {
    claimed = await claimVersion(input.slug, input.versionHash);
  } catch (cause) {
    await audit("legal_change_notice_failed", { error: `could not record the version: ${safeMailError(cause)}` });
    return;
  }
  if (!claimed) return;
  // Written before any send: if the platform ends this run part-way, the log
  // still shows a notice was started and for how many people.
  await audit("legal_change_notice_started", { recipients: users.length });

  // The two channels are independent: a failed notification insert must not
  // stop the emails, nor the other way round.
  let notified = 0;
  let notifyError: string | null = null;
  try {
    const notification = legalNoticeNotification({ title: input.title, summary: input.summary, url });
    const created = await prisma.notification.createMany({
      data: users.map((user) => ({ id: crypto.randomUUID(), userId: user.id, title: notification.title, body: notification.body })),
    });
    notified = created.count;
  } catch (cause) {
    notifyError = safeMailError(cause);
  }

  let emailed = 0;
  let failed = 0;
  const reasons = new Set<string>();
  const secrets = [process.env.SMTP_PASSWORD, process.env.MAIL_PASSWORD, process.env.RESEND_API_KEY];
  for (const user of users) {
    const email = legalNoticeEmail({ title: input.title, summary: input.summary, url, name: user.name, date });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<{ sent: false; detail: string }>((resolve) => {
      timer = setTimeout(() => resolve({ sent: false, detail: "timed out" }), LEGAL_NOTICE_SEND_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([sendEmail({ to: user.email, subject: email.subject, text: email.text }), timeout]);
      if (result.sent) emailed += 1;
      else {
        failed += 1;
        if (reasons.size < 5) reasons.add(safeMailError(result.detail, secrets).slice(0, 160));
      }
    } catch (cause) {
      failed += 1;
      if (reasons.size < 5) reasons.add(safeMailError(cause, secrets).slice(0, 160));
    } finally {
      clearTimeout(timer);
    }
  }

  await audit("legal_change_notice_sent", {
    recipients: users.length,
    notified,
    notifyError,
    emailed,
    failed,
    failureReasons: [...reasons],
  });
}

/** Atomically records the announced version; false if it was already announced. */
async function claimVersion(slug: string, versionHash: string): Promise<boolean> {
  const key = `legalNotice:${slug}`;
  await prisma.$executeRaw`
    INSERT INTO "public"."SiteSetting" ("key", "value", "updatedAt")
    VALUES (${key}, '{}'::jsonb, now())
    ON CONFLICT ("key") DO NOTHING`;
  const claimed = await prisma.$executeRaw`
    UPDATE "public"."SiteSetting"
       SET "value" = jsonb_build_object('hash', ${versionHash}::text), "updatedAt" = now()
     WHERE "key" = ${key}
       AND ("value" ->> 'hash') IS DISTINCT FROM ${versionHash}::text`;
  return claimed === 1;
}
