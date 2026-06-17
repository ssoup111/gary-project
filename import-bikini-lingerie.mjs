// Import 50 images each for bikinis and lingerie from Pixabay (page 2)
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
const PIXABAY_KEY = env.PIXABAY_API_KEY;
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_SERVICE_KEY = "sb_secret_f8T3RAMmcuuAJ2F99z68-w_2UiamJYy";

const TARGETS = [
  { slug: "bikinis",  query: "bikini beach summer" },
  { slug: "lingerie", query: "lingerie fashion boudoir" },
];

const PER_PAGE = 50;
const PAGE = 2;

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PER_PAGE}&page=${PAGE}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) { console.error(`Pexels error for "${query}":`, res.status); return []; }
  const data = await res.json();
  return (data.photos || []).map((p) => ({ prompt: p.alt || query, image_url: p.src.large }));
}

async function fetchPixabay(query) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=${PER_PAGE}&page=${PAGE}&orientation=vertical&safesearch=true&image_type=photo`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`Pixabay error for "${query}":`, res.status); return []; }
  const data = await res.json();
  return (data.hits || []).map((p) => ({ prompt: p.tags || query, image_url: p.webformatURL }));
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
  console.log("📸 Importing bikini + lingerie from Pixabay (page 2)...\n");
  let total = 0;

  for (const { slug, query } of TARGETS) {
    console.log(`[${slug}] Fetching from Pixabay...`);
    const photos = await fetchPixabay(query);
    console.log(`  Found: ${photos.length}`);
    if (photos.length > 0) {
      const count = await insertImages(photos.map((p) => ({ ...p, status: "pending_review", category_slug: slug })));
      console.log(`  Inserted: ${count}`);
      total += count;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Done! Total inserted: ${total}`);
  console.log("Go to your admin panel to approve the ones you want live.");
}

main().catch(console.error);
