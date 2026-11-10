-- Server-only tables, and two indexes for queries that run on every admin page.
--
-- Additive and idempotent. The REVOKE was first appended to an
-- already-applied migration, which changes its checksum; it lives here instead.

-- Supabase grants its public API roles access to new tables by default. Row
-- level security already hides every row; this removes the grant too. Guarded,
-- because databases outside Supabase have no anon or authenticated roles.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE "public"."RateLimitBucket" FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON TABLE "public"."UserSession" FROM %I', role_name);
    END IF;
  END LOOP;
END
$$;

-- The admin header counts unread notifications on every page.
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON "public"."Notification" ("userId", "readAt");

-- The session sweep deletes rows that ended more than 30 days ago.
CREATE INDEX IF NOT EXISTS "UserSession_revokedAt_idx"
  ON "public"."UserSession" ("revokedAt");
