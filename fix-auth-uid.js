require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPolicies() {
  const policies = await prisma.$queryRaw`
    SELECT schemaname, tablename, policyname, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%'
           OR qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%');
  `;
  
  let sql = '-- FIX PERFORMANCE ADVISORIES: auth_rls_initplan\n\n';
  
  for (const p of policies) {
    let newQual = p.qual ? p.qual.replace(/auth\.uid\(\)/g, '(select auth.uid())').replace(/auth\.role\(\)/g, '(select auth.role())') : null;
    let newWithCheck = p.with_check ? p.with_check.replace(/auth\.uid\(\)/g, '(select auth.uid())').replace(/auth\.role\(\)/g, '(select auth.role())') : null;
    
    // In PostgreSQL, to alter a policy's USING and WITH CHECK, we can use:
    // ALTER POLICY name ON table USING (new_qual) WITH CHECK (new_with_check);
    // If one is missing, we only update the one that exists, or we update both if both exist.
    // Wait, pg_policies gives us the parsed tree for qual/with_check, which might be hard to just text-replace and run.
    // Actually, pg_policies returns the parsed expression as text (e.g. `(auth.uid() = id)`).
    // Let's just output the CREATE OR REPLACE equivalent? No, DROP and CREATE.
    // But DROP and CREATE requires knowing the cmd (SELECT, ALL, etc.) and roles.
    // ALTER POLICY is safer if we just provide the USING clause.
    
    // Instead of parsing here, let's look at the exact strings returned.
  }
  
  console.log(policies.slice(0, 5)); // Just look at a few to see the format
  await prisma.$disconnect();
}
fixPolicies().catch(console.error);
