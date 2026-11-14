import "server-only";
import crypto from "node:crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getServerImapConfig } from "@/lib/email-config";
import {
  INBOX_FIRST_SYNC_DAYS,
  INBOX_RAW_MAX_BYTES,
  INBOX_SYNC_LEASE_MS,
  capSubject,
  capText,
  inboundExternalId,
  inboxSyncDue,
  nextUidBatch,
  normaliseAddress,
  retentionCutoff,
  safeMailError,
} from "@/lib/email-history-core";

/**
 * Sent and received email for the admin Email page (DECISIONS §17).
 *
 * Outbound: each send from the admin Email page is recorded, including
 * failures (best effort: a history write never turns a sent email into a
 * reported failure). Other site email (verification, privacy requests,
 * security alerts) is not recorded here. Inbound: the mailbox in
 * getServerImapConfig() is read over IMAP and stored as plain text. Nothing
 * here is ever exposed to the Paperclip integration.
 */

const SYNC_STATE_KEY = "emailInboxSync";

type SyncState = {
  mailbox?: string;
  /** host:port, so a changed server never reuses another server's UID cursor. */
  server?: string;
  uidValidity?: string;
  lastUid?: number;
  lastSyncedAt?: string;
  lastError?: string | null;
  syncLeaseUntil?: string;
};

export type InboxSyncResult =
  | { state: "not_configured" }
  | { state: "skipped"; lastSyncedAt: string | null; lastError: string | null }
  | { state: "busy" }
  | { state: "ok"; stored: number; lastSyncedAt: string }
  | { state: "error"; error: string; lastSyncedAt: string | null };

const mailSecrets = () => [process.env.SMTP_PASSWORD, process.env.MAIL_PASSWORD, process.env.IMAP_PASSWORD];

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
        error: input.status === "failed" ? safeMailError(input.error, mailSecrets()) : null,
        sentById: input.sentById,
        occurredAt: new Date(),
      },
    })
    // Best effort: a history write must never turn a sent email into a
    // reported failure. A lost row is logged, never silent.
    .catch((error) => console.warn("[email-history] could not record a sent email", error instanceof Error ? error.name : "error"));
}

async function readSyncState(): Promise<SyncState> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SYNC_STATE_KEY } }).catch(() => null);
  return (row?.value ?? {}) as SyncState;
}

/** Replaces the state; writing it also releases the lease. */
async function writeSyncState(state: SyncState): Promise<void> {
  const value = { ...state };
  delete value.syncLeaseUntil;
  await prisma.siteSetting.upsert({
    where: { key: SYNC_STATE_KEY },
    create: { key: SYNC_STATE_KEY, value, updatedAt: new Date() },
    update: { value, updatedAt: new Date() },
  });
}

/**
 * Claims the sync lease in one conditional UPDATE, so of two Inbox requests
 * (or a request and the cron) only one connects. A lease left by a run that
 * died expires after INBOX_SYNC_LEASE_MS.
 */
async function claimSyncLease(): Promise<boolean> {
  await prisma.siteSetting.upsert({
    where: { key: SYNC_STATE_KEY },
    create: { key: SYNC_STATE_KEY, value: {}, updatedAt: new Date() },
    update: {},
  });
  const until = new Date(Date.now() + INBOX_SYNC_LEASE_MS).toISOString();
  const claimed = await prisma.$executeRaw`
    UPDATE "public"."SiteSetting"
       SET "value" = "value" || jsonb_build_object('syncLeaseUntil', ${until}::text),
           "updatedAt" = now()
     WHERE "key" = ${SYNC_STATE_KEY}
       AND (("value" ->> 'syncLeaseUntil') IS NULL OR ("value" ->> 'syncLeaseUntil')::timestamptz < now())`;
  return claimed === 1;
}

type StoredMessage = Prisma.EmailMessageCreateManyInput;

/**
 * Reads new messages from the inbox, oldest first. At most every
 * INBOX_SYNC_INTERVAL_MS unless forced; one run at a time; at most
 * INBOX_BATCH_MAX messages per run, so a backlog drains over several runs.
 * Never throws.
 */
