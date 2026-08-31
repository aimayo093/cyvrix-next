import "server-only";

/**
 * Email when a ticket thread moves.
 *
 * The thread already updates live in the browser once a page is open. Nobody
 * sits on the page waiting, though, so a client who asked a question in the
 * morning had no way of learning it was answered short of going back to look,
 * and staff learned about a client reply the next time somebody opened the
 * queue.
 *
 * One rule matters more than the rest here: an internal note must never reach
 * a client. Staff notes default to "Internal note" in the admin composer, and
 * a notification that ignored visibility would email the client the very
 * thing the visibility flag exists to keep from them. Every send below is
 * gated on it.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { SITE_URL } from "@/lib/structured-data";

type Direction = "to_client" | "to_staff";

/** Trimmed so the email previews the reply without reproducing the thread. */
function excerpt(body: string, limit = 400): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}...` : flat;
}

/**
 * Notifies the other side of a ticket that a message was added.
 *
 * Never throws. A ticket reply that succeeded must not be reported as failed
 * because a mail server was briefly unreachable - the message is saved either
 * way, and the thread is the record. Failures are logged and recorded.
 */
export async function notifyTicketMessage(options: {
  ticketId: string;
  direction: Direction;
  visibility: string;
  body: string;
}): Promise<void> {
  try {
    // The gate. An internal note is not client correspondence.
    if (options.direction === "to_client" && options.visibility !== "client") return;

    const ticket = await prisma.ticket.findUnique({
      where: { id: options.ticketId },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        email: true,
        clientCompanyId: true,
      },
    });
    if (!ticket) return;

    const base = SITE_URL.replace(/\/$/, "");
    let recipients: string[] = [];
    let subject = "";
    let intro = "";
    let link = "";

    if (options.direction === "to_client") {
      // Portal users on the company, falling back to the address the ticket
      // was raised from for a ticket with no portal account behind it.
      const portalUsers = ticket.clientCompanyId
        ? await prisma.user.findMany({
            where: { clientCompanyId: ticket.clientCompanyId, role: "CLIENT", active: true },
            select: { email: true },
          })
        : [];
      recipients = portalUsers.length > 0 ? portalUsers.map((u) => u.email) : ticket.email ? [ticket.email] : [];
      subject = `Re: [${ticket.ticketNumber}] ${ticket.subject}`;
      intro = "CYVRIX has replied to your support ticket.";
      link = `${base}/portal/support-tickets?id=${ticket.id}`;
    } else {
      // Staff who can act on it. Read from the database rather than a
      // configured address so a new administrator is included automatically.
      const staff = await prisma.user.findMany({
        where: { active: true, role: { not: "CLIENT" } },
        select: { email: true },
      });
      recipients = staff.map((u) => u.email);
      subject = `Client reply: [${ticket.ticketNumber}] ${ticket.subject}`;
      intro = "A client has replied to a support ticket.";
      link = `${base}/admin/ticket-management?id=${ticket.id}`;
    }

    if (recipients.length === 0) return;

    const result = await sendEmail({
      to: recipients,
      subject,
      text: [
        intro,
        "",
        `Ticket:  ${ticket.ticketNumber}`,
        `Subject: ${ticket.subject}`,
        "",
        excerpt(options.body),
        "",
        "Read the full thread and reply here:",
        `  ${link}`,
        "",
        "Replying to this email does not reach the ticket.",
      ].join("\n"),
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: result.sent ? "ticket_notification_sent" : "ticket_notification_failed",
        entityType: "Ticket",
        entityId: ticket.id,
        metadata: {
          direction: options.direction,
          recipients: recipients.length,
          reason: result.sent ? null : result.reason,
        },
      },
    });
  } catch (error) {
    // Swallowed on purpose. See the note above the function.
    console.error("[ticket-notifications] failed", error);
  }
}
