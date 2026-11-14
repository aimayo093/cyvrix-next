import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { connection } from "next/server";
import * as React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminEmail } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { ADMIN_PAGE_SIZE, AdminPager, parsePage } from "@/components/admin/AdminPager";
import { getEmailMessage, inboxSyncStatus, listEmailMessages, syncInbox, type InboxSyncResult } from "@/lib/email-history";
import { EMAIL_RETENTION_MONTHS } from "@/lib/email-history-core";
import { Mail, AlertCircle, CheckCircle2, Send, Inbox, ArrowLeft, Paperclip, RefreshCw } from "lucide-react";
import { redirect, unstable_rethrow } from "next/navigation";

export const metadata = { title: "Email Broadcasts" };

type Tab = "compose" | "sent" | "inbox";

export default function EmailBroadcastPage(props: React.ComponentProps<typeof EmailBroadcastPageContent>) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <EmailBroadcastPageContent {...props} />
    </React.Suspense>
  );
}

const ukDateTime = (value: Date) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(value);

/** The page waits for a sync at most this long; a slow mail server never holds it up. */
const PAGE_SYNC_WAIT_MS = 8_000;

async function syncWithin(ms: number): Promise<InboxSyncResult | { state: "slow" }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<{ state: "slow" }>((resolve) => {
    timer = setTimeout(() => resolve({ state: "slow" }), ms);
  });
  try {
    return await Promise.race([syncInbox(), slow]);
  } finally {
    clearTimeout(timer);
  }
}

