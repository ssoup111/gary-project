/**
 * fill-empty-categories.mjs
 *
 * Targeted import for the 13 categories currently hidden due to zero approved images.
 * Uses refined search terms + pages 2-4 to get fresh content (page 1 was already tried).
 * Sources: Pixabay (illustrations OK) + Pexels (photos only).
 *
 * Run: cd ~/Desktop/jpix && node fill-empty-categories.mjs
 *
 * After running, review in admin panel and approve/reject.
 * Re-enable a category in DB once it has approved images:
 *   UPDATE categories SET is_active = true WHERE slug = 'beaches';
 */

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

const PIXABAY_KEY = env.PIXABAY_API_KEY;
const PEXELS_KEY  = env.PEXELS_API_KEY;
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const PER_SOURCE = 40; // images per source per category

// Refined search terms — different from what was already tried and rejected
const CATEGORIES = [
  // Stock sites have plenty of wolf/eagle nature shots
  { slug: "wolves-eagles",    pixabay: ["wolf pack snow howling", "bald eagle flight soaring", "eagle portrait wildlife"], pexels: ["wolf wildlife nature", "eagle raptor bird"] },
  // Tropical paradise shots are ubiquitous — try portrait/lifestyle angle
  { slug: "beaches",          pixabay: ["beach sunset tropical water", "ocean paradise island", "palm tree beach turquoise"], pexels: ["tropical beach vacation", "ocean coast summer"] },
  // Big cats are well-covered in wildlife photography
  { slug: "big-cats",         pixabay: ["lion wildlife africa savanna", "tiger jungle striped", "leopard cheetah spots wildlife"], pexels: ["lion big cat wildlife", "tiger close portrait"] },
  // Try food styling angles
  { slug: "food",             pixabay: ["food plated restaurant gourmet", "burger pizza sandwich meal", "dessert cake sweet food"], pexels: ["food photography plated", "restaurant meal gourmet"] },
  // Western americana — try landscapes and cowboy culture
  { slug: "western",          pixabay: ["cowboy horse sunset ranch", "western americana rodeo hat", "desert canyon wild west"], pexels: ["cowboy western hat", "ranch horse sunset"] },
  // Fantasy art — Pixabay has good illustration content
  { slug: "fantasy",          pixabay: ["fantasy art warrior illustration", "dragon knight medieval painting", "magical forest fairy digital art"], pexels: ["fantasy costume armor warrior"] },
  // Hip-hop — try street art and culture angles
  { slug: "hip-hop",          pixabay: ["hip hop graffiti street art urban", "rap music microphone stage", "breakdance urban street dancer"], pexels: ["street art urban graffiti", "hip hop dance music"] },
  // Pin-up — try vintage illustration style
  { slug: "pin-up",           pixabay: ["retro vintage pin up glamour", "pin-up girl illustration classic", "1950s retro fashion woman"], pexels: ["retro vintage fashion glamour", "pin up style woman"] },
  // Boxing/MMA training and sport angles
  { slug: "boxing-mma",       pixabay: ["boxing gloves training ring sport", "MMA fighter martial arts kickboxing", "boxer punch fitness workout"], pexels: ["boxing training gloves", "martial arts fighter sport"] },
  // Funny — animals and humor moments
  { slug: "funny",            pixabay: ["funny animals cat dog humor", "funny face expression laugh", "cute funny animal meme"], pexels: ["funny animals humor", "cute funny cat dog"] },
  // Native American — art and heritage focus
  { slug: "native-american",  pixabay: ["Native American feathers headdress art", "indigenous culture heritage tribal", "pow wow ceremonial dance native"], pexels: ["native american indigenous heritage", "tribal feathers ceremonial"] },
  // Tattoo art — focus on artwork not bodies
  { slug: "tattoo-art",       pixabay: ["tattoo art sleeve design color", "tattoo illustration flash sheet", "tattoo artist drawing ink"], pexels: ["tattoo art design", "tattoo sleeve bodyart"] },
  // Lowriders — car culture
  { slug: "lowriders",        pixabay: ["lowrider car show custom chrome", "classic car low rider hydraulics", "chicano car culture street"], pexels: ["lowrider custom car show", "classic car chrome street"] },
];

