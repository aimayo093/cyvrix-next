-- Two-factor enrolment for staff accounts.
--
-- Additive only. Every column is nullable or has a default, so existing rows
-- are untouched and accounts keep working exactly as before until someone
-- enrols. twoFactorReady already existed and is left alone; it becomes
-- meaningful once a secret sits beside it, rather than a flag anyone could set.

ALTER TABLE "public"."User"
  -- The TOTP shared secret, sealed with AES-256-GCM. Never stored in plaintext:
  -- anyone holding it can mint valid codes indefinitely.
  ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
  -- When enrolment was confirmed by entering a live code, not when it started.
  ADD COLUMN IF NOT EXISTS "twoFactorEnrolledAt" TIMESTAMP(3),
  -- Hashed single-use recovery codes, as a JSON array of scrypt hashes.
  ADD COLUMN IF NOT EXISTS "twoFactorRecoveryCodes" JSONB,
  -- The last TOTP counter accepted for this account. A code stays valid for its
  -- whole 30-second step, so without this the same six digits work twice for
  -- whoever read them over a shoulder.
  ADD COLUMN IF NOT EXISTS "twoFactorLastCounter" BIGINT;

-- Finding accounts still without a second factor is a Security Center query,
-- run on every scan.
CREATE INDEX IF NOT EXISTS "User_twoFactorReady_active_idx"
  ON "public"."User" ("twoFactorReady", "active");
