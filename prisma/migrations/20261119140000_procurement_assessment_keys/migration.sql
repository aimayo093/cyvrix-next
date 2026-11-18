-- Procurement Phase 3, second review follow-up (PR 18, Cubic). An immutable
-- assessment must hold exactly its model's categories, as scoreAssessment
-- requires (lib/procurement/partnerships.ts, WEIGHTS): every category, and
-- no others. The categories are listed here as they are there; a change to
-- WEIGHTS needs a migration changing this function too (the database tests
-- record assessments for both models, so a mismatch fails them).
-- Production has no assessments yet, so no row can fail.

CREATE OR REPLACE FUNCTION "public"."procurement_assessment_keys_ok"("model" TEXT, "scores" JSONB)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN jsonb_typeof("scores") IS DISTINCT FROM 'object' THEN false
    WHEN "model" = 'bid' THEN
      "scores" ?& ARRAY['technical_capability', 'mandatory_eligibility', 'profitability', 'delivery_capacity', 'cash_flow_impact', 'security_and_compliance', 'strategic_value']
      AND (SELECT count(*) FROM jsonb_object_keys("scores")) = 7
    WHEN "model" = 'partnership' THEN
      "scores" ?& ARRAY['revenue_potential', 'existing_technical_capability', 'accessibility_and_eligibility', 'recurring_assignment_potential', 'profitability', 'strategic_importance', 'onboarding_cost']
      AND (SELECT count(*) FROM jsonb_object_keys("scores")) = 7
    ELSE false
  END
$$;

DO $$ BEGIN
  ALTER TABLE "public"."BidAssessment" ADD CONSTRAINT "BidAssessment_scores_keys"
    CHECK ("public"."procurement_assessment_keys_ok"("model", "scores"));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Used only by the check; the API roles never call it.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION "public"."procurement_assessment_keys_ok"(TEXT, JSONB) FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
