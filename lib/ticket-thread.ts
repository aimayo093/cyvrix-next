/**
 * Reading a support ticket's conversation, and deciding who is allowed to.
 *
 * This exists because the same three questions were being answered separately
 * in the portal page, the portal reply action and the admin page — and they
 * were answering them differently:
 *
 *   - The portal listed every message on a ticket with no filter on
 *     `visibility`, so staff notes written as "Internal note" were shown to the
 *     client. The admin has a selector for exactly that distinction and defaults
 *     to internal, which made it the likely case rather than the rare one.
 *   - Ownership was checked as `ticket.clientCompanyId !== user.clientCompanyId`
 *     without requiring either to be set. Tickets raised through the public
 *     contact form have no company, and a portal user without one has no
 *     company either, so `null === null` let one read — and reply to — the
 *     other's ticket.
 *   - The portal ordered messages oldest-first and the admin newest-first, so
 *     the two views of one conversation disagreed about its direction.
 *
 * One module, one answer to each.
 */
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma";

export type ThreadViewer = {
  id: string;
  role: UserRole;
  clientCompanyId: string | null;
};

export type ThreadMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  visibility: string;
  createdAt: Date;
  fromClient: boolean;
};

/**
 * Whether this person may see this ticket at all.
 *
 * Staff may see any ticket. A client may see one only when their company and
 * the ticket's company are both set and equal — "both set" is the part that was
 * missing, and without it every company-less ticket was readable by every
 * company-less user.
 */
export function canAccessTicket(
  viewer: ThreadViewer,
  ticket: { clientCompanyId: string | null } | null
): boolean {
  if (!ticket) return false;
  if (isAdminRole(viewer.role)) return true;
  return Boolean(viewer.clientCompanyId) && ticket.clientCompanyId === viewer.clientCompanyId;
}

/** Staff see internal notes. Clients see only what was addressed to them. */
export function visibilityFilterFor(viewer: ThreadViewer) {
  return isAdminRole(viewer.role) ? {} : { visibility: "client" };
}

/**
 * The thread, oldest first, with author names resolved.
 *
 * `after` returns only what has arrived since — the shape the pollers use, so a
 * quiet conversation costs one indexed query returning nothing rather than the
 * whole history every few seconds.
 */
export async function loadTicketThread(
  ticketId: string,
  viewer: ThreadViewer,
  options: { after?: Date } = {}
): Promise<ThreadMessage[]> {
  const messages = await prisma.ticketMessage.findMany({
    where: {
      ticketId,
      ...visibilityFilterFor(viewer),
      ...(options.after ? { createdAt: { gt: options.after } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length === 0) return [];

  // One query for every author rather than one per message. The portal was
  // doing a findUnique inside a map, which on a long thread is a query per
  // message against a pool capped at three connections.
  const authorIds = [...new Set(messages.map((m) => m.authorId).filter((id): id is string => Boolean(id)))];
  const authors = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, role: true },
      })
    : [];
  const authorById = new Map(authors.map((a) => [a.id, a]));

  return messages.map((message) => {
    const author = message.authorId ? authorById.get(message.authorId) : undefined;
    // A message with no author is one staff wrote through the admin, which does
    // not record an author id. It is support either way.
    const fromClient = author?.role === "CLIENT";

    let authorName: string;
    if (message.authorId && message.authorId === viewer.id) {
      authorName = "You";
    } else if (!author) {
      authorName = "CYVRIX Support";
    } else if (fromClient) {
      authorName = author.name || "Client User";
    } else {
      authorName = `CYVRIX Analyst (${author.name || "Operations Desk"})`;
    }

    return {
      id: message.id,
      authorId: message.authorId,
      authorName,
      body: message.body,
      visibility: message.visibility,
      createdAt: message.createdAt,
      fromClient,
    };
  });
}
