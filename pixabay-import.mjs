// Bulk import images from Pixabay into Supabase generated_images
// Get a free API key at https://pixabay.com/api/docs/
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.split("=").slice(1).join("=").trim()])
);

const PIXABAY_KEY = env.PIXABAY_API_KEY;
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const CATEGORIES = [
  { slug: "animals",          query: "wild animals nature" },
  { slug: "anime",            query: "anime illustration art" },
  { slug: "beaches",          query: "tropical beach paradise" },
  { slug: "big-cats",         query: "lion tiger leopard big cat" },
  { slug: "bikinis",          query: "bikini beach summer" },
  { slug: "boxing-mma",       query: "boxing MMA martial arts fighter" },
  { slug: "cars-motorcycles", query: "classic cars motorcycles" },
  { slug: "celebrity",        query: "glamour fashion portrait" },
  { slug: "costume",          query: "costume cosplay creative" },
  { slug: "faith",            query: "faith church spiritual" },
  { slug: "fantasy",          query: "fantasy dragon warrior magic" },
  { slug: "female-models",    query: "female portrait fashion" },
  { slug: "food",             query: "delicious food photography" },
  { slug: "funny",            query: "funny humor comedy" },
  { slug: "hip-hop",          query: "hip hop rap urban street" },
  { slug: "classic-cars",     query: "classic car" },
  { slug: "inspirational",    query: "inspirational sunrise mountains" },
  { slug: "lingerie",         query: "lingerie fashion boudoir" },
  { slug: "lowriders",        query: "lowrider custom car chicano" },
  { slug: "male-models",      query: "male portrait fitness model" },
  { slug: "military",         query: "military soldier army" },
  { slug: "miscellaneous",    query: "abstract art colorful" },
  { slug: "music",            query: "music concert performance" },
  { slug: "native-american",  query: "Native American culture heritage" },
  { slug: "nature",           query: "nature landscape scenic" },
  { slug: "old-school",       query: "vintage retro classic" },
  { slug: "pin-up",           query: "pin-up retro glamour" },
  { slug: "seasonal",         query: "seasons autumn winter spring" },
  { slug: "sports",           query: "sports athlete action" },
  { slug: "supercars",        query: "supercar ferrari lamborghini exotic car" },
  { slug: "tattoo-art",       query: "tattoo art flash design" },
  { slug: "western",          query: "cowboy western rodeo" },
  { slug: "wolves-eagles",    query: "wolf eagle power animal" },
  { slug: "yoga",             query: "yoga fitness wellness" },
];

const PER_CATEGORY = 55;
const PAGE = 1;

async function fetchPixabay(query, perPage = 10, page = 1) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=vertical&safesearch=true&image_type=photo`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Pixabay error for "${query}":`, res.status, await res.text());
    return [];
  }
  const data = await res.json();
  return data.hits || [];
}

async function insertImages(images) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/generated_images?on_conflict=image_url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(images),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Supabase insert error:", err);
    return 0;
  }
  const data = await res.json();
  return data.length;
}

async function main() {
  if (!PIXABAY_KEY) {
    console.error("❌ PIXABAY_API_KEY not found in .env.local!");
    console.error("   Add it like: PIXABAY_API_KEY=your_key_here");
    process.exit(1);
  }

  let totalInserted = 0;

  for (const category of CATEGORIES) {
    console.log(`\nFetching "${category.query}" for [${category.slug}]...`);
    const photos = await fetchPixabay(category.query, PER_CATEGORY, PAGE);

    if (photos.length === 0) {
      console.log("  No photos found, skipping.");
      continue;
    }

    const rows = photos.map((photo) => ({
      prompt: photo.tags || category.query,
      image_url: photo.webformatURL,
      status: "pending_review",
      category_slug: category.slug,
    }));

    const count = await insertImages(rows);
    console.log(`  Inserted ${count} images.`);
    totalInserted += count;

    // Be polite to the API
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone! Total images inserted: ${totalInserted}`);
}

main().catch(console.error);
