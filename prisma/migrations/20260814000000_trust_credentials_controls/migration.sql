-- PREPARED ONLY: this migration has not been applied to any database.
-- It makes public trust evidence opt-in, and retires the visibility of existing
-- records until their verification, evidence and publication permission are reviewed.

ALTER TABLE "public"."partner_logos"
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "verification_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "permission_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "permission_evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "permission_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "public_visibility" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."trusted_business_logos"
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "verification_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "permission_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "permission_evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "permission_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "public_visibility" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."compliance_cards"
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "verification_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "permission_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "permission_evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "permission_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "public_visibility" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."Testimonial"
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "verification_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "permission_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "permission_evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "permission_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "public_visibility" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."CaseStudy"
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "verification_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evidence_reviewed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "permission_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "permission_evidence_url" TEXT,
  ADD COLUMN IF NOT EXISTS "permission_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "public_visibility" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."partner_logos"
  ADD CONSTRAINT "partner_logos_verification_status_check"
  CHECK ("verification_status" IN ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED'));

ALTER TABLE "public"."trusted_business_logos"
  ADD CONSTRAINT "trusted_business_logos_verification_status_check"
  CHECK ("verification_status" IN ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED'));

ALTER TABLE "public"."compliance_cards"
  ADD CONSTRAINT "compliance_cards_verification_status_check"
  CHECK ("verification_status" IN ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED'));

ALTER TABLE "public"."Testimonial"
  ADD CONSTRAINT "Testimonial_verification_status_check"
  CHECK ("verification_status" IN ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED'));

ALTER TABLE "public"."CaseStudy"
  ADD CONSTRAINT "CaseStudy_verification_status_check"
  CHECK ("verification_status" IN ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED'));

-- Records that existed before the evidence workflow must be reviewed before
-- publication. This does not delete records; it simply removes public display.
UPDATE "public"."partner_logos" SET "is_visible" = false, "public_visibility" = false;
UPDATE "public"."trusted_business_logos" SET "is_visible" = false, "public_visibility" = false;
UPDATE "public"."compliance_cards" SET "is_visible" = false, "public_visibility" = false;
UPDATE "public"."Testimonial"
  SET "approved" = false, "featured" = false, "public_visibility" = false;
UPDATE "public"."CaseStudy" SET "published" = false, "public_visibility" = false;
