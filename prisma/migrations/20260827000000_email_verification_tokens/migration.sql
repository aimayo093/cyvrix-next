-- Email verification tokens for staff accounts.
--
-- New table only; nothing existing is altered. The token itself is never
-- stored, only its SHA-256 hash, so a copy of this table does not yield working
-- verification links.

CREATE TABLE IF NOT EXISTS "public"."VerificationToken" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  -- SHA-256 of the token. Unique, so a lookup is a single indexed read.
  "tokenHash"  TEXT NOT NULL,
  -- The address the link was sent to. Verification is refused if the account's
  -- email has changed since, rather than confirming one nobody proved.
  "email"      TEXT NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_tokenHash_key"
  ON "public"."VerificationToken" ("tokenHash");

-- Issuing a new token clears the account's previous ones.
CREATE INDEX IF NOT EXISTS "VerificationToken_userId_idx"
  ON "public"."VerificationToken" ("userId");
