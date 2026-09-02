#!/usr/bin/env node
/**
 * Import fresh anime images for review.
 *
 * The old anime catalog stored Pixabay links, which stopped resolving. This
 * downloads every file into the jpix-generated bucket and stores YOUR url,
 * so it can't rot the same way.
 *
 * Anime, not cartoons: a result is only kept if its own Pixabay tags include
 * "anime" or "manga". A generic cartoon tagged "cartoon, funny, character"
 * is skipped even when it turns up in an anime search.
 *
 * Everything lands as pending_review - nothing goes on sale until you
 * approve it in /admin/images.
 *
 * Try a few:   node import-anime-images.mjs
 * Full run:    node import-anime-images.mjs --all
 * Custom size: node import-anime-images.mjs --all --count 150
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = "jpix-generated";
const PREFIX = "anime";
const CATEGORY_SLUG = "anime";
const CATEGORY_ID = "4d3dc4a8-433a-4af0-a18f-595adfaf6b32";

// A result must carry one of these tags, or it isn't anime.
const REQUIRED_TAGS = ["anime", "manga"];

// Tags that mean "this is a generic cartoon / clipart", not anime.
const BANNED_TAGS = ["clipart", "clip art", "cartoon character", "caricature", "emoji", "sticker"];

const SEARCHES = [
  "anime",
  "manga",
  "anime girl",
  "anime boy",
  "anime landscape",
  "anime style",
  "manga art",
  "anime portrait",
];

// ---- env ----------------------------------------------------------------
const env = {};
for (const line of fs.readFileSync(path.join(HERE, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PIXABAY_KEY = env.PIXABAY_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase settings in .env.local");
  process.exit(1);
}
if (!PIXABAY_KEY) {
  console.error("Missing PIXABAY_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ALL = process.argv.includes("--all");
const countArg = process.argv.indexOf("--count");
const WANTED = countArg > -1 ? parseInt(process.argv[countArg + 1], 10) || 120 : ALL ? 120 : 6;

// ---- helpers ------------------------------------------------------------
function tagList(hit) {
  return String(hit.tags || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
}

function isAnime(hit) {
  const tags = tagList(hit);
  if (!tags.some((t) => REQUIRED_TAGS.some((r) => t === r || t.startsWith(r + " ") || t.endsWith(" " + r)))) {
    return false;
  }
  if (tags.some((t) => BANNED_TAGS.includes(t))) return false;
  return true;
}

/** Pixabay throttles bursts. Back off and retry rather than losing the image. */
async function fetchImage(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (friendsbehindbars catalog import)" },
    redirect: "follow",
  });
  if (res.status === 429 && attempt <= 4) {
    const wait = [5000, 15000, 30000, 60000][attempt - 1];
    process.stdout.write(`  waiting ${wait / 1000}s (rate limited)\r`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchImage(url, attempt + 1);
  }
  return res;
}

async function search(query, page) {
  const url =
    "https://pixabay.com/api/?key=" + encodeURIComponent(PIXABAY_KEY) +
    "&q=" + encodeURIComponent(query) +
    "&image_type=illustration&safesearch=true&per_page=100&page=" + page +
    "&order=popular";
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  search "${query}" p${page}: HTTP ${res.status}`);
    return [];
  }
  const body = await res.json();
  return body.hits || [];
}

// ---- gather -------------------------------------------------------------
console.log(`\nLooking for anime images (target ${WANTED})`);
if (!ALL) console.log("(trial run - add --all for the full set)");
console.log();

const candidates = new Map(); // pixabay id -> hit
let scanned = 0;
let rejectedForTags = 0;

outer: for (const query of SEARCHES) {
  for (const page of [1, 2]) {
    const hits = await search(query, page);
    scanned += hits.length;
    for (const hit of hits) {
      if (candidates.has(hit.id)) continue;
      if (!isAnime(hit)) { rejectedForTags++; continue; }
      candidates.set(hit.id, hit);
      if (candidates.size >= WANTED * 2) break outer;
    }
    if (hits.length < 100) break;
    await new Promise((r) => setTimeout(r, 300));
  }
}

console.log(`  scanned ${scanned} results`);
console.log(`  skipped ${rejectedForTags} for not being tagged anime/manga`);
console.log(`  candidates: ${candidates.size}\n`);

// Skip anything already imported.
const ids = [...candidates.keys()];
const { data: existing } = await supabase
  .from("generated_images")
  .select("image_url")
  .like("image_url", `%/${PREFIX}/%`);

const already = new Set(
  (existing || []).map((r) => {
    const m = String(r.image_url).match(/\/anime\/(\d+)\./);
    return m ? Number(m[1]) : null;
  }).filter(Boolean)
);

const todo = ids.filter((id) => !already.has(id)).slice(0, WANTED);
console.log(`  ${already.size} already imported, importing ${todo.length}\n`);

// ---- download, store, record -------------------------------------------
let saved = 0;
const failures = [];

for (const id of todo) {
  const hit = candidates.get(id);
  const source = hit.largeImageURL || hit.webformatURL;
  const tags = tagList(hit);

  try {
    const res = await fetchImage(source);
    if (!res.ok) { failures.push(`${id}: HTTP ${res.status}`); console.log(`  failed  ${id}  HTTP ${res.status}`); continue; }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) { failures.push(`${id}: ${contentType}`); continue; }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2048) { failures.push(`${id}: ${buf.length} bytes`); continue; }

    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const key = `${PREFIX}/${id}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buf, { contentType, upsert: true });
    if (upErr) { failures.push(`${id}: upload ${upErr.message}`); console.log(`  failed  ${id}  upload: ${upErr.message}`); continue; }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

    const { error: insErr } = await supabase.from("generated_images").insert({
      category_id: CATEGORY_ID,
      category_slug: CATEGORY_SLUG,
      prompt: tags.slice(0, 6).join(", "),
      title: tags[0] ? tags[0].replace(/\b\w/g, (c) => c.toUpperCase()) : "Anime",
      image_url: publicUrl,
      status: "pending_review",
      tags,
      sell_price_cents: 99,
    });
    if (insErr) { failures.push(`${id}: db ${insErr.message}`); console.log(`  failed  ${id}  db: ${insErr.message}`); continue; }

    saved++;
    console.log(`  ok      ${id}  ${(buf.length / 1024).toFixed(0)} KB  [${tags.slice(0, 4).join(", ")}]`);
  } catch (e) {
    failures.push(`${id}: ${e.message}`);
    console.log(`  failed  ${id}  ${e.message}`);
  }

  await new Promise((r) => setTimeout(r, 800));
}

console.log(`\n  imported: ${saved}`);
console.log(`  failed:   ${failures.length}`);

const { count: pending } = await supabase
  .from("generated_images")
  .select("id", { count: "exact", head: true })
  .eq("category_slug", CATEGORY_SLUG)
  .eq("status", "pending_review");

console.log(`\n  Waiting for your approval in /admin/images: ${pending ?? "?"}`);
console.log(`  Filter is already set to pending_review when that page opens.\n`);
