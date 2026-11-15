-- Procurement, tenders and partnerships: Phase 1 foundation.
-- Design: docs/procurement/02-design.md. Founder decisions D5, D6, D7, D11
-- (15 November 2026).
--
-- Additive only. No existing column is changed. Contact gains one nullable
-- column. Every new table is server-only: row-level security on, no policies,
-- and the API roles' grants revoked (the AgentDraft pattern).
--
-- Nothing here stores a portal password or other credential (D7).

-- Organisations: research targets, buyers, principal contractors, manufacturers.
CREATE TABLE IF NOT EXISTS "public"."Organisation" (
  "id"               TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "website"          TEXT,
  -- A field_engineering, B government_defence, C manufacturer, D enterprise_distribution (spec section 32), plus buyer.
  "categories"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- 1 highest, 5 lowest.
  "priority"         INTEGER NOT NULL DEFAULT 3,
  "isResearchTarget" BOOLEAN NOT NULL DEFAULT false,
  -- Set only when the organisation becomes a client (D6: kept apart from ClientCompany).
  "clientCompanyId"  TEXT,
  "notes"            TEXT,
  "sourceUrl"        TEXT,
  "verifiedAt"       TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Organisation_priority_check" CHECK ("priority" BETWEEN 1 AND 5),
  CONSTRAINT "Organisation_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId")
    REFERENCES "public"."ClientCompany" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Organisation_name_lower_key" ON "public"."Organisation" (lower("name"));

ALTER TABLE "public"."Contact" ADD COLUMN IF NOT EXISTS "organisationId" TEXT;
DO $$
BEGIN
  ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_organisationId_fkey"
    FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- Where opportunities come from (spec section 5). Adapters arrive in Phase 2;
-- every source starts disabled.
CREATE TABLE IF NOT EXISTS "public"."OpportunitySource" (
  "key"           TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "kind"          TEXT NOT NULL,
  "enabled"       BOOLEAN NOT NULL DEFAULT false,
  "cursor"        TEXT,
  "lastRunAt"     TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "health"        TEXT NOT NULL DEFAULT 'unknown',
  "licence"       TEXT,
  "notes"         TEXT,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunitySource_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "OpportunitySource_kind_check" CHECK ("kind" IN ('official_api', 'report', 'agent', 'website', 'manual', 'portal')),
  CONSTRAINT "OpportunitySource_health_check" CHECK ("health" IN ('unknown', 'ok', 'degraded', 'failing'))
);
INSERT INTO "public"."OpportunitySource" ("key", "name", "kind", "licence", "notes") VALUES
  ('fts', 'Find a Tender', 'official_api', 'Open Government Licence v3.0', 'OCDS release packages; primary record under the Procurement Act 2023'),
  ('s2w', 'Sell2Wales', 'official_api', 'Open Government Licence', 'OCDS API with monthly download fallback'),
  ('pcs', 'Public Contracts Scotland', 'official_api', NULL, 'OCDS Web API'),
  ('cf', 'Contracts Finder', 'official_api', NULL, 'V2 search; below-threshold and continuing procurements'),
  ('chatgpt_task', 'ChatGPT 9 am report (Cyvrix UK Daily Leads)', 'report', NULL, 'Imported by a person; never inferred'),
  ('openai_independent', 'Independent OpenAI research', 'report', NULL, 'Not the ChatGPT task; not approved (D1)'),
  ('paperclip', 'Paperclip agent research', 'agent', NULL, NULL),
  ('website', 'Website enquiry', 'website', NULL, 'Promoted from a Lead'),
  ('manual', 'Manual entry', 'manual', NULL, NULL),
  ('supplier_portal', 'Supplier or partner portal', 'portal', NULL, NULL)
ON CONFLICT ("key") DO NOTHING;

