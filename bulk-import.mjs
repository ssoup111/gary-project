// Bulk import images from Unsplash into Supabase generated_images
// Fetches ~5 images per category, inserts as approved

const UNSPLASH_KEY = "hBipcZk-pxDSFrQS5bLRA-xeaHh7eg07lBnIu296V0Q";
const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_SERVICE_KEY = "sb_secret_f8T3RAMmcuuAJ2F99z68-w_2UiamJYy";

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
  { slug: "female-models",    query: "female portrait fashion model" },
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
const PAGE = 2; // page 1 already imported — use 2 for fresh results

async function fetchUnsplash(query, perPage = 10, page = 2) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });
  if (!res.ok) {
    console.error(`Unsplash error for "${query}":`, res.status, await res.text());
    return [];
  }
  const data = await res.json();
  return data.results || [];
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
  let totalInserted = 0;

  for (const category of CATEGORIES) {
    console.log(`\nFetching "${category.query}" for [${category.slug}]...`);
    const photos = await fetchUnsplash(category.query, PER_CATEGORY, PAGE);

    if (photos.length === 0) {
      console.log("  No photos found, skipping.");
      continue;
    }

    const rows = photos.map((photo) => ({
      prompt: photo.description || photo.alt_description || category.query,
      image_url: photo.urls.regular,
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
