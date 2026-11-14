-- Sent and received email for the admin Email page (DECISIONS §17).
--
-- Additive. Apply BEFORE deploying the code that uses it: the send action
-- records each message here. Messages are kept for 24 months and then
-- deleted by the daily email cron.

CREATE TABLE IF NOT EXISTS "public"."EmailMessage" (
  "id"              TEXT NOT NULL,
  "direction"       TEXT NOT NULL,
  "mailbox"         TEXT NOT NULL,
  "status"          TEXT NOT NULL,
  "externalId"      TEXT,
  "fromAddress"     TEXT NOT NULL,
  "toAddress"       TEXT NOT NULL,
  "subject"         TEXT NOT NULL,
  "textBody"        TEXT NOT NULL,
  "attachmentNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "error"           TEXT,
  "sentById"        TEXT,
  "occurredAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailMessage_direction_check" CHECK ("direction" IN ('outbound', 'inbound')),
  CONSTRAINT "EmailMessage_status_check" CHECK ("status" IN ('sent', 'failed', 'received'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailMessage_externalId_key" ON "public"."EmailMessage" ("externalId");
CREATE INDEX IF NOT EXISTS "EmailMessage_direction_occurredAt_idx" ON "public"."EmailMessage" ("direction", "occurredAt");
CREATE INDEX IF NOT EXISTS "EmailMessage_fromAddress_idx" ON "public"."EmailMessage" ("fromAddress");

-- Server only: not reachable through the public Supabase API. Received mail
-- holds other people's personal data.
ALTER TABLE "public"."EmailMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."EmailMessage" FROM anon, authenticated;
