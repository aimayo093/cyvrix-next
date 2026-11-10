import pg from "pg";
import fs from "fs";
import path from "path";

// Use directUrl if available for migrations, else DATABASE_URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("No database connection string found in environment variables.");
  process.exit(1);
}

// Uses `pg`, which the app already depends on, rather than a second Postgres
// driver kept only for this script. TLS is required, as before; like the
// previous driver's `ssl: "require"`, the server certificate is not pinned.
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  const migrationsDir = path.join(process.cwd(), "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith(".sql")) {
      console.log(`Applying migration: ${file}...`);
      const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      try {
        // A query with no parameters uses the simple protocol, which runs
        // every statement in the file.
        await client.query(content);
        console.log(`Successfully applied ${file}`);
      } catch (error) {
        console.error(`Error applying ${file}:`, error);
      }
    }
  }
}

main()
  .then(async () => {
    await client.end();
  })
  .catch(async (e) => {
    console.error(e);
    await client.end().catch(() => {});
    process.exit(1);
  });
