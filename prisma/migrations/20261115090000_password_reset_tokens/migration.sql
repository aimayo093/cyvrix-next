-- Self-service password reset (DECISIONS §18).
--
-- Additive. Apply BEFORE deploying the code that uses it. Only the SHA-256
-- hash of each token is stored, so a copy of this table yields no working
-- reset links. Rows are deleted when used, when replaced by a newer request,
-- and when expired.

CREATE TABLE IF NOT EXISTS "public"."PasswordResetToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken" ("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "public"."PasswordResetToken" ("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken" ("expiresAt");

-- Server only: not reachable through the public Supabase API.
ALTER TABLE "public"."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."PasswordResetToken" FROM anon, authenticated;
