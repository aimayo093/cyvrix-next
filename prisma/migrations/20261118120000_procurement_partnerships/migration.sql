-- Procurement Phase 3: supplier accounts and partnerships (docs/procurement,
-- spec sections 8, 35-44). Founder decisions 18 Nov 2026: D8 the founder carries
-- out registrations and submissions by hand; D13 a standing policy may pre-approve
-- free, non-binding registrations per portal; D3 the founder enters existing
-- accounts in the admin. D7 (15 Nov): no portal credentials are ever stored.
--
-- Additive only: four new tables and one nullable column on Opportunity.
-- Server-only like every procurement table: RLS on, no policies, API roles revoked.

CREATE TABLE IF NOT EXISTS "public"."SupplierPortal" (
  "id"                  TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "kind"                TEXT NOT NULL,
  "url"                 TEXT NOT NULL,
  "registrationUrl"     TEXT,
  "termsUrl"            TEXT,
  "organisationId"      TEXT,
  -- free | paid | unknown. Only a free portal can have a standing policy.
  "cost"                TEXT NOT NULL DEFAULT 'unknown',
  -- Never true in Phase 3 (D8: by hand). Kept so a portal-by-portal review can record its outcome.
  "automationPermitted" BOOLEAN NOT NULL DEFAULT false,
  -- D13: registrations here with no declarations and no price are pre-approved.
  "standingPolicy"      BOOLEAN NOT NULL DEFAULT false,
  "standingPolicyById"  TEXT,
  "standingPolicyAt"    TIMESTAMP(3),
  -- Which company facts and document kinds a registration here needs (keys and kinds).
  "requiredFacts"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requiredDocuments"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes"               TEXT,
  "sourceUrl"           TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierPortal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierPortal_kind_check" CHECK ("kind" IN ('procurement_portal', 'supplier_portal', 'partner_programme')),
  CONSTRAINT "SupplierPortal_cost_check" CHECK ("cost" IN ('free', 'paid', 'unknown')),
  CONSTRAINT "SupplierPortal_policy_needs_free" CHECK (NOT "standingPolicy" OR "cost" = 'free'),
  CONSTRAINT "SupplierPortal_url_check" CHECK ("url" ~ '^https://'),
  CONSTRAINT "SupplierPortal_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierPortal_name_lower_key" ON "public"."SupplierPortal" (lower("name"));

CREATE TABLE IF NOT EXISTS "public"."SupplierAccount" (
  "id"                 TEXT NOT NULL,
  "portalId"           TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'unknown',
  -- The portal's own reference for CYVRIX (supplier number, DUNS, account id).
  "accountRef"         TEXT,
  "registeredAt"       TIMESTAMP(3),
  "verificationStatus" TEXT,
  -- The business mailbox the account uses (an alias such as tenders@), not a person.
  "contactAlias"       TEXT,
  -- D7: the NAME of the password-manager entry, never a password or secret.
  "credentialLabel"    TEXT,
  "mfaRequired"        BOOLEAN,
  "termsVersion"       TEXT,
  "renewalAt"          TIMESTAMP(3),
  "restrictions"       TEXT,
  "lastAccessAt"       TIMESTAMP(3),
  "approvalDecisionId" TEXT,
  "ownerUserId"        TEXT,
  "notes"              TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierAccount_status_check" CHECK ("status" IN ('active', 'pending', 'incomplete', 'expired', 'rejected', 'suspended', 'not_registered', 'unknown')),
  CONSTRAINT "SupplierAccount_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "public"."SupplierPortal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SupplierAccount_approvalDecisionId_fkey" FOREIGN KEY ("approvalDecisionId") REFERENCES "public"."ApprovalDecision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Spec section 38: never two live accounts on one portal.
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierAccount_one_live_per_portal"
  ON "public"."SupplierAccount" ("portalId") WHERE "status" NOT IN ('not_registered', 'rejected');

CREATE TABLE IF NOT EXISTS "public"."PartnershipProgramme" (
  "id"             TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "categories"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "url"            TEXT,
  "portalId"       TEXT,
  -- Verified only with a source link from the organisation itself (spec section 35).
  "verified"       BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt"     TIMESTAMP(3),
  "sourceUrl"      TEXT,
  "availability"   TEXT NOT NULL DEFAULT 'unconfirmed',
  "fees"           TEXT,
  "requirements"   TEXT,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnershipProgramme_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnershipProgramme_availability_check" CHECK ("availability" IN ('open', 'closed', 'invitation_only', 'unconfirmed')),
  CONSTRAINT "PartnershipProgramme_verified_needs_source" CHECK (NOT "verified" OR "sourceUrl" IS NOT NULL),
  CONSTRAINT "PartnershipProgramme_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnershipProgramme_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "public"."SupplierPortal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PartnershipProgramme_organisationId_idx" ON "public"."PartnershipProgramme" ("organisationId");

-- Bid/no-bid (section 12) and partnership (section 40) assessments. An assessment
-- is a record of judgement at a point in time: a new one is added, never edited.
CREATE TABLE IF NOT EXISTS "public"."BidAssessment" (
  "id"             TEXT NOT NULL,
  "opportunityId"  TEXT NOT NULL,
  "model"          TEXT NOT NULL,
  "weights"        JSONB NOT NULL,
  "scores"         JSONB NOT NULL,
  "disqualifiers"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "assumptions"    TEXT,
  "total"          DECIMAL(5,2) NOT NULL,
  "recommendation" TEXT NOT NULL,
  "authorId"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BidAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BidAssessment_model_check" CHECK ("model" IN ('bid', 'partnership')),
  CONSTRAINT "BidAssessment_recommendation_check" CHECK ("recommendation" IN ('pursue', 'consider', 'decline', 'disqualified')),
  CONSTRAINT "BidAssessment_total_check" CHECK ("total" >= 0 AND "total" <= 100),
  CONSTRAINT "BidAssessment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BidAssessment_opportunityId_createdAt_idx" ON "public"."BidAssessment" ("opportunityId", "createdAt");

ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "programmeId" TEXT;
DO $$ BEGIN
  ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_programmeId_fkey"
    FOREIGN KEY ("programmeId") REFERENCES "public"."PartnershipProgramme" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS "BidAssessment_immutable" ON "public"."BidAssessment";
CREATE TRIGGER "BidAssessment_immutable" BEFORE UPDATE OR DELETE ON "public"."BidAssessment"
  FOR EACH ROW EXECUTE FUNCTION "public"."procurement_refuse_change"();

DO $$
DECLARE
  tbl TEXT;
  role_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['SupplierPortal', 'SupplierAccount', 'PartnershipProgramme', 'BidAssessment'] LOOP
    EXECUTE format('ALTER TABLE "public".%I ENABLE ROW LEVEL SECURITY', tbl);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE "public".%I FROM %I', tbl, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- The public procurement portals identified in Phase 0 (01-assessment.md §5).
-- Costs are as found there: the Defence Sourcing Portal's own guide says there
-- is no charge; the others are not yet checked. No account is recorded: the
-- founder enters real account statuses (D3).
INSERT INTO "public"."SupplierPortal" ("id", "name", "kind", "url", "cost", "requiredFacts", "notes", "sourceUrl") VALUES
  (gen_random_uuid()::text, 'Find a Tender (supplier registration)', 'procurement_portal', 'https://www.find-tender.service.gov.uk/', 'unknown',
   ARRAY['company_name', 'company_number', 'trading_location'], 'Procurement Act 2023 supplier registration and core supplier information. Terms to be read before registering.', 'https://www.find-tender.service.gov.uk/'),
  (gen_random_uuid()::text, 'Sell2Wales', 'procurement_portal', 'https://www.sell2wales.gov.wales/', 'unknown',
   ARRAY['company_name', 'company_number', 'trading_location'], 'Priority region. Terms to be read before registering.', 'https://www.sell2wales.gov.wales/'),
  (gen_random_uuid()::text, 'Public Contracts Scotland', 'procurement_portal', 'https://www.publiccontractsscotland.gov.uk/', 'unknown',
   ARRAY['company_name', 'company_number'], 'Register when a Scottish opportunity is pursued.', 'https://www.publiccontractsscotland.gov.uk/'),
  (gen_random_uuid()::text, 'Defence Sourcing Portal', 'procurement_portal', 'https://contracts.mod.uk/', 'free',
   ARRAY['company_name', 'company_number', 'trading_location'], 'Jaggaer. Registration accepts a portal user agreement and sends a temporary password by email; the MOD guide states no charge.', 'https://www.gov.uk/government/publications/mod-contracting-purchasing-and-finance-e-procurement-system/further-information-on-the-defence-sourcing-portal-dsp'),
  (gen_random_uuid()::text, 'eTendersNI', 'procurement_portal', 'https://www.etendersni.gov.uk/', 'unknown',
   ARRAY['company_name', 'company_number'], 'Register only when a Northern Ireland opportunity is pursued.', 'https://www.etendersni.gov.uk/'),
  (gen_random_uuid()::text, 'Contracts Finder', 'procurement_portal', 'https://www.contractsfinder.service.gov.uk/', 'unknown',
   ARRAY[]::TEXT[], 'An account is only for alerts; reading notices needs none.', 'https://www.contractsfinder.service.gov.uk/')
ON CONFLICT ((lower("name"))) DO NOTHING;
