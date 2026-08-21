-- PREPARED ONLY: this migration has not been applied to any database.
-- It adds the fields required to manage productised service plans and keeps
-- every existing package unpublished until an administrator reviews it.

ALTER TABLE "public"."ServicePackage"
  ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "recommended_customer_size" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "price_display_mode" TEXT NOT NULL DEFAULT 'REQUEST_PRICING',
  ADD COLUMN IF NOT EXISTS "cta_label" TEXT NOT NULL DEFAULT 'Request pricing',
  ADD COLUMN IF NOT EXISTS "cta_url" TEXT,
  ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ServicePackage_published_sort_order_idx"
  ON "public"."ServicePackage" ("published", "sort_order");

-- Existing package records are retained as drafts. Their public presentation,
-- pricing visibility and CTA must be reviewed in the Service Products CMS.
UPDATE "public"."ServicePackage" SET "published" = false;
