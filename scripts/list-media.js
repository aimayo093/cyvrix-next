const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function main() {
  console.log("Listing files in public-media...");
  const { data, error } = await supabase.storage.from("public-media").list("");
  
  if (error) {
    console.error("Error listing files:", error);
    return;
  }
  
  for (const file of data) {
    console.log(`- ${file.name}`);
    const { data: publicUrlData } = supabase.storage.from("public-media").getPublicUrl(file.name);
    console.log(`  URL: ${publicUrlData.publicUrl}`);
  }
}

main();