CREATE TABLE IF NOT EXISTS "public"."IngestionRun" (
  "id"          TEXT NOT NULL,
  "sourceKey"   TEXT NOT NULL,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"  TIMESTAMP(3),
  "status"      TEXT NOT NULL DEFAULT 'running',
  "fetched"     INTEGER NOT NULL DEFAULT 0,
  "created"     INTEGER NOT NULL DEFAULT 0,
  "updated"     INTEGER NOT NULL DEFAULT 0,
  "errorClass"  TEXT,
  "errorDetail" TEXT,
  "startedById" TEXT,
  CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IngestionRun_status_check" CHECK ("status" IN ('running', 'succeeded', 'failed', 'retry', 'dead_letter')),
  CONSTRAINT "IngestionRun_sourceKey_fkey" FOREIGN KEY ("sourceKey") REFERENCES "public"."OpportunitySource" ("key") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "IngestionRun_sourceKey_startedAt_idx" ON "public"."IngestionRun" ("sourceKey", "startedAt");

-- Raw notices as received. Contact points are removed before storage (03 section 3).
CREATE TABLE IF NOT EXISTS "public"."ProcurementNotice" (
  "id"         TEXT NOT NULL,
  "sourceKey"  TEXT NOT NULL,
  "ocid"       TEXT NOT NULL,
  "releaseId"  TEXT NOT NULL,
  "noticeId"   TEXT,
  "stage"      TEXT,
  "sha256"     TEXT NOT NULL,
  "raw"        JSONB NOT NULL,
  "runId"      TEXT,
  "fetchedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcurementNotice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProcurementNotice_sourceKey_fkey" FOREIGN KEY ("sourceKey") REFERENCES "public"."OpportunitySource" ("key") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProcurementNotice_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."IngestionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementNotice_source_ocid_release_key" ON "public"."ProcurementNotice" ("sourceKey", "ocid", "releaseId");

-- The one pipeline record for commercial leads, tenders, partnerships and assignments.
CREATE TABLE IF NOT EXISTS "public"."Opportunity" (
  "id"                      TEXT NOT NULL,
  "kind"                    TEXT NOT NULL,
  "status"                  TEXT NOT NULL,
  "title"                   TEXT NOT NULL,
  "summary"                 TEXT,
  "buyerOrganisationId"     TEXT,
  "origin"                  TEXT NOT NULL,
  "ocid"                    TEXT,
  "deadlineAt"              TIMESTAMP(3),
  "clarificationDeadlineAt" TIMESTAMP(3),
  "valueMin"                DECIMAL(14,2),
  "valueMax"                DECIMAL(14,2),
  "currency"                TEXT NOT NULL DEFAULT 'GBP',
  "region"                  TEXT,
  "cpv"                     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- A confirmed buying opportunity, as opposed to an inferred prospect (spec section 4).
  "confirmedBuying"         BOOLEAN NOT NULL DEFAULT false,
  "leadId"                  TEXT,
  "paperclipIssueId"        TEXT,
  "createdById"             TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Opportunity_kind_check" CHECK ("kind" IN ('commercial', 'tender', 'partnership', 'assignment')),
  CONSTRAINT "Opportunity_value_check" CHECK ("valueMin" IS NULL OR "valueMax" IS NULL OR "valueMin" <= "valueMax"),
  CONSTRAINT "Opportunity_buyerOrganisationId_fkey" FOREIGN KEY ("buyerOrganisationId") REFERENCES "public"."Organisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Opportunity_origin_fkey" FOREIGN KEY ("origin") REFERENCES "public"."OpportunitySource" ("key") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_ocid_key" ON "public"."Opportunity" ("ocid") WHERE "ocid" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Opportunity_status_deadlineAt_idx" ON "public"."Opportunity" ("status", "deadlineAt");
CREATE INDEX IF NOT EXISTS "Opportunity_kind_updatedAt_idx" ON "public"."Opportunity" ("kind", "updatedAt");

CREATE TABLE IF NOT EXISTS "public"."OpportunityEvidence" (
  "id"            TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "kind"          TEXT NOT NULL,
  "url"           TEXT,
  "quote"         TEXT,
  "retrievedAt"   TIMESTAMP(3),
  "createdById"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpportunityEvidence_kind_check" CHECK ("kind" IN ('notice', 'web', 'report', 'email', 'document', 'note')),
  CONSTRAINT "OpportunityEvidence_has_content" CHECK ("url" IS NOT NULL OR "quote" IS NOT NULL),
  CONSTRAINT "OpportunityEvidence_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OpportunityEvidence_opportunityId_idx" ON "public"."OpportunityEvidence" ("opportunityId");

-- Company knowledge base (spec section 9). Files live in the private bucket below (D5).
CREATE TABLE IF NOT EXISTS "public"."CompanyDocument" (
  "id"             TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "kind"           TEXT NOT NULL,
  "classification" TEXT NOT NULL DEFAULT 'internal',
  "owner"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompanyDocument_classification_check" CHECK ("classification" IN ('public', 'internal', 'confidential'))
);

CREATE TABLE IF NOT EXISTS "public"."CompanyDocumentVersion" (
  "id"           TEXT NOT NULL,
  "documentId"   TEXT NOT NULL,
  "version"      INTEGER NOT NULL,
  -- What this file is (spec section 9): an AI draft is not evidence; a certificate must be independently issued.
  "status"       TEXT NOT NULL,
  "effectiveAt"  TIMESTAMP(3),
  "expiresAt"    TIMESTAMP(3),
  "storagePath"  TEXT NOT NULL,
  "filename"     TEXT NOT NULL,
  "sha256"       TEXT NOT NULL,
  "sizeBytes"    INTEGER NOT NULL,
  "scan"         JSONB NOT NULL DEFAULT '{}',
  "source"       TEXT,
  "uploadedById" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyDocumentVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompanyDocumentVersion_status_check" CHECK ("status" IN ('verified', 'ai_draft', 'founder_approved', 'certified_evidence', 'superseded')),
  CONSTRAINT "CompanyDocumentVersion_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "CompanyDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."CompanyDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyDocumentVersion_documentId_version_key" ON "public"."CompanyDocumentVersion" ("documentId", "version");

-- Verified facts used to fill forms. publicAllowed is false for anything withheld (DECISIONS section 4).
CREATE TABLE IF NOT EXISTS "public"."CompanyFact" (
  "key"                TEXT NOT NULL,
  "label"              TEXT NOT NULL,
  "value"              TEXT NOT NULL,
  "evidenceVersionId"  TEXT,
  "verifiedAt"         TIMESTAMP(3),
  "verifiedById"       TEXT,
  "publicAllowed"      BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyFact_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "CompanyFact_key_check" CHECK ("key" ~ '^[a-z][a-z0-9_]{1,63}$'),
  CONSTRAINT "CompanyFact_evidenceVersionId_fkey" FOREIGN KEY ("evidenceVersionId") REFERENCES "public"."CompanyDocumentVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- An exact set of files for one destination. Locking fixes its manifest hash.
CREATE TABLE IF NOT EXISTS "public"."Package" (
  "id"             TEXT NOT NULL,
  "opportunityId"  TEXT NOT NULL,
  "version"        INTEGER NOT NULL,
  "destination"    TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'draft',
  "priceSnapshot"  JSONB,
  "declarations"   JSONB NOT NULL DEFAULT '[]',
  "manifestSha256" TEXT,
  "createdById"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt"       TIMESTAMP(3),
  CONSTRAINT "Package_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Package_status_check" CHECK ("status" IN ('draft', 'locked', 'superseded')),
  CONSTRAINT "Package_locked_has_manifest" CHECK ("status" = 'draft' OR "manifestSha256" IS NOT NULL),
  CONSTRAINT "Package_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Package_opportunityId_version_key" ON "public"."Package" ("opportunityId", "version");

CREATE TABLE IF NOT EXISTS "public"."PackageItem" (
  "id"                TEXT NOT NULL,
  "packageId"         TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "label"             TEXT NOT NULL,
  "sha256"            TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PackageItem_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "public"."CompanyDocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PackageItem_packageId_documentVersionId_key" ON "public"."PackageItem" ("packageId", "documentVersionId");

-- A locked package's items cannot change: that is what an approval is bound to.
CREATE OR REPLACE FUNCTION "public"."package_item_guard"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  pkg_status TEXT;
BEGIN
  SELECT "status" INTO pkg_status FROM "public"."Package"
   WHERE "id" = COALESCE(NEW."packageId", OLD."packageId");
  IF pkg_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'package % is %, its items cannot change', COALESCE(NEW."packageId", OLD."packageId"), pkg_status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END
$$;
DROP TRIGGER IF EXISTS "PackageItem_guard" ON "public"."PackageItem";
CREATE TRIGGER "PackageItem_guard" BEFORE INSERT OR UPDATE OR DELETE ON "public"."PackageItem"
  FOR EACH ROW EXECUTE FUNCTION "public"."package_item_guard"();

-- Founder approval (spec section 15). An approval binds one manifest hash.
CREATE TABLE IF NOT EXISTS "public"."ApprovalRequest" (
  "id"             TEXT NOT NULL,
  "opportunityId"  TEXT NOT NULL,
  "packageId"      TEXT NOT NULL,
  "actionType"     TEXT NOT NULL,
  "destination"    TEXT NOT NULL,
  "manifestSha256" TEXT NOT NULL,
  "priceSnapshot"  JSONB,
  "declarations"   JSONB NOT NULL DEFAULT '[]',
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "requestedById"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalRequest_actionType_check" CHECK ("actionType" IN ('submit_tender', 'submit_application', 'register_account', 'send_email', 'send_quote', 'accept_contract', 'accept_assignment', 'spend')),
  CONSTRAINT "ApprovalRequest_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'revision_requested', 'expired', 'superseded')),
  CONSTRAINT "ApprovalRequest_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_createdAt_idx" ON "public"."ApprovalRequest" ("status", "createdAt");
-- One open request per package.
CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalRequest_open_per_package" ON "public"."ApprovalRequest" ("packageId") WHERE "status" = 'pending';

CREATE TABLE IF NOT EXISTS "public"."ApprovalDecision" (
  "id"             TEXT NOT NULL,
  "requestId"      TEXT NOT NULL,
  "decision"       TEXT NOT NULL,
  "manifestSha256" TEXT NOT NULL,
  "decidedById"    TEXT NOT NULL,
  "note"           TEXT,
  -- When the second-factor code was checked for this decision.
  "stepUpAt"       TIMESTAMP(3) NOT NULL,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalDecision_decision_check" CHECK ("decision" IN ('approved', 'rejected', 'revision_requested')),
  CONSTRAINT "ApprovalDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."ApprovalRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalDecision_requestId_key" ON "public"."ApprovalDecision" ("requestId");

-- How an approved action was carried out (spec section 16). One use per approval.
CREATE TABLE IF NOT EXISTS "public"."ExecutionRecord" (
  "id"                      TEXT NOT NULL,
  "approvalDecisionId"      TEXT NOT NULL,
  "opportunityId"           TEXT NOT NULL,
  "actionType"              TEXT NOT NULL,
  "mode"                    TEXT NOT NULL,
  "outcome"                 TEXT NOT NULL DEFAULT 'pending',
  "portalReference"         TEXT,
  "submittedManifestSha256" TEXT NOT NULL,
  "recordedById"            TEXT,
  "startedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"              TIMESTAMP(3),
  CONSTRAINT "ExecutionRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExecutionRecord_mode_check" CHECK ("mode" IN ('manual', 'human_assisted', 'api', 'browser')),
  CONSTRAINT "ExecutionRecord_outcome_check" CHECK ("outcome" IN ('pending', 'confirmed', 'rejected', 'ambiguous')),
  CONSTRAINT "ExecutionRecord_approvalDecisionId_fkey" FOREIGN KEY ("approvalDecisionId") REFERENCES "public"."ApprovalDecision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ExecutionRecord_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExecutionRecord_approvalDecisionId_key" ON "public"."ExecutionRecord" ("approvalDecisionId");
-- No second confirmed action of the same type on one opportunity (duplicate submission).
CREATE UNIQUE INDEX IF NOT EXISTS "ExecutionRecord_one_confirmed" ON "public"."ExecutionRecord" ("opportunityId", "actionType") WHERE "outcome" = 'confirmed';

CREATE TABLE IF NOT EXISTS "public"."Receipt" (
  "id"                TEXT NOT NULL,
  "executionId"       TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "note"              TEXT,
  "receivedAt"        TIMESTAMP(3) NOT NULL,
  "createdById"       TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Receipt_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."ExecutionRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Receipt_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "public"."CompanyDocumentVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Operating costs (spec section 23). Measured or estimated, never invented.
CREATE TABLE IF NOT EXISTS "public"."CostEntry" (
  "id"            TEXT NOT NULL,
  "date"          DATE NOT NULL,
  "agent"         TEXT,
  "integration"   TEXT,
  "opportunityId" TEXT,
  "amountMinor"   INTEGER NOT NULL,
  "currency"      TEXT NOT NULL DEFAULT 'GBP',
  "basis"         TEXT NOT NULL,
  "note"          TEXT,
  "createdById"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CostEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CostEntry_basis_check" CHECK ("basis" IN ('measured', 'estimate')),
  CONSTRAINT "CostEntry_amount_check" CHECK ("amountMinor" >= 0),
  CONSTRAINT "CostEntry_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CostEntry_date_idx" ON "public"."CostEntry" ("date");

-- Decisions and receipts are records, not working data: never edited or deleted.
CREATE OR REPLACE FUNCTION "public"."procurement_refuse_change"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION '% rows cannot be changed or deleted', TG_TABLE_NAME;
END
$$;
DROP TRIGGER IF EXISTS "ApprovalDecision_immutable" ON "public"."ApprovalDecision";
CREATE TRIGGER "ApprovalDecision_immutable" BEFORE UPDATE OR DELETE ON "public"."ApprovalDecision"
  FOR EACH ROW EXECUTE FUNCTION "public"."procurement_refuse_change"();
DROP TRIGGER IF EXISTS "Receipt_immutable" ON "public"."Receipt";
CREATE TRIGGER "Receipt_immutable" BEFORE UPDATE OR DELETE ON "public"."Receipt"
  FOR EACH ROW EXECUTE FUNCTION "public"."procurement_refuse_change"();

-- A stored file's identity cannot change after upload; only its status may.
CREATE OR REPLACE FUNCTION "public"."document_version_guard"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'document versions cannot be deleted';
  END IF;
  IF NEW."sha256" <> OLD."sha256" OR NEW."storagePath" <> OLD."storagePath"
     OR NEW."documentId" <> OLD."documentId" OR NEW."version" <> OLD."version" THEN
    RAISE EXCEPTION 'a document version''s file cannot be replaced; upload a new version';
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS "CompanyDocumentVersion_guard" ON "public"."CompanyDocumentVersion";
CREATE TRIGGER "CompanyDocumentVersion_guard" BEFORE UPDATE OR DELETE ON "public"."CompanyDocumentVersion"
  FOR EACH ROW EXECUTE FUNCTION "public"."document_version_guard"();

-- Server only, as AgentDraft.
DO $$
DECLARE
  tbl TEXT;
  role_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['Organisation', 'OpportunitySource', 'IngestionRun', 'ProcurementNotice', 'Opportunity',
    'OpportunityEvidence', 'CompanyDocument', 'CompanyDocumentVersion', 'CompanyFact', 'Package', 'PackageItem',
    'ApprovalRequest', 'ApprovalDecision', 'ExecutionRecord', 'Receipt', 'CostEntry'] LOOP
    EXECUTE format('ALTER TABLE "public".%I ENABLE ROW LEVEL SECURITY', tbl);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE "public".%I FROM %I', tbl, role_name);
      END IF;
    END LOOP;
  END LOOP;
END
$$;

-- The functions above are trigger-only.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'public'] LOOP
    IF role_name = 'public' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."package_item_guard"() FROM %s', CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END);
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."procurement_refuse_change"() FROM %s', CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END);
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."document_version_guard"() FROM %s', CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END);
    END IF;
  END LOOP;
END
$$;

-- Private bucket for company documents (D5). No storage policies: only the
-- server's service role can read or write; people get five-minute signed links.
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit")
VALUES ('company-documents', 'company-documents', false, 5242880)
ON CONFLICT ("id") DO NOTHING;
