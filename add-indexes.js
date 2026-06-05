const fs = require('fs');
const path = 'e:/cyvrix-main/prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

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

let blocks = content.split('model ');
for (let i = 1; i < blocks.length; i++) {
  let modelStr = blocks[i];
  let lines = modelStr.split('\n');
  let name = lines[0].split(' ')[0].trim();
  
  let toAdd = missingIndexes.filter(m => m.model === name);
  if (toAdd.length > 0) {
    let newLines = [];
    for (let j = 0; j < lines.length; j++) {
      let line = lines[j];
      if (line.includes('@@schema') || (line.trim() === '}' && !lines.slice(0, j).some(l => l.includes('@@schema')))) {
        for (let idx of toAdd) {
          if (!modelStr.includes('@@index([' + idx.field + '])')) {
            newLines.push('  @@index([' + idx.field + '])');
          }
        }
      }
      newLines.push(line);
    }
    blocks[i] = newLines.join('\n');
  }
}

content = blocks.join('model ');

const missingRLS = [
  'BrandAsset', 'Menu', 'MenuItem', 'FooterSection', 'FooterLink', 'PageSection',
  'PartnerLogo', 'TrustedBusinessLogo', 'ComplianceCard', 'SocialLink',
  'SurveySetting', 'SurveyRequest', 'SurveyResponse', 'WorkOrder'
];

for (const model of missingRLS) {
  const rlsComment = '/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.\n';
  if (!content.includes(rlsComment + 'model ' + model)) {
     content = content.replace('model ' + model + ' {', rlsComment + 'model ' + model + ' {');
  }
}

fs.writeFileSync(path, content);
console.log('schema.prisma updated successfully');
