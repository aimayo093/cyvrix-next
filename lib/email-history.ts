import "server-only";
import crypto from "node:crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { getServerImapConfig } from "@/lib/email-config";
import {
  INBOX_BATCH_MAX,
  INBOX_FIRST_SYNC_DAYS,
  capSubject,
  capText,
  inboundExternalId,
  inboxSyncDue,
  normaliseAddress,
  retentionCutoff,
  safeMailError,
} from "@/lib/email-history-core";

/**
 * Sent and received email for the admin Email page (DECISIONS §17).
 *
 * Outbound: every send from the page is recorded, including failures, so the
 * history shows what was attempted and what went wrong. Inbound: the mailbox
 * in getServerImapConfig() is read over IMAP and stored as plain text, newest
 * first. Nothing here is ever exposed to the Paperclip integration.
 */

const SYNC_STATE_KEY = "emailInboxSync";

type SyncState = {
  mailbox?: string;
  uidValidity?: string;
  lastUid?: number;
  lastSyncedAt?: string;
  lastError?: string | null;
};

export type InboxSyncResult =
  | { state: "not_configured" }
  | { state: "skipped"; lastSyncedAt: string | null; lastError: string | null }
  | { state: "ok"; stored: number; lastSyncedAt: string }
  | { state: "error"; error: string; lastSyncedAt: string | null };

export async function recordOutboundEmail(input: {
  mailbox: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  status: "sent" | "failed";
  error?: unknown;
  sentById: string;
}): Promise<void> {
  await prisma.emailMessage
    .create({
      data: {
        id: crypto.randomUUID(),
        direction: "outbound",
        mailbox: normaliseAddress(input.mailbox) || input.mailbox.slice(0, 254),
        status: input.status,
        fromAddress: normaliseAddress(input.from) || input.from.slice(0, 254),
        toAddress: normaliseAddress(input.to),
        subject: capSubject(input.subject),
        textBody: capText(input.text),
        error: input.status === "failed" ? safeMailError(input.error) : null,
        sentById: input.sentById,
        occurredAt: new Date(),
      },
    })
    // A history write must never turn a sent email into a reported failure.
    .catch((error) => console.warn("[email-history] could not record a sent email", error instanceof Error ? error.name : "error"));
}

async function readSyncState(): Promise<SyncState> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SYNC_STATE_KEY } }).catch(() => null);
  return (row?.value ?? {}) as SyncState;
}

async function writeSyncState(state: SyncState): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: SYNC_STATE_KEY },
    create: { key: SYNC_STATE_KEY, value: state, updatedAt: new Date() },
    update: { value: state, updatedAt: new Date() },
  });
}

/**
 * Reads new messages from the inbox. At most every INBOX_SYNC_INTERVAL_MS
 * unless forced; at most INBOX_BATCH_MAX messages per run; a first sync only
 * reaches back INBOX_FIRST_SYNC_DAYS. Never throws.
 */
export async function syncInbox(options: { force?: boolean } = {}): Promise<InboxSyncResult> {
  const config = getServerImapConfig();
  if (!config) return { state: "not_configured" };

  const state = await readSyncState();
  const mailbox = config.user.toLowerCase();
  const now = new Date();
  if (!options.force && state.mailbox === mailbox && !inboxSyncDue(state.lastSyncedAt, now)) {
    return { state: "skipped", lastSyncedAt: state.lastSyncedAt ?? null, lastError: state.lastError ?? null };
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.port === 993,
    auth: { user: config.user, pass: config.password },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  let stored = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const opened = client.mailbox;
      const uidValidity = opened ? String(opened.uidValidity) : "0";
      // A changed mailbox or UIDVALIDITY means old UIDs mean nothing: start again.
      const sameBox = state.mailbox === mailbox && state.uidValidity === uidValidity;
      const lastUid = sameBox ? state.lastUid ?? 0 : 0;

      let uids: number[];
      if (lastUid > 0) {
        const found = await client.search({ uid: `${lastUid + 1}:*` }, { uid: true });
        uids = (found || []).filter((uid) => uid > lastUid);
      } else {
        const since = new Date(now.getTime() - INBOX_FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000);
        uids = (await client.search({ since }, { uid: true })) || [];
      }
      uids.sort((a, b) => a - b);
      const batch = uids.slice(-INBOX_BATCH_MAX);

      let highest = lastUid;
      if (batch.length > 0) {
        for await (const message of client.fetch(batch, { uid: true, source: true, internalDate: true }, { uid: true })) {
          highest = Math.max(highest, message.uid);
          if (!message.source) continue;
          const parsed = await simpleParser(message.source);
          const occurredAt = parsed.date ?? (message.internalDate instanceof Date ? message.internalDate : now);
          const result = await prisma.emailMessage.createMany({
            data: [
              {
                id: crypto.randomUUID(),
                direction: "inbound",
                mailbox,
                status: "received",
                externalId: inboundExternalId({ mailbox, messageId: parsed.messageId, uid: message.uid, uidValidity }),
                fromAddress: normaliseAddress(parsed.from?.text) || "(unknown sender)",
                toAddress: normaliseAddress(Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text) || mailbox,
                subject: capSubject(parsed.subject),
                // mailparser already converts an HTML-only message to text. The
                // text is shown escaped, never as HTML.
                textBody: capText(parsed.text),
                attachmentNames: (parsed.attachments ?? []).map((a) => (a.filename || "unnamed").slice(0, 200)).slice(0, 20),
                occurredAt,
              },
            ],
            skipDuplicates: true,
          });
          stored += result.count;
        }
      }
      await writeSyncState({ mailbox, uidValidity, lastUid: Math.max(highest, lastUid), lastSyncedAt: now.toISOString(), lastError: null });
      return { state: "ok", stored, lastSyncedAt: now.toISOString() };
    } finally {
      lock.release();
    }
  } catch (error) {
    const message = safeMailError(error);
    await writeSyncState({ ...state, lastSyncedAt: now.toISOString(), lastError: message }).catch(() => undefined);
    return { state: "error", error: message, lastSyncedAt: state.lastSyncedAt ?? null };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function listEmailMessages(direction: "outbound" | "inbound", page: number, pageSize: number) {
  const where = { direction };
  const [rows, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, status: true, fromAddress: true, toAddress: true, subject: true, occurredAt: true, error: true, attachmentNames: true },
    }),
    prisma.emailMessage.count({ where }),
  ]);
  return { rows, total };
}

/** One message, plus the lead whose email matches the other party, if any. */
export async function getEmailMessage(id: string) {
  const message = await prisma.emailMessage.findUnique({ where: { id } });
  if (!message) return null;
  const counterpart = message.direction === "inbound" ? message.fromAddress : message.toAddress;
  const lead = counterpart.includes("@")
    ? await prisma.lead.findFirst({ where: { email: { equals: counterpart, mode: "insensitive" } }, select: { id: true, name: true, company: true } })
    : null;
  return { message, lead };
}

/** Deletes messages past retention. Returns how many went. */
export async function purgeOldEmail(now = new Date()): Promise<number> {
  const result = await prisma.emailMessage.deleteMany({ where: { occurredAt: { lt: retentionCutoff(now) } } });
  return result.count;
}

export async function inboxSyncStatus(): Promise<{ lastSyncedAt: string | null; lastError: string | null; configured: boolean }> {
  const state = await readSyncState();
  return { lastSyncedAt: state.lastSyncedAt ?? null, lastError: state.lastError ?? null, configured: Boolean(getServerImapConfig()) };
}
