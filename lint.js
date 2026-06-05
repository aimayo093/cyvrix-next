require('dotenv').config();
const { execSync } = require('child_process');
try {
  const url = process.env.DATABASE_URL;
  const output = execSync(`npx supabase db lint --db-url "${url}"`, { encoding: 'utf-8' });
  console.log('--- LINT OUTPUT ---');
  console.log(output);
} catch (e) {
  console.log('Error executing lint:');
  if (e.stdout) console.log(e.stdout.toString());
  if (e.stderr) console.error(e.stderr.toString());
}
