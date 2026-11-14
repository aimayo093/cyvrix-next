-- Tamper-evident audit log.
--
-- Every AuditLog row carries a sequence number and a SHA-256 hash of its own
-- contents plus the previous row's hash, so editing, removing or reordering a
-- past row breaks the chain from that point on. The database assigns all three
-- under a lock; the application writes rows exactly as before.
--
-- Rows can no longer be updated, deleted or truncated through ordinary SQL.
-- The table owner can still drop the triggers -- the chain is what makes that
-- visible afterwards. See DECISIONS section 14.

ALTER TABLE "public"."AuditLog"
  ADD COLUMN IF NOT EXISTS "seq" BIGINT,
  ADD COLUMN IF NOT EXISTS "prevHash" TEXT,
  ADD COLUMN IF NOT EXISTS "hash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_seq_key" ON "public"."AuditLog" ("seq");

-- The one definition of a row's hash. Insert, backfill and verification all
-- call it, so they cannot disagree about the encoding.
CREATE OR REPLACE FUNCTION "public"."audit_log_row_hash"(
  prev_hash TEXT, seq BIGINT, id TEXT, user_id TEXT, action TEXT,
  entity_type TEXT, entity_id TEXT, ip_address TEXT, metadata JSONB, created_at TIMESTAMP
) RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(
    sha256(convert_to(
      coalesce(prev_hash, '') || jsonb_build_array(
        seq, id, user_id, action, entity_type, entity_id, ip_address, metadata,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US')
      )::text,
      'UTF8'
    )),
    'hex'
  )
$$;

-- Backfill the existing rows in the order they were written. Runs before the
-- update guard below exists.
DO $$
DECLARE
  r RECORD;
  n BIGINT := 0;
  prev TEXT := NULL;
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."AuditLog" WHERE "seq" IS NULL) THEN
    SELECT "seq", "hash" INTO n, prev FROM "public"."AuditLog"
      WHERE "seq" IS NOT NULL ORDER BY "seq" DESC LIMIT 1;
    n := coalesce(n, 0);
    FOR r IN SELECT * FROM "public"."AuditLog" WHERE "seq" IS NULL ORDER BY "createdAt", "id" LOOP
      n := n + 1;
      UPDATE "public"."AuditLog" SET
        "seq" = n,
        "prevHash" = prev,
        "hash" = "public"."audit_log_row_hash"(prev, n, r."id", r."userId", r."action",
          r."entityType", r."entityId", r."ipAddress", r."metadata", r."createdAt")
      WHERE "id" = r."id"
      RETURNING "hash" INTO prev;
    END LOOP;
  END IF;
END
$$;

-- Chain each new row onto the last. The advisory lock serialises writers, so
-- two concurrent inserts can never claim the same predecessor. Values the
-- client supplies for these columns are overwritten.
CREATE OR REPLACE FUNCTION "public"."audit_log_chain"() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  last_seq BIGINT;
  last_hash TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('public.AuditLog.chain'));
  SELECT "seq", "hash" INTO last_seq, last_hash FROM "public"."AuditLog"
    WHERE "seq" IS NOT NULL ORDER BY "seq" DESC LIMIT 1;
  NEW."seq" := coalesce(last_seq, 0) + 1;
  NEW."prevHash" := last_hash;
  NEW."hash" := "public"."audit_log_row_hash"(last_hash, NEW."seq", NEW."id", NEW."userId", NEW."action",
    NEW."entityType", NEW."entityId", NEW."ipAddress", NEW."metadata", NEW."createdAt");
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION "public"."audit_log_append_only"() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

DROP TRIGGER IF EXISTS "AuditLog_chain" ON "public"."AuditLog";
CREATE TRIGGER "AuditLog_chain" BEFORE INSERT ON "public"."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_chain"();

DROP TRIGGER IF EXISTS "AuditLog_no_update_delete" ON "public"."AuditLog";
CREATE TRIGGER "AuditLog_no_update_delete" BEFORE UPDATE OR DELETE ON "public"."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_append_only"();

DROP TRIGGER IF EXISTS "AuditLog_no_truncate" ON "public"."AuditLog";
CREATE TRIGGER "AuditLog_no_truncate" BEFORE TRUNCATE ON "public"."AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION "public"."audit_log_append_only"();

-- Walk the chain and report the first row that does not match. Read-only.
CREATE OR REPLACE FUNCTION "public"."audit_log_verify"()
RETURNS TABLE ("checked" BIGINT, "firstBadSeq" BIGINT, "problem" TEXT, "headSeq" BIGINT, "headHash" TEXT)
LANGUAGE plpgsql STABLE
SET search_path = ''
AS $$
DECLARE
  r RECORD;
  n BIGINT := 0;
  prev TEXT := NULL;
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."AuditLog" WHERE "seq" IS NULL OR "hash" IS NULL) THEN
    RETURN QUERY SELECT 0::BIGINT, NULL::BIGINT, 'a row has no chain position'::TEXT, NULL::BIGINT, NULL::TEXT;
    RETURN;
  END IF;
  FOR r IN SELECT * FROM "public"."AuditLog" ORDER BY "seq" LOOP
    n := n + 1;
    IF r."seq" <> n THEN
      RETURN QUERY SELECT n - 1, n, 'a row is missing before this position'::TEXT, NULL::BIGINT, NULL::TEXT;
      RETURN;
    END IF;
    IF r."prevHash" IS DISTINCT FROM prev OR r."hash" <> "public"."audit_log_row_hash"(prev, r."seq", r."id", r."userId",
         r."action", r."entityType", r."entityId", r."ipAddress", r."metadata", r."createdAt") THEN
      RETURN QUERY SELECT n - 1, n, 'this row was changed after it was written'::TEXT, NULL::BIGINT, NULL::TEXT;
      RETURN;
    END IF;
    prev := r."hash";
  END LOOP;
  RETURN QUERY SELECT n, NULL::BIGINT, NULL::TEXT, CASE WHEN n = 0 THEN NULL ELSE n END, prev;
END
$$;

-- Supabase's API roles get EXECUTE on new functions by default. None of these
-- is for them; the server's own role keeps its access, which inserts need.
-- Guarded, because databases outside Supabase have no such roles.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."audit_log_row_hash"(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMP) FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."audit_log_chain"() FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."audit_log_append_only"() FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."audit_log_verify"() FROM %I', role_name);
    END IF;
  END LOOP;
END
$$;

-- PUBLIC also holds EXECUTE by default. The owner (the role the server and
-- migrations use) keeps it regardless.
REVOKE ALL ON FUNCTION "public"."audit_log_row_hash"(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMP) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."audit_log_chain"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."audit_log_append_only"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."audit_log_verify"() FROM PUBLIC;