// Also boost thin categories with extra pages
const THIN_CATEGORIES = [
  { slug: "music",            pixabay: ["music concert stage lights", "guitar musician performance", "drums piano jazz music"], pexels: ["music concert performance", "musician guitar stage"] },
  { slug: "male-models",      pixabay: ["male model fitness portrait", "man handsome strong athletic", "male fashion portrait studio"], pexels: ["male model portrait", "man fitness athletic"] },
  { slug: "sports",           pixabay: ["basketball football baseball sport", "athlete running jump action sport", "soccer player sport action"], pexels: ["sports action athlete", "basketball football sport"] },
  { slug: "nature",           pixabay: ["mountain sunset landscape scenic", "waterfall forest green nature", "flower meadow spring nature"], pexels: ["nature landscape scenic", "mountain waterfall outdoor"] },
  { slug: "inspirational",    pixabay: ["sunrise mountain motivation quote", "hands together teamwork inspire", "achievement success goal motivation"], pexels: ["inspirational sunrise nature", "motivation success achievement"] },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPixabay(query, perPage, page) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&safesearch=true&image_type=all`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`  Pixabay error: ${res.status}`); return []; }
  const data = await res.json();
  return data.hits || [];
}

async function fetchPexels(query, perPage, page) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) { console.error(`  Pexels error: ${res.status}`); return []; }
  const data = await res.json();
  return (data.photos || []).map((p) => ({ url: p.src?.large || p.src?.original, tags: query }));
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
  if (!res.ok) { console.error("  Insert error:", await res.text()); return 0; }
  const data = await res.json();
  return data.length;
}

async function fillCategory({ slug, pixabay = [], pexels = [] }, page = 2) {
  let total = 0;
  const perQuery = Math.ceil(PER_SOURCE / Math.max(pixabay.length, 1));

  for (const query of pixabay) {
    const hits = await fetchPixabay(query, perQuery, page);
    const rows = hits.map((h) => ({ prompt: h.tags || query, image_url: h.webformatURL, status: "pending_review", category_slug: slug }));
    const count = await insertImages(rows);
    console.log(`    Pixabay "${query}" p${page}: +${count}`);
    total += count;
    await sleep(400);
  }

  const perPexelQuery = Math.ceil(PER_SOURCE / Math.max(pexels.length, 1));
  for (const query of pexels) {
    const photos = await fetchPexels(query, perPexelQuery, page);
    const rows = photos.filter((p) => p.url).map((p) => ({ prompt: p.tags || query, image_url: p.url, status: "pending_review", category_slug: slug }));
    const count = await insertImages(rows);
    console.log(`    Pexels "${query}" p${page}: +${count}`);
    total += count;
    await sleep(400);
  }

  return total;
}

async function main() {
  if (!PIXABAY_KEY || !PEXELS_KEY || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing env vars — check .env.local for PIXABAY_API_KEY, PEXELS_API_KEY, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  let grandTotal = 0;

  console.log("\n=== Filling 13 empty categories (pages 2–3) ===");
  for (const cat of CATEGORIES) {
    console.log(`\n[${cat.slug}]`);
    for (const page of [2, 3]) {
      const count = await fillCategory(cat, page);
      grandTotal += count;
    }
  }

  console.log("\n=== Boosting 5 thin categories (pages 3–4) ===");
  for (const cat of THIN_CATEGORIES) {
    console.log(`\n[${cat.slug}]`);
    for (const page of [3, 4]) {
      const count = await fillCategory(cat, page);
      grandTotal += count;
    }
  }

  console.log(`\n✅ Done! Total new images queued for review: ${grandTotal}`);
  console.log("\nNext steps:");
  console.log("  1. Review in admin panel → approve good ones");
  console.log("  2. Re-enable categories that now have approved images:");
  console.log("     UPDATE categories SET is_active = true WHERE slug IN ('wolves-eagles', 'beaches', ...);");
  console.log("  3. Or run: node reactivate-filled-categories.mjs  (to auto-enable any with 5+ approved images)");
}

main().catch(console.error);
