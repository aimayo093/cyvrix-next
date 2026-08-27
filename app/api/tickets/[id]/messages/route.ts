/**
 * The ticket conversation, for whoever is entitled to see it.
 *
 * Both the client portal and the admin queue poll this while a thread is open.
 * Neither had any way to learn that the other had replied — both pages were
 * server-rendered snapshots, so a conversation only moved when someone
 * refreshed. Polling is the mechanism rather than Supabase Realtime or a
 * websocket, deliberately:
 *
 *   - Realtime would mean exposing `ticket_messages` to an anon key, and this
 *     database has no row-level security. Every client would be able to read
 *     every ticket. That is a much larger change than the problem warrants.
 *   - A websocket needs a process that stays up; the site is on serverless
 *     functions.
 *
 * A `since` cursor keeps the cost of an idle conversation to one indexed query
 * returning an empty array.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTicket, loadTicketThread } from "@/lib/ticket-thread";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, status: true, clientCompanyId: true, updatedAt: true },
  });

  // The same 404 whether the ticket is absent or simply not this person's, so
  // the response cannot be used to discover which ticket identifiers exist.
  if (!canAccessTicket(session.user, ticket)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sinceParam = new URL(request.url).searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : undefined;
  const after = since && !Number.isNaN(since.getTime()) ? since : undefined;

  const messages = await loadTicketThread(id, session.user, { after });

  return NextResponse.json(
    {
      status: ticket!.status,
      messages: messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
      // The client advances its cursor to this rather than to its own clock,
      // so a difference between browser and server time cannot make it skip a
      // message or ask for the same one forever.
      cursor: (messages.at(-1)?.createdAt ?? after ?? ticket!.updatedAt).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
