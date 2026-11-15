import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { SITE_URL } from "@/lib/structured-data";
import { legalNoticeEmail, legalNoticeNotification } from "@/lib/legal-notices-core";

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
  actorId?: string | null;
}): Promise<void> {
  const url = `${SITE_URL}${input.route}`;
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date());
  let recipients = 0;
  let emailed = 0;
  let failed = 0;
  let notified = 0;
  let error: string | null = null;

  try {
    const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, email: true, name: true } });
    recipients = users.length;

    const notification = legalNoticeNotification({ title: input.title, summary: input.summary, url });
    const created = await prisma.notification.createMany({
      data: users.map((user) => ({ id: crypto.randomUUID(), userId: user.id, title: notification.title, body: notification.body })),
    });
    notified = created.count;

    for (const user of users) {
      const email = legalNoticeEmail({ title: input.title, summary: input.summary, url, name: user.name, date });
      const result = await sendEmail({ to: user.email, subject: email.subject, text: email.text }).catch(() => null);
      if (result?.sent) emailed += 1;
      else failed += 1;
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.name : "error";
  }

  // Counts only: no addresses in the audit log.
  await prisma.auditLog
    .create({
      data: {
        id: crypto.randomUUID(),
        userId: input.actorId ?? null,
        action: "legal_change_notice_sent",
        entityType: "LegalPage",
        entityId: input.slug,
        metadata: { slug: input.slug, title: input.title, recipients, notified, emailed, failed, error },
      },
    })
    .catch(() => console.error("[legal-notices] could not record the notice outcome"));
}
