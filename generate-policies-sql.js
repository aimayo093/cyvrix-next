const fs = require('fs');

const tablesWithoutPolicies = [
  'User',                 'ClientCompany',
  'Contact',              'Service',
  'ServicePackage',       'Industry',
  'CmsPage',              'ContentBlock',
  'CaseStudy',            'BlogPost',
  'FAQ',                  'LegalPage',
  'Testimonial',          'Lead',
  'LeadNote',             'QuoteRequest',
  'Proposal',             'ProposalItem',
  'Ticket',               'TicketMessage',
  'TicketAttachment',     'KnowledgeBaseArticle',
  'NewsletterSubscriber', 'MediaAsset',
  'SiteSetting',          'CareerJob',
  'WebsiteSection',       'NavigationItem',
  'AuditLog',             'Notification',
  'ClientDocument',       'LandingPage',
  'JobApplication',       'client_companies',
  'client_company_users',
  'leads',                'quote_requests',
  'client_documents',     'career_applications'
]; // Excluded '_prisma_migrations' because Prisma needs full access to it but it usually doesn't need policies if accessed by superuser. Supabase might complain, but whatever, I'll add it too.

tablesWithoutPolicies.push('_prisma_migrations');

let sql = '-- 3. Fix Information Suggestions: Missing RLS Policies on Tables with RLS Enabled\n\n';

for (const tableName of tablesWithoutPolicies) {
  sql += `CREATE POLICY "Staff full access on ${tableName}" ON "public"."${tableName}" FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')));\n`;
}

fs.writeFileSync('e:/cyvrix-main/supabase_policies.sql', sql);
console.log('SQL generated for missing policies');
