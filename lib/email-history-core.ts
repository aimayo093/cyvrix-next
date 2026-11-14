/**
 * Pure helpers for the admin email history and inbox (DECISIONS §17), so
 * `npm run test:email-history` can cover them without a mail server.
 *
 * No `server-only` (tests import it); it imports `node:crypto`, so a client
 * component importing it fails the build anyway.
 */
import { createHash } from "node:crypto";

/** Stored text is capped: an email history is a record, not an archive of attachments or newsletters. */
export const EMAIL_TEXT_MAX = 100_000;
export const EMAIL_SUBJECT_MAX = 300;
/** Kept this long, then deleted by the daily email cron. */
export const EMAIL_RETENTION_MONTHS = 24;
/** The Email page syncs at most this often; the daily cron covers quiet periods. */
export const INBOX_SYNC_INTERVAL_MS = 2 * 60 * 1000;
/** A sync holds a lease this long, so two syncs never run at once. */
export const INBOX_SYNC_LEASE_MS = 90 * 1000;
/** A first sync reaches back this far, and one run reads at most this many messages, oldest first. */
export const INBOX_FIRST_SYNC_DAYS = 60;
export const INBOX_BATCH_MAX = 100;
/** Larger messages are recorded from their envelope only: never buffered whole. */
export const INBOX_RAW_MAX_BYTES = 5 * 1024 * 1024;

/** The bare, lower-cased address from "Name <a@b.c>" or "a@b.c"; "" if there is none. */
export function normaliseAddress(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  const angled = text.match(/<([^<>\s]+@[^<>\s]+)>/);
  const bare = angled ? angled[1] : text.match(/[^\s<>"',;:()]+@[^\s<>"',;:()]+/)?.[0] ?? "";
  return bare.toLowerCase().replace(/[.,;:]+$/, "").slice(0, 254);
}

/**
 * A stable, bounded key for a received message, so a re-sync never stores it
 * twice. The full Message-ID is hashed (never truncated, which could merge
 * two long IDs). Without one, the IMAP UID is only meaningful together with
 * the server and the mailbox's UIDVALIDITY.
 */
export function inboundExternalId(input: {
  mailbox: string;
  server: string;
  messageId?: string | null;
  uid: number;
  uidValidity: bigint | number | string;
}): string {
  const mailbox = input.mailbox.toLowerCase();
  const id = (input.messageId ?? "").trim().replace(/^<|>$/g, "");
  if (id) return `${mailbox}|mid|${createHash("sha256").update(id).digest("hex")}`;
  return `${mailbox}|uid|${input.server.toLowerCase()}|${String(input.uidValidity)}|${input.uid}`;
}

/**
 * Of the UIDs waiting, the batch to read now: the oldest first, so a backlog
 * larger than one batch drains over later runs instead of being skipped.
 */
export function nextUidBatch(uids: number[], lastUid: number, max = INBOX_BATCH_MAX): number[] {
  return [...new Set(uids)].filter((uid) => uid > lastUid).sort((a, b) => a - b).slice(0, max);
}

/** Control characters out (except tab and newlines), CRLF normalised, length capped including the note. */
export function capText(value: string | null | undefined, max = EMAIL_TEXT_MAX): string {
  const text = (value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  if (text.length <= max) return text;
  const note = `\n\n[Truncated: the message was longer than ${max.toLocaleString("en-GB")} characters.]`;
  return text.slice(0, Math.max(0, max - note.length)) + note;
}

export function capSubject(value: string | null | undefined): string {
  const subject = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!subject) return "(no subject)";
  return subject.length <= EMAIL_SUBJECT_MAX ? subject : `${subject.slice(0, EMAIL_SUBJECT_MAX - 1)}…`;
}

/**
 * Messages that happened before this moment are past retention. The day is
 * clamped to the target month, so 29 February does not roll into March.
 */
export function retentionCutoff(now: Date, months = EMAIL_RETENTION_MONTHS): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(now.getUTCDate(), lastDay),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  ));
}

/** Whether the page should sync now, given the last sync time. */
export function inboxSyncDue(lastSyncedAt: string | null | undefined, now: Date, intervalMs = INBOX_SYNC_INTERVAL_MS): boolean {
  if (!lastSyncedAt) return true;
  const last = Date.parse(lastSyncedAt);
  return !Number.isFinite(last) || now.getTime() - last >= intervalMs;
}

/**
 * A mail error safe to store and show. SMTP and IMAP errors can echo the AUTH
 * exchange, a password field or a URL with credentials, so those are
 * redacted, and any known secret value passed in is replaced wherever it
 * appears. Bounded length.
 */
export function safeMailError(error: unknown, secrets: Array<string | undefined> = []): string {
  let text = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Unknown error");
  for (const secret of secrets) {
    if (secret && secret.length >= 4) text = text.split(secret).join("[redacted]");
  }
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/\b(AUTH|AUTHENTICATE|PASS|LOGIN)\b.*$/i, "$1 [redacted]")
        .replace(/\b(password|passwd|pass|pwd|secret|token)\b\s*[=:]\s*\S+/gi, "$1=[redacted]")
        .replace(/(\w+:\/\/)[^\s/@:]+:[^\s/@]+@/g, "$1[redacted]@"),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}
