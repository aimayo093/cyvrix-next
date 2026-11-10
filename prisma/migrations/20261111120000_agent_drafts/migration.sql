-- Drafts and proposals submitted by Paperclip agents, waiting for a person.
--
-- Additive; nothing reads it until the Paperclip draft token is set, so it can
-- be applied before or after the deploy. Nothing an agent submits is public:
-- a draft becomes a blog post or an email only through an administrator's
-- approval in /admin/ai-drafts (DECISIONS section 15).

DO $$
BEGIN
  CREATE TYPE "public"."AgentDraftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "public"."AgentDraft" (
  "id"               TEXT NOT NULL,
  "kind"             TEXT NOT NULL,
  "status"           "public"."AgentDraftStatus" NOT NULL DEFAULT 'PENDING',
  "title"            TEXT NOT NULL,
  "body"             TEXT NOT NULL,
  "payload"          JSONB NOT NULL DEFAULT '{}',
  -- Public-claims rule breaches found on submission or after an edit.
  "claimFindings"    JSONB NOT NULL DEFAULT '[]',
  "sourceAgent"      TEXT NOT NULL,
  "sourceRole"       TEXT,
  "paperclipIssueId" TEXT,
  -- Lets an agent retry a submission without creating a second draft.
  "idempotencyKey"   TEXT NOT NULL,
  "reviewerId"       TEXT,
  "reviewNote"       TEXT,
  "reviewedAt"       TIMESTAMP(3),
  -- The blog post id (or other record) an approved draft became.
  "publishedRef"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgentDraft_kind_check" CHECK ("kind" IN ('blog', 'email', 'social', 'proposal'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentDraft_idempotencyKey_key"
  ON "public"."AgentDraft" ("idempotencyKey");
CREATE INDEX IF NOT EXISTS "AgentDraft_status_kind_createdAt_idx"
  ON "public"."AgentDraft" ("status", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentDraft_updatedAt_idx"
  ON "public"."AgentDraft" ("updatedAt");

-- Server only: not reachable through the public Supabase API.
ALTER TABLE "public"."AgentDraft" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE "public"."AgentDraft" FROM %I', role_name);
    END IF;
  END LOOP;
END
$$;
