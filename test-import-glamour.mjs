/**
 * test-import-glamour.mjs
 *
 * Test import — 10 images per search term per source for female-models category.
 * Uses professional/editorial search terms targeting high-quality glamour photography.
 * Pages 5+ to avoid overlap with any previous imports.
 *
 * Run: cd ~/Desktop/jpix && node test-import-glamour.mjs
 * Then review in admin panel under female-models.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.split("=").slice(1).join("=").trim()])
);

const PIXABAY_KEY = env.PIXABAY_API_KEY;
const PEXELS_KEY  = env.PEXELS_API_KEY;
const UNSPLASH_KEY = env.UNSPLASH_ACCESS_KEY;
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const CATEGORY = "female-models";
const PER_TERM = 10;
const PAGE = 1; // page 1 is fine — these search terms are new so results will be fresh

const SEARCH_TERMS = [
  "lingerie woman bedroom",
  "glamour woman portrait blonde",
  "boudoir woman studio",
  "lingerie woman stockings heels",
  "woman black lingerie interior",
  "lingerie woman back pose stockings",
  "woman lingerie fashion portrait",
  "boudoir woman black lingerie",
  "woman lingerie editorial",
];

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchPixabay(query) {
  // category=fashion restricts to people/fashion only — prevents animals/landscapes slipping through
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=${PER_TERM}&page=${PAGE}&safesearch=true&image_type=photo&category=fashion`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`  Pixabay error ${res.status}`); return []; }
  const data = await res.json();
  return (data.hits || []).map((h) => ({
    prompt: h.tags || query,
    image_url: h.webformatURL,
    status: "pending_review",
    category_slug: CATEGORY,
  }));
}

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PER_TERM}&page=${PAGE}`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) { console.error(`  Pexels error ${res.status}`); return []; }
  const data = await res.json();
  return (data.photos || []).map((p) => ({
    prompt: p.alt || query,
    image_url: (p.src?.large || p.src?.original || "").split("?")[0],
    status: "pending_review",
    category_slug: CATEGORY,
  }));
}

async function fetchUnsplash(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${PER_TERM}&page=${PAGE}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) { console.error(`  Unsplash error ${res.status}`); return []; }
  const data = await res.json();
  return (data.results || []).map((p) => ({
    prompt: p.description || p.alt_description || query,
    image_url: (p.urls?.regular || "").split("?")[0],
    status: "pending_review",
    category_slug: CATEGORY,
  }));
}

async function insert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/generated_images?on_conflict=image_url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error("  Insert error:", await res.text()); return 0; }
  const data = await res.json();
  return data.length;
}

async function main() {
  if (!PIXABAY_KEY || !PEXELS_KEY || !UNSPLASH_KEY || !SUPABASE_KEY) {
    console.error("❌ Missing env vars — check .env.local");
    process.exit(1);
  }

  console.log(`\n🎯 Test import — ${CATEGORY} — ${PER_TERM} images per term per source\n`);
  let total = 0;

  for (const term of SEARCH_TERMS) {
    console.log(`\n"${term}"`);

    const [pixRows, pexRows, unRows] = await Promise.all([
      fetchPixabay(term),
      fetchPexels(term),
      fetchUnsplash(term),
    ]);

    const pix = await insert(pixRows);  console.log(`  Pixabay:  +${pix}`);
    await sleep(300);
    const pex = await insert(pexRows);  console.log(`  Pexels:   +${pex}`);
    await sleep(300);
    const un  = await insert(unRows);   console.log(`  Unsplash: +${un}`);
    await sleep(300);

    total += pix + pex + un;
  }

  console.log(`\n✅ Done — ${total} new images added to pending review`);
  console.log(`   Go to /admin/images → filter "female-models" to review them`);
}

main().catch(console.error);
