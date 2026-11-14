-- Enquiry source on leads (DECISIONS §16): how the visitor reached the site,
-- and their answer to "How did you hear about us?".
--
-- Additive and nullable, no backfill: the previous build ignores these
-- columns, and leads created before them stay null ("not captured", never
-- "direct"). Idempotent. Row level security on "Lead" (one policy: admin
-- profiles only) and its grants are unchanged; new columns inherit them.

ALTER TABLE "public"."Lead"
  ADD COLUMN IF NOT EXISTS "heardAbout"       TEXT,
  ADD COLUMN IF NOT EXISTS "heardAboutOther"  TEXT,
  ADD COLUMN IF NOT EXISTS "leadSource"       TEXT,
  ADD COLUMN IF NOT EXISTS "leadMedium"       TEXT,
  ADD COLUMN IF NOT EXISTS "leadCampaign"     TEXT,
  ADD COLUMN IF NOT EXISTS "sourceConfidence" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceDetail"     JSONB;

-- Weekly reporting counts leads by source and by answer.
CREATE INDEX IF NOT EXISTS "Lead_leadSource_createdAt_idx" ON "public"."Lead" ("leadSource", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_heardAbout_createdAt_idx" ON "public"."Lead" ("heardAbout", "createdAt");
