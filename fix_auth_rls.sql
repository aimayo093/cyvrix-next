-- FIX PERFORMANCE ADVISORIES: auth_rls_initplan
-- This replaces auth.uid() and auth.role() with (select auth.uid()) and (select auth.role())

ALTER POLICY "Users can view own profile" ON "public"."profiles"
  USING (((select auth.uid()) = id));

ALTER POLICY "Admins can view all profiles" ON "public"."profiles"
  USING ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = (select auth.uid())) AND (profiles_1.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Admins full access pages" ON "public"."pages"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'content_manager'::user_role]))))));

ALTER POLICY "Clients view own tickets" ON "public"."support_tickets"
  USING ((client_id = (select auth.uid())));

ALTER POLICY "Clients view own messages" ON "public"."ticket_messages"
  USING ((EXISTS ( SELECT 1
   FROM support_tickets
  WHERE ((support_tickets.id = ticket_messages.ticket_id) AND (support_tickets.client_id = (select auth.uid()))))));

ALTER POLICY "Staff view all tickets" ON "public"."support_tickets"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'support_agent'::user_role]))))));

ALTER POLICY "Staff view all messages" ON "public"."ticket_messages"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'support_agent'::user_role]))))));

ALTER POLICY "Users view own notifications" ON "public"."notifications"
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Staff full access system" ON "public"."site_settings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access audit" ON "public"."audit_logs"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on brand_assets" ON "public"."brand_assets"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on menus" ON "public"."menus"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on menu_items" ON "public"."menu_items"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on footer_sections" ON "public"."footer_sections"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on footer_links" ON "public"."footer_links"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on page_sections" ON "public"."page_sections"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on partner_logos" ON "public"."partner_logos"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on trusted_business_logos" ON "public"."trusted_business_logos"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on compliance_cards" ON "public"."compliance_cards"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on social_links" ON "public"."social_links"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on survey_settings" ON "public"."survey_settings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on survey_requests" ON "public"."survey_requests"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on survey_responses" ON "public"."survey_responses"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on work_orders" ON "public"."work_orders"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on User" ON "public"."User"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on ClientCompany" ON "public"."ClientCompany"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Contact" ON "public"."Contact"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Service" ON "public"."Service"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on ServicePackage" ON "public"."ServicePackage"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Industry" ON "public"."Industry"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on CmsPage" ON "public"."CmsPage"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on ContentBlock" ON "public"."ContentBlock"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on CaseStudy" ON "public"."CaseStudy"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on BlogPost" ON "public"."BlogPost"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on FAQ" ON "public"."FAQ"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on LegalPage" ON "public"."LegalPage"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Testimonial" ON "public"."Testimonial"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Lead" ON "public"."Lead"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on LeadNote" ON "public"."LeadNote"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on QuoteRequest" ON "public"."QuoteRequest"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Proposal" ON "public"."Proposal"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on ProposalItem" ON "public"."ProposalItem"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Ticket" ON "public"."Ticket"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on TicketMessage" ON "public"."TicketMessage"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on TicketAttachment" ON "public"."TicketAttachment"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on KnowledgeBaseArticle" ON "public"."KnowledgeBaseArticle"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on NewsletterSubscriber" ON "public"."NewsletterSubscriber"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on MediaAsset" ON "public"."MediaAsset"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on SiteSetting" ON "public"."SiteSetting"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on CareerJob" ON "public"."CareerJob"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on WebsiteSection" ON "public"."WebsiteSection"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on NavigationItem" ON "public"."NavigationItem"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on AuditLog" ON "public"."AuditLog"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on Notification" ON "public"."Notification"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on ClientDocument" ON "public"."ClientDocument"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on LandingPage" ON "public"."LandingPage"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on JobApplication" ON "public"."JobApplication"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on client_companies" ON "public"."client_companies"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on client_company_users" ON "public"."client_company_users"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on leads" ON "public"."leads"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on quote_requests" ON "public"."quote_requests"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on client_documents" ON "public"."client_documents"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on career_applications" ON "public"."career_applications"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

ALTER POLICY "Staff full access on _prisma_migrations" ON "public"."_prisma_migrations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]))))));

