require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const policies = await prisma.$queryRaw`
    SELECT tablename, policyname, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('pages', 'profiles', 'site_settings', 'support_tickets', 'ticket_messages')
  `;
  console.log(JSON.stringify(policies, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
