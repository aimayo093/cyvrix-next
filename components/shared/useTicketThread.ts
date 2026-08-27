"use client";

/**
 * Keeps a ticket conversation current without the reader refreshing.
 *
 * Both sides of a ticket were server-rendered snapshots, so a client and an
 * analyst could reply to each other for ten minutes and neither would see a
 * word until they reloaded the page. This polls `/api/tickets/[id]/messages`
 * with a cursor, so an idle thread costs one query that returns nothing.
 *
 * It also polls on demand, which is how a message a person has just sent
 * appears. The portal previously tried to add it optimistically and could not:
 * it read the text out of the form *after* resetting the form, so the value was
 * always empty and nothing was appended. Fetching the real message instead of
 * fabricating one also means the identifier and timestamp are the server's.
 */
import * as React from "react";

export type PolledMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  visibility: string;
  createdAt: string;
  fromClient: boolean;
};

/** Quiet enough not to be noticed, quick enough to feel like a conversation. */
const POLL_INTERVAL_MS = 4000;

export function useTicketThread(ticketId: string, initialMessages: PolledMessage[], initialCursor: string) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [status, setStatus] = React.useState<string | null>(null);
  const cursorRef = React.useRef(initialCursor);

  const poll = React.useCallback(async () => {
    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/messages?since=${encodeURIComponent(cursorRef.current)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return;

      const data = (await response.json()) as {
        status: string;
        messages: PolledMessage[];
        cursor: string;
      };
      cursorRef.current = data.cursor;
      setStatus(data.status);

      if (data.messages.length === 0) return;
      setMessages((previous) => {
        // The cursor should make duplicates impossible, but two messages
        // written in the same millisecond would both sit on the boundary of a
        // `createdAt > cursor` comparison. Cheaper to be certain here than to
        // explain a doubled message later.
        const seen = new Set(previous.map((message) => message.id));
        const arrived = data.messages.filter((message) => !seen.has(message.id));
        return arrived.length === 0 ? previous : [...previous, ...arrived];
      });
    } catch {
      // A failed poll is a network blip. The next one is four seconds away, and
      // an error banner over a working conversation is worse than a short wait.
    }
  }, [ticketId]);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Chained timeouts rather than setInterval: a slow response should delay
    // the next request, not stack requests behind it.
    const schedule = () => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        if (document.visibilityState === "visible") await poll();
        if (!cancelled) schedule();
      }, POLL_INTERVAL_MS);
    };

    // A tab left open in the background stops asking, and catches up the moment
    // someone looks at it again.
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };

    document.addEventListener("visibilitychange", onVisible);
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  return { messages, status, refresh: poll };
}
