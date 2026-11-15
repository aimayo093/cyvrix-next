-- Procurement hardening after review of PR 14 (Cubic and Codex).
--
-- Moves guarantees from application code into the database, so another
-- server-side writer cannot bypass them:
--   1. A locked or superseded package is frozen: no content change, no return
--      to draft, no deletion. Status moves only draft -> locked -> superseded.
--   2. Package items: both the old and the new package must be drafts (an item
--      cannot be moved out of a locked package), and an item's hash must equal
--      its document version's hash.
--   3. A stored document version: every column except status is frozen.
--   4. Opportunity.status must be a known lifecycle state; statusChangedAt
--      records when it last moved (used to scope "this round" of a submission).
--   5. Submissions: at most one unresolved (pending or unclear) attempt per
--      opportunity and action, enforced here. The old "one confirmed per
--      opportunity and action" index is replaced: it made a partnership that
--      was rejected and remediated impossible to resubmit. Duplicate confirmed
--      submissions within a round are refused by lib/procurement/service.ts,
--      and the unresolved-attempt index makes those starts strictly sequential.
--   6. The company-documents bucket is forced private with its size limit,
--      even if a bucket of that name already existed.
--
-- Additive in effect: no data is changed (production has no procurement
-- packages, documents or executions yet).

-- 1. Packages
CREATE OR REPLACE FUNCTION "public"."package_guard"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'draft' THEN
      RAISE EXCEPTION 'package % is %, it cannot be deleted', OLD."id", OLD."status";
    END IF;
    RETURN OLD;
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
       (OLD."status" = 'draft' AND NEW."status" = 'locked')
    OR (OLD."status" = 'locked' AND NEW."status" = 'superseded')
  ) THEN
    RAISE EXCEPTION 'package % cannot move from % to %', OLD."id", OLD."status", NEW."status";
  END IF;

  IF OLD."status" <> 'draft' AND (
       NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."opportunityId" IS DISTINCT FROM OLD."opportunityId"
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."destination" IS DISTINCT FROM OLD."destination"
    OR NEW."priceSnapshot" IS DISTINCT FROM OLD."priceSnapshot"
    OR NEW."declarations" IS DISTINCT FROM OLD."declarations"
    OR NEW."manifestSha256" IS DISTINCT FROM OLD."manifestSha256"
    OR NEW."createdById" IS DISTINCT FROM OLD."createdById"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
    OR NEW."lockedAt" IS DISTINCT FROM OLD."lockedAt"
  ) THEN
    RAISE EXCEPTION 'package % is %, its content cannot change; revise it instead', OLD."id", OLD."status";
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS "Package_guard" ON "public"."Package";
CREATE TRIGGER "Package_guard" BEFORE UPDATE OR DELETE ON "public"."Package"
  FOR EACH ROW EXECUTE FUNCTION "public"."package_guard"();

-- 2. Package items
CREATE OR REPLACE FUNCTION "public"."package_item_guard"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  pkg_status TEXT;
  version_hash TEXT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT "status" INTO pkg_status FROM "public"."Package" WHERE "id" = OLD."packageId";
    -- A cascade from deleting a draft package finds no row; that is allowed.
    IF pkg_status IS NOT NULL AND pkg_status <> 'draft' THEN
      RAISE EXCEPTION 'package % is %, its items cannot change', OLD."packageId", pkg_status;
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT "status" INTO pkg_status FROM "public"."Package" WHERE "id" = NEW."packageId";
    IF pkg_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'package % is %, its items cannot change', NEW."packageId", pkg_status;
    END IF;
    SELECT "sha256" INTO version_hash FROM "public"."CompanyDocumentVersion" WHERE "id" = NEW."documentVersionId";
    IF version_hash IS DISTINCT FROM NEW."sha256" THEN
      RAISE EXCEPTION 'a package item''s hash must match its document version';
    END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END
$$;

-- 3. Document versions: everything but status is frozen.
CREATE OR REPLACE FUNCTION "public"."document_version_guard"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'document versions cannot be deleted';
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."documentId" IS DISTINCT FROM OLD."documentId"
     OR NEW."version" IS DISTINCT FROM OLD."version"
     OR NEW."effectiveAt" IS DISTINCT FROM OLD."effectiveAt"
     OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
     OR NEW."storagePath" IS DISTINCT FROM OLD."storagePath"
     OR NEW."filename" IS DISTINCT FROM OLD."filename"
     OR NEW."sha256" IS DISTINCT FROM OLD."sha256"
     OR NEW."sizeBytes" IS DISTINCT FROM OLD."sizeBytes"
     OR NEW."scan" IS DISTINCT FROM OLD."scan"
     OR NEW."source" IS DISTINCT FROM OLD."source"
     OR NEW."uploadedById" IS DISTINCT FROM OLD."uploadedById"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'a stored document version cannot be replaced or edited; upload a new version';
  END IF;
  RETURN NEW;
END
$$;

-- 4. Opportunity status
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
DO $$ BEGIN
  ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_status_check" CHECK ("status" IN (
    'AccountCreated', 'ActiveOpportunityMonitoring', 'AdditionalInformationRequired', 'ApplicationPreparation',
    'ApplicationSubmitted', 'ApprovedForSubmission', 'ApprovedPartner', 'Archived', 'AssignmentApproval',
    'AssignmentReceived', 'AwaitingBidDecision', 'AwaitingFinalApproval', 'AwaitingOutreachApproval',
    'AwaitingRegistrationApproval', 'Awarded', 'ClarificationRequired', 'CommercialAssessment', 'Contacted',
    'ContractReview', 'Discovered', 'EligibilityReview', 'Ineligible', 'Monitoring', 'NoBid', 'NoPublicProgramme',
    'OperationalHandover', 'OutreachPreparation', 'PreparingBid', 'ProgrammeVerified', 'Qualified', 'QualityReview',
    'RegistrationPrepared', 'RegistrationRequired', 'Rejected', 'RemediationReview', 'Researching', 'ServiceDelivery',
    'SubmissionFailed', 'Submitted', 'Submitting', 'TargetIdentified', 'UnderEvaluation', 'UnderReview',
    'Unsuccessful', 'Validated'
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Submissions
DROP INDEX IF EXISTS "public"."ExecutionRecord_one_confirmed";
CREATE UNIQUE INDEX IF NOT EXISTS "ExecutionRecord_one_unresolved"
  ON "public"."ExecutionRecord" ("opportunityId", "actionType") WHERE "outcome" IN ('pending', 'ambiguous');

-- Trigger-only functions.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."package_guard"() FROM %I', role_name);
    END IF;
  END LOOP;
  REVOKE ALL ON FUNCTION "public"."package_guard"() FROM PUBLIC;
END
$$;

-- 6. Bucket
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit")
VALUES ('company-documents', 'company-documents', false, 5242880)
ON CONFLICT ("id") DO UPDATE SET "public" = false, "file_size_limit" = 5242880;
