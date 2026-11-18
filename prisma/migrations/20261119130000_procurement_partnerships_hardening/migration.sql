-- Procurement Phase 3, review follow-up (PR 16, Cubic). Additive constraints
-- on tables created by 20261118120000_procurement_partnerships. On production
-- the tables are empty of assessments and programme links, so no row can fail.

-- One opportunity per programme: two people pressing "Pursue" at once get the
-- same record, not two. The partial unique index also serves the lookup.
CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_programmeId_key"
  ON "public"."Opportunity" ("programmeId") WHERE "programmeId" IS NOT NULL;

-- Assessments are immutable, so a bad row could never be corrected: the
-- database holds the same rules as scoreAssessment.
DO $$ BEGIN
  -- A disqualifier always makes the recommendation "disqualified", and only then.
  ALTER TABLE "public"."BidAssessment" ADD CONSTRAINT "BidAssessment_disqualified_matches"
    CHECK ((cardinality("disqualifiers") > 0) = ("recommendation" = 'disqualified'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Scores are an object of whole numbers from 0 to 5.
  ALTER TABLE "public"."BidAssessment" ADD CONSTRAINT "BidAssessment_scores_check"
    CHECK (
      jsonb_typeof("scores") = 'object'
      AND NOT jsonb_path_exists("scores", '$.* ? (@.type() != "number" || @ < 0 || @ > 5 || @ != @.floor())')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
