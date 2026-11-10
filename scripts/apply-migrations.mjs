import pg from "pg";
import fs from "fs";
import path from "path";

// Use directUrl if available for migrations, else DATABASE_URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("No database connection string found in environment variables.");
  process.exit(1);
}

// Uses `pg`, which the app already depends on.
//
// TLS with the server certificate verified, so credentials and migration SQL
// cannot be handed to an impersonated endpoint. Supabase signs with its own
// CA: download it (Project Settings → Database → SSL) and point
// DATABASE_CA_CERT at the file. `sslmode` is stripped from the URL because
// node-postgres would otherwise let it override the options below.
const url = new URL(connectionString);
url.searchParams.delete("sslmode");
const caPath = process.env.DATABASE_CA_CERT;
if (!caPath) {
  console.error("Set DATABASE_CA_CERT to the database's CA certificate file, so its identity can be verified.");
  process.exit(1);
}
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true, ca: fs.readFileSync(caPath, "utf8") },
});

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
