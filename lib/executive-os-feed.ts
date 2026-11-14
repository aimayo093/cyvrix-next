import "server-only";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import { encodeCursor, type FeedCursor, type Position } from "@/lib/executive-os-feed-core";

export { feedAuthorised, feedToken, parseCursor } from "@/lib/executive-os-feed-core";

/**
 * A read-only feed of new website enquiries for CYVRIX's Executive OS (the
 * company's own operations app, repository aimayo093/AI-CEO).
 *
 * Why a pull feed rather than a push: the Executive OS runs on the company's
 * own computer, not on the internet, so the website cannot reach it. It asks
 * this route instead, every few minutes, with a shared secret.
 *
 * What it gives out, and nothing more:
 *   - leads (contact form, consultation bookings, assessment and quote requests)
 *   - support tickets, and the client-visible messages on them
 *   - privacy rights requests, so the statutory clock is seen in both places
 *   - the addresses that unsubscribed, so outreach never contacts them
 * No staff accounts, internal notes, staff-only ticket messages, sessions or
 * settings. It never writes.
 *
 * Off unless EXECUTIVE_OS_FEED_TOKEN is set to a value of at least 32
 * characters. The route answers 404 while it is off, so its existence is not
 * advertised.
 */

export const FEED_VERSION = 1;
const PAGE = 100;
const MAX_UNSUBSCRIBED = 5000;

/** Strictly after the last item seen: later time, or the same time and a later id. */
const after = (p?: Position) =>
  p ? { OR: [{ createdAt: { gt: new Date(p.at) } }, { createdAt: new Date(p.at), id: { gt: p.id } }] } : {};
const order = [{ createdAt: "asc" as const }, { id: "asc" as const }];
const text = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : v == null ? undefined : String(v).slice(0, max));

/** Lead payload fields that are the visitor's own answers. Anything else stays on the website. */
const LEAD_FIELDS = [
  "message", "serviceInterest", "service", "businessType", "urgency", "preferredContactMethod", "preferredTime",
  "assessmentType", "assessmentName", "organisationSize", "assessmentScope", "planningHorizon",
  "phone", "companySize", "industry", "challenge", "budget", "appliedRole", "consentLoggedAt",
] as const;

export async function buildFeed(cursor: FeedCursor) {
  const [leads, tickets, messages, privacy, unsubscribed] = await Promise.all([
    prisma.lead.findMany({ where: after(cursor.lead), orderBy: order, take: PAGE }),
    prisma.ticket.findMany({ where: after(cursor.ticket), orderBy: order, take: PAGE }),
    prisma.ticketMessage.findMany({
      where: { ...after(cursor.message), visibility: "client" },
      orderBy: order,
      take: PAGE,
      include: { Ticket: { select: { ticketNumber: true, subject: true, email: true, name: true } } },
    }),
    prisma.auditLog.findMany({ where: { ...after(cursor.privacy), action: "privacy.rights_request_received" }, orderBy: order, take: PAGE }),
    prisma.newsletterSubscriber.findMany({ where: { status: "unsubscribed" }, select: { email: true }, take: MAX_UNSUBSCRIBED }),
  ]);

  // Whether a ticket message was written by staff or by the client.
  const authorIds = [...new Set(messages.map((m) => m.authorId).filter((x): x is string => !!x))];
  const authors = authorIds.length ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, role: true } }) : [];
  const staff = new Set(authors.filter((a) => ADMIN_ROLES.includes(a.role)).map((a) => a.id));

  const items = [
    ...leads.map((l) => {
      const p = (l.payload && typeof l.payload === "object" ? l.payload : {}) as Record<string, unknown>;
      const answers = Object.fromEntries(LEAD_FIELDS.filter((k) => p[k] != null && p[k] !== "").map((k) => [k, text(p[k])]));
      return { type: "lead" as const, id: l.id, createdAt: l.createdAt.toISOString(), source: l.source ?? "website", status: l.status, name: l.name, email: l.email, company: l.company, answers };
    }),
    ...tickets.map((t) => ({
      type: "ticket" as const,
      id: t.id,
      createdAt: t.createdAt.toISOString(),
      ticketNumber: t.ticketNumber,
      name: t.name,
      email: t.email,
      company: t.company,
      priority: t.priority,
      category: t.category,
      subject: text(t.subject, 300),
      description: text(t.description),
      existingClient: t.existingClient,
      status: t.status,
      slaDueAt: t.slaDueAt?.toISOString() ?? null,
    })),
    ...messages.map((m) => ({
      type: "ticket_message" as const,
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      ticketId: m.ticketId,
      ticketNumber: m.Ticket.ticketNumber,
      ticketSubject: text(m.Ticket.subject, 300),
      fromStaff: m.authorId ? staff.has(m.authorId) : false,
      name: m.Ticket.name,
      email: m.Ticket.email,
      body: text(m.body),
    })),
    ...privacy.map((a) => {
      const md = (a.metadata && typeof a.metadata === "object" ? a.metadata : {}) as Record<string, unknown>;
      return {
        type: "privacy_request" as const,
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        reference: text(md.reference, 100),
        requestType: text(md.requestType, 100),
        requestTypeLabel: text(md.requestTypeLabel, 200),
        name: text(md.fullName, 300),
        email: text(md.email, 320),
        details: text(md.details, 4000),
        statutoryDeadline: text(md.statutoryDeadline, 40),
      };
    }),
  ];

  const last = <T extends { createdAt: Date; id: string }>(rows: T[], prev?: Position) =>
    rows.length ? { at: rows[rows.length - 1].createdAt.toISOString(), id: rows[rows.length - 1].id } : prev;
  const next: FeedCursor = {
    lead: last(leads, cursor.lead),
    ticket: last(tickets, cursor.ticket),
    message: last(messages, cursor.message),
    privacy: last(privacy, cursor.privacy),
  };
  return {
    version: FEED_VERSION,
    generatedAt: new Date().toISOString(),
    items,
    unsubscribed: unsubscribed.map((u) => u.email.toLowerCase()),
    cursor: encodeCursor(next),
    more: [leads, tickets, messages, privacy].some((rows) => rows.length === PAGE),
  };
}
