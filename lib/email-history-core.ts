/**
 * Pure helpers for the admin email history and inbox (DECISIONS §17), so
 * `npm run test:email-history` can cover them without a mail server.
 */

/** Stored text is capped: an email history is a record, not an archive of attachments or newsletters. */
export const EMAIL_TEXT_MAX = 100_000;
export const EMAIL_SUBJECT_MAX = 300;
/** Kept this long, then deleted by the daily email cron. */
export const EMAIL_RETENTION_MONTHS = 24;
/** The Email page syncs at most this often; the daily cron covers quiet periods. */
export const INBOX_SYNC_INTERVAL_MS = 2 * 60 * 1000;
/** A first sync reaches back this far, and one run stores at most this many messages. */
export const INBOX_FIRST_SYNC_DAYS = 60;
export const INBOX_BATCH_MAX = 100;

/** The bare, lower-cased address from "Name <a@b.c>" or "a@b.c"; "" if there is none. */
export function normaliseAddress(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  const angled = text.match(/<([^<>\s]+@[^<>\s]+)>/);
  const bare = angled ? angled[1] : text.match(/[^\s<>"',;:()]+@[^\s<>"',;:()]+/)?.[0] ?? "";
  return bare.toLowerCase().replace(/[.,;:]+$/, "").slice(0, 254);
}

/**
 * A stable key for a received message, so a re-sync never stores it twice.
 * The Message-ID header is preferred; without one, the IMAP UID is only
 * meaningful together with the mailbox's UIDVALIDITY.
 */
export function inboundExternalId(input: { mailbox: string; messageId?: string | null; uid: number; uidValidity: bigint | number | string }): string {
  const mailbox = input.mailbox.toLowerCase();
  const id = (input.messageId ?? "").trim().replace(/^<|>$/g, "").slice(0, 300);
  return id ? `${mailbox}|mid|${id}` : `${mailbox}|uid|${String(input.uidValidity)}|${input.uid}`;
}

/** Control characters out (except tab and newlines), CRLF normalised, length capped. */
export function capText(value: string | null | undefined, max = EMAIL_TEXT_MAX): string {
  const text = (value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  return text.length > max ? `${text.slice(0, max)}\n\n[Truncated: the message was longer than ${max.toLocaleString("en-GB")} characters.]` : text;
}

export function capSubject(value: string | null | undefined): string {
  return capText(value, EMAIL_SUBJECT_MAX).replace(/\s+/g, " ").trim() || "(no subject)";
}

/** Messages that happened before this moment are past retention. */
export function retentionCutoff(now: Date, months = EMAIL_RETENTION_MONTHS): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

/** Whether the page should sync now, given the last sync time. */
export function inboxSyncDue(lastSyncedAt: string | null | undefined, now: Date, intervalMs = INBOX_SYNC_INTERVAL_MS): boolean {
  if (!lastSyncedAt) return true;
  const last = Date.parse(lastSyncedAt);
  return !Number.isFinite(last) || now.getTime() - last >= intervalMs;
}

/**
 * A mail error safe to store and show: no credentials, bounded length. SMTP
 * and IMAP errors can echo the AUTH exchange, so anything after "AUTH",
 * "PASS" or "LOGIN" on a line is dropped.
 */
export function safeMailError(error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Unknown error");
  return raw
    .split("\n")
    .map((line) => line.replace(/\b(AUTH|PASS|LOGIN)\b.*$/i, "$1 [redacted]"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}
