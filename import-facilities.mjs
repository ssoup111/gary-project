// Import JPay facilities from jpay-facilities.json into Supabase
// Run AFTER scrape-jpay-playwright.mjs has created jpay-facilities.json
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.split("=").slice(1).join("=").trim()])
);

const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// Load scraped facilities
const facilitiesPath = resolve(__dirname, "jpay-facilities.json");
let facilities;
try {
  facilities = JSON.parse(readFileSync(facilitiesPath, "utf8"));
} catch (e) {
  console.error("❌ jpay-facilities.json not found. Run scrape-jpay-playwright.mjs first.");
  process.exit(1);
}

console.log(`📦 Loaded ${facilities.length} facilities from jpay-facilities.json\n`);

// Insert in batches of 100 to avoid request size limits
const BATCH_SIZE = 100;

async function insertBatch(rows) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/facilities?on_conflict=name,state`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=representation,resolution=ignore-duplicates",
      },
      body: JSON.stringify(rows),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }

  const data = await res.json();
  return data.length; // number actually inserted (0 if all duplicates)
}

async function main() {
  console.log("🏛️  Importing facilities into Supabase...\n");

  let totalInserted = 0;
  let totalSkipped = 0;
  const batches = Math.ceil(facilities.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const batch = facilities.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const batchNum = i + 1;

    process.stdout.write(`Batch ${batchNum}/${batches} (${batch.length} rows)... `);

    try {
      const inserted = await insertBatch(batch);
      const skipped = batch.length - inserted;
      totalInserted += inserted;
      totalSkipped += skipped;
      console.log(`✓ ${inserted} inserted, ${skipped} already existed`);
    } catch (err) {
      console.log(`\n❌ Error on batch ${batchNum}: ${err.message}`);
      // Continue with next batch
    }

    // Small delay between batches
    if (i < batches - 1) await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Done!`);
  console.log(`   Inserted: ${totalInserted} new facilities`);
  console.log(`   Skipped:  ${totalSkipped} (already in database)`);
  console.log(`\nYour Supabase facilities table now has all JPay locations.`);
  console.log(`Customers can now select their facility when placing orders.`);
}

main().catch(console.error);
