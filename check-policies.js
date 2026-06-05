require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPolicies() {
  const result = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN (
      SELECT tablename
      FROM pg_policies
      WHERE schemaname = 'public'
    );
  `;
  console.log('Tables with RLS enabled but NO policies:');
  console.log(result.map(r => r.tablename));
  await prisma.$disconnect();
}
checkPolicies().catch(console.error);
