// Import 50 Pexels images each for bikinis and lingerie (page 2)
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.split("=").slice(1).join("=").trim()])
);

const PEXELS_KEY = env.PEXELS_API_KEY;
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_SERVICE_KEY = "sb_secret_f8T3RAMmcuuAJ2F99z68-w_2UiamJYy";

const TARGETS = [
  { slug: "bikinis",  query: "bikini beach summer" },
  { slug: "lingerie", query: "lingerie fashion boudoir" },
];

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=50&page=2&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) { console.error(`Pexels error:`, res.status); return []; }
  const data = await res.json();
  return data.photos || [];
}

async function insertImages(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/generated_images?on_conflict=image_url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error("Supabase error:", await res.text()); return 0; }
  return (await res.json()).length;
}

async function main() {
  if (!PEXELS_KEY) { console.error("❌ PEXELS_API_KEY not found in .env.local!"); process.exit(1); }
  console.log("📸 Importing bikini + lingerie from Pexels (page 2)...\n");
  let total = 0;

  for (const { slug, query } of TARGETS) {
    console.log(`[${slug}] Fetching from Pexels...`);
    const photos = await fetchPexels(query);
    console.log(`  Found: ${photos.length}`);
    if (photos.length > 0) {
      const rows = photos.map((p) => ({ prompt: p.alt || query, image_url: p.src.large, status: "pending_review", category_slug: slug }));
      const count = await insertImages(rows);
      console.log(`  Inserted: ${count}`);
      total += count;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Done! Total inserted: ${total}`);
}

main().catch(console.error);
