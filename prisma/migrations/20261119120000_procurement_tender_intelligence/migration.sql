-- Procurement Phase 4: tender intelligence (docs/procurement, spec sections 11
-- and 13). Founder's go-ahead 18 Nov 2026 for deadline tracking, public tender
-- documents and a requirements checklist. Agent extraction of requirements is
-- not built (personal data in tender documents, D4).
--
-- Additive only: two new tables. Server-only like every procurement table:
-- RLS on, no policies, API roles revoked.

-- A document published with a tender. "listed" comes from the notice and has
-- no copy yet; "stored" has a scanned copy in the private bucket; "refused"
-- could not be fetched (the reason is kept, and the founder can upload it).
-- These are the buyer's documents, never CYVRIX evidence, so they are kept
-- apart from CompanyDocument.
CREATE TABLE IF NOT EXISTS "public"."TenderDocument" (
  "id"            TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "documentType"  TEXT,
  "sourceUrl"     TEXT,
  "origin"        TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'listed',
  "refusal"       TEXT,
  "storagePath"   TEXT,
  "filename"      TEXT,
  "sha256"        TEXT,
  "sizeBytes"     INTEGER,
  "scan"          JSONB NOT NULL DEFAULT '{}',
  "storedAt"      TIMESTAMP(3),
  "createdById"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenderDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenderDocument_origin_check" CHECK ("origin" IN ('notice', 'upload')),
  CONSTRAINT "TenderDocument_status_check" CHECK ("status" IN ('listed', 'stored', 'refused')),
  CONSTRAINT "TenderDocument_stored_has_file" CHECK ("status" <> 'stored' OR ("storagePath" IS NOT NULL AND "sha256" IS NOT NULL AND "sizeBytes" IS NOT NULL)),
  CONSTRAINT "TenderDocument_notice_has_url" CHECK ("origin" <> 'notice' OR "sourceUrl" IS NOT NULL),
  CONSTRAINT "TenderDocument_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenderDocument_opportunity_url_key" ON "public"."TenderDocument" ("opportunityId", "sourceUrl") WHERE "sourceUrl" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TenderDocument_opportunityId_idx" ON "public"."TenderDocument" ("opportunityId");

-- A stored copy is the record of what the buyer published: its file and hash
-- never change and it is never deleted. A listed or refused row may become
-- stored once.
CREATE OR REPLACE FUNCTION "public"."tender_document_guard"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."storagePath" IS NOT NULL THEN
      RAISE EXCEPTION 'A stored tender document cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" = 'stored' AND (
    NEW."status" IS DISTINCT FROM OLD."status" OR
    NEW."storagePath" IS DISTINCT FROM OLD."storagePath" OR
    NEW."sha256" IS DISTINCT FROM OLD."sha256" OR
    NEW."sizeBytes" IS DISTINCT FROM OLD."sizeBytes" OR
    NEW."sourceUrl" IS DISTINCT FROM OLD."sourceUrl" OR
    NEW."opportunityId" IS DISTINCT FROM OLD."opportunityId"
  ) THEN
    RAISE EXCEPTION 'A stored tender document cannot be changed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS "TenderDocument_guard" ON "public"."TenderDocument";
CREATE TRIGGER "TenderDocument_guard" BEFORE UPDATE OR DELETE ON "public"."TenderDocument"
  FOR EACH ROW EXECUTE FUNCTION "public"."tender_document_guard"();

-- One requirement from the tender documents, and whether CYVRIX meets it.
CREATE TABLE IF NOT EXISTS "public"."TenderRequirement" (
  "id"                TEXT NOT NULL,
  "opportunityId"     TEXT NOT NULL,
  -- The buyer's own numbering ("SQ 4.2"), if any.
  "ref"               TEXT,
  "text"              TEXT NOT NULL,
  "kind"              TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'unknown',
  "sourceDocumentId"  TEXT,
  -- Page or section in the source document.
  "location"          TEXT,
  "evidenceVersionId" TEXT,
  "notes"             TEXT,
  "createdById"       TEXT,
  "updatedById"       TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenderRequirement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenderRequirement_kind_check" CHECK ("kind" IN ('mandatory', 'scored', 'information')),
  CONSTRAINT "TenderRequirement_status_check" CHECK ("status" IN ('unknown', 'met', 'partly_met', 'not_met', 'not_applicable')),
  CONSTRAINT "TenderRequirement_text_check" CHECK (char_length("text") BETWEEN 3 AND 2000),
  -- A mandatory requirement is met only with the document that shows it.
  CONSTRAINT "TenderRequirement_met_needs_evidence" CHECK (NOT ("kind" = 'mandatory' AND "status" = 'met') OR "evidenceVersionId" IS NOT NULL),
  CONSTRAINT "TenderRequirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TenderRequirement_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "public"."TenderDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TenderRequirement_evidenceVersionId_fkey" FOREIGN KEY ("evidenceVersionId") REFERENCES "public"."CompanyDocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TenderRequirement_opportunityId_idx" ON "public"."TenderRequirement" ("opportunityId");

DO $$
DECLARE
  tbl TEXT;
  role_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['TenderDocument', 'TenderRequirement'] LOOP
    EXECUTE format('ALTER TABLE "public".%I ENABLE ROW LEVEL SECURITY', tbl);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE "public".%I FROM %I', tbl, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
-- The guard is trigger-only.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'public'] LOOP
    IF role_name = 'public' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."tender_document_guard"() FROM %s', CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END);
    END IF;
  END LOOP;
END $$;
