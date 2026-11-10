/**
 * The "Needs you" queue on the Today dashboard: which tickets and leads are
 * waiting on staff, and in what order.
 *
 * Overdue uses only dates staff set — a ticket's `slaDueAt`, a lead's
 * `followUpDate`. There is no invented reply-time target. Rules are in
 * docs/superpowers/specs/2026-11-09-admin-today-dashboard-design.md §2.3.
 */
import { londonDayKey } from "./time";

export type QueueTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  company: string | null;
  status: string;
  slaDueAt: Date | null;
  createdAt: Date;
};

export type QueueLead = {
  id: string;
  name: string | null;
  company: string | null;
  source: string | null;
  status: string;
  followUpDate: Date | null;
  createdAt: Date;
};

export type QueueKind = "overdue" | "ticket" | "follow_up" | "enquiry";

export type QueueItem = {
  key: string;
  kind: QueueKind;
  title: string;
  detail: string;
  href: string;
  since: Date;
};

/** How many rows the dashboard shows. Counts elsewhere are not capped. */
export const QUEUE_LIMIT = 8;

/** Ticket statuses a person on staff still has to act on. */
export const STAFF_TICKET_STATUSES = ["NEW", "OPEN", "ESCALATED"] as const;
/** Statuses that are overdue once past `slaDueAt`, including work in hand. */
export const OVERDUE_TICKET_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "ESCALATED"] as const;
export const CLOSED_LEAD_STATUSES = ["WON", "LOST", "ARCHIVED"] as const;

function isOverdue(ticket: Pick<QueueTicket, "status" | "slaDueAt">, now: Date) {
  return (
    ticket.slaDueAt !== null &&
    ticket.slaDueAt.getTime() < now.getTime() &&
    (OVERDUE_TICKET_STATUSES as readonly string[]).includes(ticket.status)
  );
}

/** True when a ticket belongs in the queue: overdue, or new/open/escalated. */
export function ticketNeedsStaff(ticket: Pick<QueueTicket, "status" | "slaDueAt">, now: Date): boolean {
  return isOverdue(ticket, now) || (STAFF_TICKET_STATUSES as readonly string[]).includes(ticket.status);
}

const KIND_ORDER: Record<QueueKind, number> = { overdue: 0, follow_up: 1, ticket: 2, enquiry: 2 };

/** Every item waiting on staff, overdue first, then follow-ups, then oldest first. Not capped. */
export function buildQueue(tickets: QueueTicket[], leads: QueueLead[], now: Date): QueueItem[] {
  const items: QueueItem[] = [];
  const todayKey = londonDayKey(now);

  for (const ticket of tickets) {
    if (!ticketNeedsStaff(ticket, now)) continue;
    const overdue = isOverdue(ticket, now);
    items.push({
      key: `ticket:${ticket.id}`,
      kind: overdue ? "overdue" : "ticket",
      title: ticket.subject,
      detail: [ticket.ticketNumber, ticket.company].filter(Boolean).join(" · "),
      href: `/admin/ticket-management?filter=all&view=${ticket.id}`,
      since: overdue && ticket.slaDueAt ? ticket.slaDueAt : ticket.createdAt,
    });
  }

  for (const lead of leads) {
    const open = !(CLOSED_LEAD_STATUSES as readonly string[]).includes(lead.status);
    const followUpDue = open && lead.followUpDate !== null && londonDayKey(lead.followUpDate) <= todayKey;
    if (!followUpDue && lead.status !== "NEW") continue;
    items.push({
      key: `lead:${lead.id}`,
      kind: followUpDue ? "follow_up" : "enquiry",
      title: lead.name?.trim() || "Unnamed enquiry",
      detail: [lead.company, lead.source?.replace(/_/g, " ")].filter(Boolean).join(" · "),
      href: `/admin/leads-crm?view=${lead.id}`,
      since: followUpDue && lead.followUpDate ? lead.followUpDate : lead.createdAt,
    });
  }

  return items.sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.since.getTime() - b.since.getTime()
  );
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** One plain sentence describing the queue, for the top of the page. */
export function summarySentence(items: QueueItem[], now: Date): string {
  if (items.length === 0) return "Nothing is waiting on you.";

  const parts: string[] = [];
  const enquiries = items.filter((item) => item.kind === "enquiry");
  if (enquiries.length > 0) {
    const oldest = Math.min(...enquiries.map((item) => item.since.getTime()));
    const days = Math.floor((now.getTime() - oldest) / 86_400_000);
    const age = days >= 1 ? `, oldest ${days} ${plural(days, "day", "days")}` : "";
    parts.push(`${enquiries.length} ${plural(enquiries.length, "enquiry", "enquiries")} waiting${age}`);
  }

  const overdue = items.filter((item) => item.kind === "overdue").length;
  if (overdue > 0) {
    parts.push(`${overdue} ${plural(overdue, "ticket past its", "tickets past their")} due date`);
  }

  const followUps = items.filter((item) => item.kind === "follow_up").length;
  if (followUps > 0) parts.push(`${followUps} ${plural(followUps, "follow-up", "follow-ups")} due`);

  const tickets = items.filter((item) => item.kind === "ticket").length;
  if (tickets > 0) parts.push(`${tickets} ${plural(tickets, "ticket", "tickets")} to pick up`);

  return `${parts.join(". ")}.`;
}