export async function syncInbox(options: { force?: boolean } = {}): Promise<InboxSyncResult> {
  const config = getServerImapConfig();
  if (!config) return { state: "not_configured" };

  const before = await readSyncState();
  const mailbox = config.user.toLowerCase();
  const server = `${config.host.toLowerCase()}:${config.port}`;
  const now = new Date();
  if (!options.force && before.mailbox === mailbox && before.server === server && !inboxSyncDue(before.lastSyncedAt, now)) {
    return { state: "skipped", lastSyncedAt: before.lastSyncedAt ?? null, lastError: before.lastError ?? null };
  }
  if (!(await claimSyncLease().catch(() => false))) return { state: "busy" };
  const state = await readSyncState();

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    // 993 is implicit TLS. Any other port must upgrade with STARTTLS before
    // logging in, or the connection is refused: credentials never travel in
    // clear text.
    secure: config.port === 993,
    doSTARTTLS: config.port === 993 ? undefined : true,
    auth: { user: config.user, pass: config.password },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  let stored = 0;
  let highest = 0;
  let uidValidity = "0";
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      uidValidity = client.mailbox ? String(client.mailbox.uidValidity) : "0";
      // A changed mailbox, server or UIDVALIDITY means old UIDs mean nothing.
      const sameBox = state.mailbox === mailbox && state.server === server && state.uidValidity === uidValidity;
      const lastUid = sameBox ? state.lastUid ?? 0 : 0;
      highest = lastUid;

      const found =
        lastUid > 0
          ? await client.search({ uid: `${lastUid + 1}:*` }, { uid: true })
          : await client.search({ since: new Date(now.getTime() - INBOX_FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000) }, { uid: true });
      const batch = nextUidBatch(found || [], lastUid);

      if (batch.length > 0) {
        // Envelopes and sizes first: nothing is buffered whole until its size is known.
        const heads: { uid: number; size: number; internalDate?: Date; envelope?: { subject?: string; messageId?: string; from?: { address?: string }[]; to?: { address?: string }[]; date?: Date } }[] = [];
        for await (const m of client.fetch(batch, { uid: true, size: true, envelope: true, internalDate: true }, { uid: true })) {
          heads.push({ uid: m.uid, size: m.size ?? 0, internalDate: m.internalDate instanceof Date ? m.internalDate : undefined, envelope: m.envelope as never });
        }
        heads.sort((a, b) => a.uid - b.uid);

        for (const head of heads) {
          const env = head.envelope ?? {};
          const base = {
            id: crypto.randomUUID(),
            direction: "inbound",
            mailbox,
            status: "received",
            fromAddress: normaliseAddress(env.from?.[0]?.address) || "(unknown sender)",
            toAddress: normaliseAddress(env.to?.[0]?.address) || mailbox,
            occurredAt: env.date ?? head.internalDate ?? now,
          };
          let row: StoredMessage;
          try {
            if (head.size > INBOX_RAW_MAX_BYTES) {
              row = {
                ...base,
                externalId: inboundExternalId({ mailbox, server, messageId: env.messageId, uid: head.uid, uidValidity }),
                subject: capSubject(env.subject),
                textBody: `[This message is ${(head.size / 1024 / 1024).toFixed(1)} MB, too large to copy here. Open the mailbox to read it.]`,
              };
            } else {
              const full = await client.fetchOne(String(head.uid), { source: true }, { uid: true });
              const parsed = full && full.source ? await simpleParser(full.source) : null;
              row = {
                ...base,
                externalId: inboundExternalId({ mailbox, server, messageId: parsed?.messageId ?? env.messageId, uid: head.uid, uidValidity }),
                fromAddress: normaliseAddress(parsed?.from?.text) || base.fromAddress,
                toAddress: normaliseAddress(Array.isArray(parsed?.to) ? parsed?.to[0]?.text : parsed?.to?.text) || base.toAddress,
                subject: capSubject(parsed?.subject ?? env.subject),
                // mailparser converts an HTML-only message to text. The text
                // is shown escaped, never as HTML.
                textBody: capText(parsed?.text ?? ""),
                attachmentNames: (parsed?.attachments ?? []).map((a) => (a.filename || "unnamed").slice(0, 200)).slice(0, 20),
                occurredAt: parsed?.date ?? base.occurredAt,
              };
            }
          } catch (error) {
            // One unreadable message must not block every later one: it is
            // recorded as unreadable and the cursor moves past it.
            row = {
              ...base,
              externalId: inboundExternalId({ mailbox, server, messageId: env.messageId, uid: head.uid, uidValidity }),
              subject: capSubject(env.subject),
              textBody: `[This message could not be read here (${safeMailError(error, mailSecrets())}). Open the mailbox to read it.]`,
            };
          }
          const result = await prisma.emailMessage.createMany({ data: [row], skipDuplicates: true });
          stored += result.count;
          highest = Math.max(highest, head.uid);
          // Progress is saved per message, so a failure later in the batch
          // does not make the next run repeat what is already stored.
          await prisma.$executeRaw`
            UPDATE "public"."SiteSetting"
               SET "value" = "value" || jsonb_build_object('lastUid', ${highest}::int, 'uidValidity', ${uidValidity}::text, 'mailbox', ${mailbox}::text, 'server', ${server}::text)
             WHERE "key" = ${SYNC_STATE_KEY}`;
        }
      }
    } finally {
      lock.release();
    }
    await writeSyncState({ mailbox, server, uidValidity, lastUid: highest, lastSyncedAt: now.toISOString(), lastError: null });
    return { state: "ok", stored, lastSyncedAt: now.toISOString() };
  } catch (error) {
    const message = safeMailError(error, mailSecrets());
    const latest = await readSyncState();
    await writeSyncState({ ...latest, lastSyncedAt: now.toISOString(), lastError: message }).catch(() => undefined);
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

/** Deletes messages past retention. Throws on failure, so the cron reports it. */
export async function purgeOldEmail(now = new Date()): Promise<number> {
  const result = await prisma.emailMessage.deleteMany({ where: { occurredAt: { lt: retentionCutoff(now) } } });
  return result.count;
}

export async function inboxSyncStatus(): Promise<{ lastSyncedAt: string | null; lastError: string | null; configured: boolean }> {
  const state = await readSyncState();
  return { lastSyncedAt: state.lastSyncedAt ?? null, lastError: state.lastError ?? null, configured: Boolean(getServerImapConfig()) };
}