async function EmailBroadcastPageContent({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    draft?: string;
    tab?: string;
    view?: string;
    page?: string;
  }>;
}) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = sp.tab === "sent" || sp.tab === "inbox" ? sp.tab : "compose";
  const page = parsePage(sp.page);

  // An approved AI email draft, opened from /admin/ai-drafts. Sending is still
  // this page's button: approving a draft never sends anything by itself.
  const draft =
    tab === "compose" && sp.draft && /^[0-9a-f-]{36}$/i.test(sp.draft)
      ? await prisma.agentDraft
          .findFirst({ where: { id: sp.draft, kind: "email", status: "APPROVED" }, select: { id: true, title: true, body: true, sourceAgent: true } })
          .catch(() => null)
      : null;

  async function handleSendEmail(formData: FormData) {
    "use server";
    // redirect() works by throwing, so it must not run inside the try: the
    // catch used to swallow the success redirect and report "NEXT_REDIRECT"
    // as an error after the email had been sent.
    let failed = false;
    try {
      await sendAdminEmail(formData);
    } catch (err) {
      // Validation refusals redirect from inside the action; let them through.
      unstable_rethrow(err);
      console.error("[admin-email] Send failed.", { message: err instanceof Error ? err.message : "Unknown error" });
      failed = true;
    }
    redirect(
      failed
        ? `/admin/email?tab=sent&status=error&message=${encodeURIComponent("Sending could not be confirmed; it may or may not have gone out, so check before sending again. The attempt and the server's reason are in the Sent list.")}`
        : `/admin/email?tab=sent&status=success&message=${encodeURIComponent("Email sent successfully.")}`
    );
  }

  async function handleSyncNow() {
    "use server";
    await requireAdmin();
    const result = await syncInbox({ force: true });
    const note =
      result.state === "ok"
        ? `Inbox checked: ${result.stored} new message${result.stored === 1 ? "" : "s"}.`
        : result.state === "not_configured"
          ? "No mailbox is configured for the Inbox."
          : result.state === "error"
            ? `Could not read the mailbox: ${result.error}`
            : "Inbox checked.";
    redirect(`/admin/email?tab=inbox&status=${result.state === "error" || result.state === "not_configured" ? "error" : "success"}&message=${encodeURIComponent(note)}`);
  }

  const viewing = sp.view && /^[0-9a-f-]{36}$/i.test(sp.view) ? await getEmailMessage(sp.view).catch(() => null) : null;
  const sync = tab === "inbox" && !viewing ? await syncWithin(PAGE_SYNC_WAIT_MS).catch(() => null) : null;
  const status = tab === "inbox" ? await inboxSyncStatus().catch(() => null) : null;
  const list = tab !== "compose" && !viewing ? await listEmailMessages(tab === "sent" ? "outbound" : "inbound", page, ADMIN_PAGE_SIZE).catch(() => null) : null;

  const tabLink = (target: Tab, label: string, Icon: typeof Mail) => (
    <Link
      href={`/admin/email?tab=${target}`}
      aria-current={tab === target ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
        tab === target ? "bg-[#041635] text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" /> {label}
    </Link>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {sp.status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          sp.status === "success"
            ? "bg-emerald-50 border-emerald-250 text-emerald-800"
            : "bg-rose-50 border-rose-250 text-rose-800"
        }`}>
          {sp.status === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-outfit font-black text-sm uppercase tracking-wide">
              {sp.status === "success" ? "Done" : "Problem"}
            </h4>
            <p className="text-xs font-semibold mt-0.5 leading-relaxed">{sp.message}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]">Email</h1>
        <p className="text-slate-500 text-sm mt-1">
          Send from the platform, and see what was sent and received. History is kept for {EMAIL_RETENTION_MONTHS} months.
        </p>
      </div>

      <nav aria-label="Email" className="flex flex-wrap gap-2">
        {tabLink("compose", "Compose", Mail)}
        {tabLink("sent", "Sent", Send)}
        {tabLink("inbox", "Inbox", Inbox)}
      </nav>

      {viewing ? (
        <MessageView data={viewing} backHref={`/admin/email?tab=${viewing.message.direction === "inbound" ? "inbox" : "sent"}`} />
      ) : tab === "compose" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Mail className="h-4 w-4 text-[#2691F0]" />
            <h2 className="font-outfit font-black text-[#041635]">Compose Email</h2>
          </div>
          <form action={handleSendEmail} className="p-6 space-y-4">
            {draft && (
              <>
                <input type="hidden" name="agentDraftId" value={draft.id} />
                <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#0f5aab]">
                  Filled in from an AI draft by {draft.sourceAgent}. Check it, add the recipient, then send.
                </p>
              </>
            )}
            <label className="block text-sm font-bold text-slate-700">
              Recipient Email (To)
              <input
                name="to"
                type="email"
                required
                placeholder="client@company.com"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Subject Line
              <input
                name="subject"
                required
                defaultValue={draft?.title}
                placeholder="Important Update regarding your Service"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Message Body (Plain Text)
              <textarea
                name="body"
                required
                defaultValue={draft?.body}
                rows={8}
                placeholder="Dear Client,&#10;&#10;We are writing to inform you..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none font-mono"
              />
            </label>

            <p className="text-[10px] text-slate-400 font-semibold mb-4">
              Emails use server-managed SMTP credentials. The sender identity is managed in System Settings. Every send is kept in the Sent list.
            </p>

            <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
              <Send className="h-4 w-4" /> Send Email
            </Button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {tab === "inbox" && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-xs text-slate-500">
              <span>
                {!status?.configured
                  ? "No mailbox is configured. Set SMTP_* (or IMAP_*) in the hosting environment."
                  : sync?.state === "slow"
                    ? "The mailbox is slow to answer; showing what is stored. Refresh in a moment."
                    : status.lastError
                      ? `Last check failed: ${status.lastError}`
                      : status.lastSyncedAt
                        ? `Last checked ${ukDateTime(new Date(status.lastSyncedAt))}.`
                        : "Not checked yet."}
              </span>
              {status?.configured && (
                <form action={handleSyncNow}>
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-[#041635] hover:bg-slate-50">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Check now
                  </button>
                </form>
              )}
            </div>
          )}
          {!list ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">The email history could not be loaded.</p>
          ) : list.rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-400">
              {tab === "sent" ? "Nothing sent from the platform yet." : "No messages in the Inbox yet."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.rows.map((row) => (
                <li key={row.id}>
                  <Link href={`/admin/email?tab=${tab}&view=${row.id}`} className="flex flex-col gap-1 px-6 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-44 shrink-0 text-xs text-slate-400">{ukDateTime(row.occurredAt)}</span>
                    <span className="w-56 shrink-0 truncate text-sm font-bold text-[#041635]">
                      {tab === "sent" ? `To ${row.toAddress}` : row.fromAddress}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{row.subject}</span>
                    {row.attachmentNames.length > 0 && <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Had attachments" />}
                    {row.status === "failed" && (
                      <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-700">Failed</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {list && (
            <div className="px-6 pb-4">
              <AdminPager page={page} total={list.total} buildHref={(p) => `/admin/email?tab=${tab}&page=${p}`} noun="messages" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageView({ data, backHref }: { data: NonNullable<Awaited<ReturnType<typeof getEmailMessage>>>; backHref: string }) {
  const { message, lead } = data;
  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="space-y-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs font-bold text-[#2691F0] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
        </Link>
        <h2 className="font-outfit text-xl font-black text-[#041635]">{message.subject}</h2>
        <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="font-bold text-slate-500">From</dt>
          <dd className="text-slate-700">{message.fromAddress}</dd>
          <dt className="font-bold text-slate-500">To</dt>
          <dd className="text-slate-700">{message.toAddress}</dd>
          <dt className="font-bold text-slate-500">{message.direction === "inbound" ? "Received" : "Sent"}</dt>
          <dd className="text-slate-700">{ukDateTime(message.occurredAt)}</dd>
          {message.status === "failed" && (
            <>
              <dt className="font-bold text-rose-600">Failed</dt>
              <dd className="text-rose-700">{message.error ?? "No reason recorded."}</dd>
            </>
          )}
          {message.attachmentNames.length > 0 && (
            <>
              <dt className="font-bold text-slate-500">Attached</dt>
              <dd className="text-slate-700">{message.attachmentNames.join(", ")} (not stored here; open the mailbox to see them)</dd>
            </>
          )}
          {lead && (
            <>
              <dt className="font-bold text-slate-500">Lead</dt>
              <dd>
                <Link href={`/admin/leads-crm?view=${lead.id}`} className="font-bold text-[#2691F0] hover:underline">
                  {lead.name ?? lead.company ?? "Open lead"}
                </Link>
              </dd>
            </>
          )}
        </dl>
      </div>
      {/* Plain text, escaped by React: an email's HTML is never rendered. */}
      <pre className="whitespace-pre-wrap break-words px-6 py-5 font-sans text-sm leading-relaxed text-slate-800">{message.textBody}</pre>
    </article>
  );
}
