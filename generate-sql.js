const fs = require('fs');

const content = fs.readFileSync('e:/cyvrix-main/prisma/schema.prisma', 'utf8');

const missingIndexes = [
  { model: 'ClientDocument', field: 'clientCompanyId' },
  { model: 'Contact', field: 'clientCompanyId' },
  { model: 'ContentBlock', field: 'pageId' },
  { model: 'JobApplication', field: 'careerJobId' },
  { model: 'LeadNote', field: 'leadId' },
  { model: 'Proposal', field: 'clientCompanyId' },
  { model: 'Proposal', field: 'quoteRequestId' },
  { model: 'ProposalItem', field: 'proposalId' },
  { model: 'ServicePackage', field: 'serviceId' },
  { model: 'Ticket', field: 'clientCompanyId' },
  { model: 'TicketAttachment', field: 'ticketId' },
  { model: 'TicketMessage', field: 'ticketId' },
  { model: 'User', field: 'clientCompanyId' },
  { model: 'audit_logs', field: 'user_id' },
  { model: 'blog_posts', field: 'author_id' },
  { model: 'blog_posts', field: 'category_id' },
  { model: 'career_applications', field: 'job_id' },
  { model: 'client_companies', field: 'created_by' },
  { model: 'client_companies', field: 'updated_by' },
  { model: 'client_company_users', field: 'company_id' },
  { model: 'client_company_users', field: 'user_id' },
  { model: 'client_documents', field: 'company_id' },
  { model: 'client_documents', field: 'uploaded_by' },
  { model: 'leads', field: 'assigned_to' },
  { model: 'media_assets', field: 'created_by' },
  { model: 'navigation_items', field: 'parent_id' },
  { model: 'notifications', field: 'user_id' },
  { model: 'pages', field: 'created_by' },
  { model: 'profiles', field: 'id' },
  { model: 'quote_requests', field: 'company_id' },
  { model: 'quote_requests', field: 'lead_id' },
  { model: 'service_faqs', field: 'service_id' },
  { model: 'site_settings', field: 'updated_by' },
  { model: 'support_tickets', field: 'assigned_to' },
  { model: 'support_tickets', field: 'client_id' },
  { model: 'support_tickets', field: 'company_id' },
  { model: 'ticket_messages', field: 'ticket_id' },
  { model: 'ticket_messages', field: 'user_id' },
  { model: 'MenuItem', field: 'menuId' },
  { model: 'MenuItem', field: 'parentId' },
  { model: 'FooterLink', field: 'footerSectionId' },
  { model: 'PageSection', field: 'pageId' },
  { model: 'SurveyRequest', field: 'clientCompanyId' },
  { model: 'SurveyResponse', field: 'surveyRequestId' },
  { model: 'WorkOrder', field: 'clientCompanyId' }
];

const missingRLS = [
  'BrandAsset', 'Menu', 'MenuItem', 'FooterSection', 'FooterLink', 'PageSection',
  'PartnerLogo', 'TrustedBusinessLogo', 'ComplianceCard', 'SocialLink',
  'SurveySetting', 'SurveyRequest', 'SurveyResponse', 'WorkOrder'
];

let sql = '-- SUPABASE ADVISORY FIXES SQL SCRIPT\n\n';

function getTableNameAndFieldMap(modelName) {
  let blocks = content.split('model ');
  for (let b of blocks) {
    if (b.trim().startsWith(modelName + ' ')) {
      let mapMatch = b.match(/@@map\("([^"]+)"\)/);
      let tableName = mapMatch ? mapMatch[1] : modelName;
      
      // get column map
      let lines = b.split('\n');
      let fieldMap = {};
      for (let line of lines) {
        if (!line.trim()) continue;
        let parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          let fieldName = parts[0];
          let colMatch = line.match(/@map\("([^"]+)"\)/);
          if (colMatch) {
            fieldMap[fieldName] = colMatch[1];
          }
        }
      }
      return { tableName, fieldMap };
    }
  }
  return { tableName: modelName, fieldMap: {} };
}

sql += '-- 1. Fix Performance Advisories: Missing Indexes on Foreign Keys\n';
for (const idx of missingIndexes) {
  let { tableName, fieldMap } = getTableNameAndFieldMap(idx.model);
  let colName = fieldMap[idx.field] || idx.field;
  let indexName = `${tableName}_${colName}_idx`.toLowerCase();
  sql += `CREATE INDEX IF NOT EXISTS "${indexName}" ON "public"."${tableName}"("${colName}");\n`;
}

sql += '\n-- 2. Fix Security Advisories: Missing Row Level Security (RLS)\n';
for (const model of missingRLS) {
  let { tableName } = getTableNameAndFieldMap(model);
  sql += `ALTER TABLE "public"."${tableName}" ENABLE ROW LEVEL SECURITY;\n`;
  // Add a generic staff policy to avoid full lockout
  sql += `CREATE POLICY "Staff full access on ${tableName}" ON "public"."${tableName}" FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')));\n`;
}

fs.writeFileSync('e:/cyvrix-main/supabase_fixes.sql', sql);
console.log('SQL generated at e:/cyvrix-main/supabase_fixes.sql');
