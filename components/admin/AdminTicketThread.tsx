"use client";

/**
 * The analyst's side of a ticket conversation.
 *
 * The admin queue rendered its thread on the server and never looked again, so
 * a client could reply and the analyst would see nothing until they reloaded
 * the page — which, since selecting a ticket is a link, meant clicking away and
 * back. This polls the same endpoint the portal does.
 *
 * Internal notes are shown here and nowhere else. The colour is not decoration:
 * it is the difference between a private remark and something the client has
 * already read, and it should be obvious at a glance before someone types the
 * next one.
 */
import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addTicketNote } from "@/lib/admin-actions";
import { useTicketThread, type PolledMessage } from "@/components/shared/useTicketThread";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 bg-[#041635] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors hover:bg-[#2691F0] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending..." : "Add"}
    </button>
  );
}

export function AdminTicketThread({
  ticketId,
  initialMessages,
  initialCursor,
}: {
  ticketId: string;
  initialMessages: PolledMessage[];
  initialCursor: string;
}) {
  const [state, formAction] = useFormState(addTicketNote, null);
  const { messages, refresh } = useTicketThread(ticketId, initialMessages, initialCursor);
  const formRef = React.useRef<HTMLFormElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!state?.success) return;
    formRef.current?.reset();
    void refresh();
  }, [state, refresh]);

  React.useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
        Thread ({messages.length} {messages.length === 1 ? "message" : "messages"})
      </p>

      <div ref={scrollRef} className="space-y-2 max-h-40 overflow-y-auto mb-3">
        {messages.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
            No correspondence yet.
          </p>
        ) : (
          messages.map((message) => {
            const internal = message.visibility === "internal";
            return (
              <div
                key={message.id}
                className={`rounded-lg px-3 py-2 text-xs ${
                  internal ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {internal ? "Internal note" : message.fromClient ? message.authorName : "Reply to client"}
                </p>
                <p className="whitespace-pre-wrap text-slate-700">{message.body}</p>
              </div>
            );
          })
        )}
      </div>

      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="ticketId" value={ticketId} />
        <label className="sr-only" htmlFor={`note-body-${ticketId}`}>
          Internal note or reply
        </label>
        <textarea
          id={`note-body-${ticketId}`}
          name="body"
          required
          rows={2}
          placeholder="Internal note or reply..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none"
        />
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`note-visibility-${ticketId}`}>
            Who can see this
          </label>
          <select
            id={`note-visibility-${ticketId}`}
            name="visibility"
            className="text-xs font-bold rounded-lg border border-slate-200 px-2 py-1.5 text-[#041635] bg-white focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          >
            <option value="internal">Internal note</option>
            <option value="client">Reply to client</option>
          </select>
          <AddButton />
        </div>
        {state && !state.success && (
          <p className="text-[11px] font-bold text-rose-600">{state.message}</p>
        )}
      </form>
    </div>
  );
}
