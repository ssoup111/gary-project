// Import anime ILLUSTRATIONS from Pixabay only
// Uses image_type=illustration to exclude photos/cosplay entirely
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

const PIXABAY_KEY   = env.PIXABAY_API_KEY;
const SUPABASE_URL  = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!PIXABAY_KEY)  { console.error("❌ Missing PIXABAY_API_KEY in .env.local"); process.exit(1); }
if (!SUPABASE_KEY) { console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }

// Queries tuned for illustrated/cartoon anime art (not cosplay or photos)
const QUERIES = [
  "anime illustration",
  "manga art",
  "anime character cartoon",
  "anime girl art",
  "anime warrior",
  "dragon ball anime",
  "naruto anime art",
  "anime fantasy art",
];

async function fetchPixabay(query, page = 1) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=illustration` +   // ← illustrations only, no photos
    `&safesearch=true` +
    `&per_page=50` +
    `&page=${page}` +
    `&lang=en`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  Pixabay error for "${query}" (page ${page}): HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return (data.hits || []).map((h) => ({
    url: h.largeImageURL,
    prompt: h.tags || query,
  }));
}

async function insertImages(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/generated_images?on_conflict=image_url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    console.error("  Supabase error:", await res.text());
    return 0;
  }
  const data = await res.json();
  return data.length;
}

async function main() {
  console.log("🎌 Importing anime illustrations from Pixabay...\n");
  let total = 0;

  for (const query of QUERIES) {
    console.log(`Query: "${query}"`);

    // Fetch page 1 only to start — add page 2 later if you want more
    const photos = await fetchPixabay(query, 1);
    console.log(`  Found: ${photos.length} illustrations`);

    if (photos.length === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const rows = photos.map((p) => ({
      prompt: p.prompt,
      image_url: p.url,
      status: "pending_review",
      category_slug: "anime",
    }));

    const count = await insertImages(rows);
    console.log(`  Inserted: ${count} new images`);
    total += count;

    // 1 second between queries to avoid rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n✅ Done! Total new anime illustrations inserted: ${total}`);
  console.log(`   Go to your admin panel to approve the ones you like.`);
}

main().catch(console.error);
