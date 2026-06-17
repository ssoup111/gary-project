// Import anime images from Unsplash + Pexels only (no Pixabay — URLs expire)
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

const UNSPLASH_KEY = env.UNSPLASH_ACCESS_KEY;
const PEXELS_KEY   = env.PEXELS_API_KEY;
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const ANIME_QUERIES = [
  "anime art illustration",
  "anime character digital art",
  "manga anime style artwork",
  "japanese anime fantasy",
];

async function fetchUnsplash(query, page = 1) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${page}&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) { console.error(`Unsplash error for "${query}":`, res.status); return []; }
  const data = await res.json();
  return (data.results || []).map((p) => ({ url: p.urls.regular, prompt: p.description || p.alt_description || query }));
}

async function fetchPexels(query, page = 1) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=50&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) { console.error(`Pexels error for "${query}":`, res.status); return []; }
  const data = await res.json();
  return (data.photos || []).map((p) => ({ url: p.src.large, prompt: p.alt || query }));
}

async function insertImages(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/generated_images?on_conflict=image_url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error("Supabase error:", await res.text()); return 0; }
  const data = await res.json();
  return data.length;
}

async function main() {
  console.log("Importing anime images from Unsplash + Pexels...\n");
  let total = 0;

  for (const query of ANIME_QUERIES) {
    console.log(`Query: "${query}"`);

    const [u1, u2, p1] = await Promise.all([
      fetchUnsplash(query, 1),
      fetchUnsplash(query, 2),
      fetchPexels(query, 1),
    ]);

    const allPhotos = [...u1, ...u2, ...p1];
    const rows = allPhotos.map((p) => ({
      prompt: p.prompt,
      image_url: p.url,
      status: "pending_review",
      category_slug: "anime",
    }));

    console.log(`  Unsplash: ${u1.length + u2.length} | Pexels: ${p1.length}`);
    if (rows.length > 0) {
      const count = await insertImages(rows);
      console.log(`  Inserted: ${count} new images`);
      total += count;
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nDone! Total new anime images inserted: ${total}`);
}

main().catch(console.error);
