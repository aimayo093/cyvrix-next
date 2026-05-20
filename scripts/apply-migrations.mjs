import postgres from "postgres";
import fs from "fs";
import path from "path";

// Use directUrl if available for migrations, else DATABASE_URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("No database connection string found in environment variables.");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: "require",
});

async function main() {
  const migrationsDir = path.join(process.cwd(), "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith(".sql")) {
      console.log(`Applying migration: ${file}...`);
      const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      
      try {
        // postgres lib supports multi-statement queries in a single string
        await sql.unsafe(content);
        console.log(`Successfully applied ${file}`);
      } catch (error) {
        console.error(`Error applying ${file}:`, error);
      }
    }
  }
}

main()
  .then(async () => {
    await sql.end();
  })
  .catch(async (e) => {
    console.error(e);
    await sql.end();
    process.exit(1);
  });
