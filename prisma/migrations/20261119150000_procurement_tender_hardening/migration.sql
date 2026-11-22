-- Procurement Phase 4, review follow-up (PR 19, Cubic). Database rules for the
-- tender tables created by 20261119120000_procurement_tender_intelligence, so
-- that a server-side writer other than the app's own code cannot break them.
-- On production both tables are empty, so no row can fail.

-- A stored copy carries real file metadata: a SHA-256 hash as the scanner
-- writes it, a size within the 5 MB fetch and scan limit, a filename and the
-- moment it was stored.
DO $$ BEGIN
  ALTER TABLE "public"."TenderDocument" ADD CONSTRAINT "TenderDocument_stored_metadata"
    CHECK (
      "status" <> 'stored' OR (
        "sha256" ~ '^[0-9a-f]{64}$'
        AND "sizeBytes" BETWEEN 1 AND 5242880
        AND "filename" IS NOT NULL AND char_length("filename") BETWEEN 1 AND 125
        AND "storedAt" IS NOT NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A stored copy is the record of what the buyer published: everything about
-- the file and how it was captured is fixed. Only its label (title and
-- document type) may be corrected afterwards.
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
    NEW."opportunityId" IS DISTINCT FROM OLD."opportunityId" OR
    NEW."filename" IS DISTINCT FROM OLD."filename" OR
    NEW."scan" IS DISTINCT FROM OLD."scan" OR
    NEW."storedAt" IS DISTINCT FROM OLD."storedAt" OR
    NEW."origin" IS DISTINCT FROM OLD."origin" OR
    NEW."refusal" IS DISTINCT FROM OLD."refusal" OR
    NEW."createdById" IS DISTINCT FROM OLD."createdById"
  ) THEN
    RAISE EXCEPTION 'A stored tender document cannot be changed';
  END IF;
  RETURN NEW;
END $$;

-- A requirement's source document belongs to the same opportunity.
CREATE OR REPLACE FUNCTION "public"."tender_requirement_source_guard"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW."sourceDocumentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."TenderDocument" d
    WHERE d."id" = NEW."sourceDocumentId" AND d."opportunityId" = NEW."opportunityId"
  ) THEN
    RAISE EXCEPTION 'A requirement''s source document must belong to the same opportunity';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS "TenderRequirement_source_guard" ON "public"."TenderRequirement";
CREATE TRIGGER "TenderRequirement_source_guard" BEFORE INSERT OR UPDATE ON "public"."TenderRequirement"
  FOR EACH ROW EXECUTE FUNCTION "public"."tender_requirement_source_guard"();

-- Both guards are trigger-only: no API role calls them.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'public'] LOOP
    IF role_name = 'public' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."tender_document_guard"() FROM %s', CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END);
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."tender_requirement_source_guard"() FROM %s', CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END);
    END IF;
  END LOOP;
END $$;
