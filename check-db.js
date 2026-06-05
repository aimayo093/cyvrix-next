const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRLS() {
  const result = await prisma.$queryRaw`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
    WHERE nspname = 'public' AND relkind = 'r';
  `;
  console.log('Tables missing RLS:');
  const missing = result.filter(r => !r.relrowsecurity).map(r => r.relname);
  console.log(missing);
  console.log('Total missing:', missing.length);
  
  const fkQuery = await prisma.$queryRaw`
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = tc.table_name::regclass
          AND a.attname = kcu.column_name
      );
  `;
  console.log('Missing FK Indexes:');
  console.log(fkQuery);
  console.log('Total missing FK indexes:', fkQuery.length);

  await prisma.$disconnect();
}
checkRLS().catch(console.error);
