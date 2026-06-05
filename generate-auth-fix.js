const fs = require('fs');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateFixSql() {
  const policies = await prisma.$queryRaw`
    SELECT schemaname, tablename, policyname, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%'
           OR qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%'
           OR qual LIKE '%current_setting%' OR with_check LIKE '%current_setting%');
  `;
  
  let sql = '-- FIX PERFORMANCE ADVISORIES: auth_rls_initplan\n';
  sql += '-- This replaces auth.<function>() and current_setting() with (select ...)\n\n';
  
  for (const p of policies) {
    let alterStmt = `ALTER POLICY "${p.policyname}" ON "public"."${p.tablename}"`;
    let parts = [];
    if (p.qual) {
      let newQual = p.qual
        .replace(/auth\.uid\(\)/g, '(select auth.uid())')
        .replace(/auth\.role\(\)/g, '(select auth.role())')
        .replace(/current_setting/g, '(select current_setting');
      // Wait, current_setting is usually current_setting('...', true) -> (select current_setting('...', true))
      // A simple regex might be tricky if it's already wrapped in select.
      // But we know it's probably not wrapped.
      // Actually, pg_policies returns it as `current_setting('...'::text, true)`.
      // Replacing `current_setting` with `(select current_setting` and adding `)` at the end of the expression is hard.
      // Let's just fix auth.uid() and auth.role() first since that's what's in the screenshot!
    }
  }
}
