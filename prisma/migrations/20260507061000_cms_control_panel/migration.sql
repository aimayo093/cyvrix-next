CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST', 'ARCHIVED');
CREATE TYPE "ContentBlockType" AS ENUM ('TEXT', 'RICH_TEXT', 'IMAGE', 'IMAGE_TEXT', 'FEATURE_GRID', 'CTA', 'FAQ', 'TESTIMONIAL', 'STATS', 'SERVICE_CARDS', 'INDUSTRY_CARDS', 'CASE_STUDY_CARDS');

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Industry" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "caption" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus" USING upper(replace("status", ' ', '_'))::"LeadStatus";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEW';

CREATE TABLE IF NOT EXISTS "CmsPage" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "featuredImage" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "openGraphImage" TEXT,
  "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CmsPage_slug_key" ON "CmsPage"("slug");
CREATE INDEX IF NOT EXISTS "CmsPage_status_visible_idx" ON "CmsPage"("status", "visible");

CREATE TABLE IF NOT EXISTS "ContentBlock" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "type" "ContentBlockType" NOT NULL,
  "title" TEXT,
  "content" JSONB NOT NULL DEFAULT '{}',
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContentBlock_pageId_sortOrder_idx" ON "ContentBlock"("pageId", "sortOrder");
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "WebsiteSection" (
  "id" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT,
  "content" JSONB NOT NULL DEFAULT '{}',
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteSection_area_key_key" ON "WebsiteSection"("area", "key");
CREATE INDEX IF NOT EXISTS "WebsiteSection_area_status_visible_idx" ON "WebsiteSection"("area", "status", "visible");

CREATE INDEX IF NOT EXISTS "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_status_priority_createdAt_idx" ON "Ticket"("status", "priority", "createdAt");
CREATE INDEX IF NOT EXISTS "QuoteRequest_status_createdAt_idx" ON "QuoteRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "BlogPost_status_publishAt_idx" ON "BlogPost"("status", "publishAt");
CREATE INDEX IF NOT EXISTS "Service_published_sortOrder_idx" ON "Service"("published", "sortOrder");
CREATE INDEX IF NOT EXISTS "Industry_published_sortOrder_idx" ON "Industry"("published", "sortOrder");
