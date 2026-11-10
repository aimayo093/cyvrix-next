-- Sign out everywhere, and rate limits that hold across server instances.
--
-- Additive only, and safe to run before the code that uses it is deployed:
-- the old code ignores both. Run it BEFORE merging: the new code reads
-- "sessionVersion" on every signed-in request.

-- Every session token carries the version it was issued with. Raising this
-- number ends all of the account's sessions at once: on a password change, a
-- two-factor change, or "sign out everywhere". Existing sessions carry no
-- version, which reads as 0, so nobody is signed out by this migration.
ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Rate-limit windows shared by every server instance. Previously each instance
-- counted on its own, so attempts spread across instances were not limited.
-- The key is an HMAC of the subject (address or email), never the raw value.
CREATE TABLE IF NOT EXISTS "public"."RateLimitBucket" (
  "key"     TEXT NOT NULL,
  "count"   INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- Expired windows are swept by resetAt.
CREATE INDEX IF NOT EXISTS "RateLimitBucket_resetAt_idx"
  ON "public"."RateLimitBucket" ("resetAt");

-- Not reachable through the public Supabase API. The server connects as the
-- table owner and is unaffected; with no policies, anon and authenticated
-- roles can read or write nothing.
ALTER TABLE "public"."RateLimitBucket" ENABLE ROW LEVEL SECURITY;
