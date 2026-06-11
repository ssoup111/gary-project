// One-time import: Hot Rods + Supercars only, 40 each from all 3 sources
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
const PIXABAY_KEY  = env.PIXABAY_API_KEY;
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const CATEGORIES = [
  { slug: "classic-cars", query: "classic car" },
  { slug: "supercars", query: "supercar ferrari lamborghini exotic car" },
];

const PER_SOURCE = 35;

async function fetchUnsplash(query, page = 1) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${page}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) { console.error("Unsplash error:", res.status); return []; }
  const data = await res.json();
  return (data.results || []).map((p) => ({ url: p.urls.regular, prompt: p.description || p.alt_description || query }));
}

async function fetchPexels(query, page = 1) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PER_SOURCE}&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) { console.error("Pexels error:", res.status); return []; }
  const data = await res.json();
  return (data.photos || []).map((p) => ({ url: p.src.large, prompt: p.alt || query }));
}

async function fetchPixabay(query, page = 1) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=${PER_SOURCE}&page=${page}&safesearch=true&image_type=photo`;
  const res = await fetch(url);
  if (!res.ok) { console.error("Pixabay error:", res.status); return []; }
  const data = await res.json();
  return (data.hits || []).map((p) => ({ url: p.webformatURL, prompt: p.tags || query }));
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
  let total = 0;
  for (const cat of CATEGORIES) {
    console.log(`\n=== ${cat.slug.toUpperCase()} ===`);

    // Fetch pages 1 and 2 from each source to get fresh results
    const [u1, u2, p1, p2, x1, x2] = await Promise.all([
      fetchUnsplash(cat.query, 1),
      fetchUnsplash(cat.query, 2),
      fetchPexels(cat.query, 1),
      fetchPexels(cat.query, 2),
      fetchPixabay(cat.query, 1),
      fetchPixabay(cat.query, 2),
    ]);
    const unsplash = [...u1, ...u2];
    const pexels   = [...p1, ...p2];
    const pixabay  = [...x1, ...x2];

    const allPhotos = [...unsplash, ...pexels, ...pixabay];
    const rows = allPhotos.map((p) => ({
      prompt: p.prompt,
      image_url: p.url,
      status: "pending_review",
      category_slug: cat.slug,
    }));

    console.log(`  Unsplash: ${unsplash.length} | Pexels: ${pexels.length} | Pixabay: ${pixabay.length}`);
    const count = await insertImages(rows);
    console.log(`  Inserted: ${count} new images`);
    total += count;
  }
  console.log(`\nDone! Total inserted: ${total}`);
}

main().catch(console.error);
