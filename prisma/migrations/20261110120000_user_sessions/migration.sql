-- One row per signed-in device, so devices can be listed and signed out one
-- at a time from the Security Center.
--
-- Additive. Apply BEFORE deploying the code that uses it. Sessions issued
-- before this table existed name no row, so each account signs in once more
-- after the deploy.

CREATE TABLE IF NOT EXISTS "public"."UserSession" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"     TIMESTAMP(3) NOT NULL,
  -- Shown to the Security Center so a device can be recognised. Kept only
  -- while the session lives and for 30 days after it ends (DECISIONS §13).
  "userAgent"     TEXT,
  "ipAddress"     TEXT,
  "revokedAt"     TIMESTAMP(3),
  "revokedReason" TEXT,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx"
  ON "public"."UserSession" ("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx"
  ON "public"."UserSession" ("expiresAt");

-- Server only. The public API roles lose their grant in 20261110130000.
ALTER TABLE "public"."UserSession" ENABLE ROW LEVEL SECURITY;
