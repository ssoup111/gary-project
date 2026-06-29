/**
 * deduplicate-images.mjs
 *
 * Finds and removes duplicate images from generated_images.
 *
 * Two sources of duplicates:
 *  1. Same photo, different URL query params (Pexels/Unsplash resize params vary between runs)
 *     - Detects by extracting the canonical photo ID from the URL path
 *  2. Same description (prompt) in the same category — likely the same image from the same source
 *     - Only flags as duplicate if prompt is long enough to be meaningful (>20 chars)
 *
 * For each duplicate group, keeps the BEST copy:
 *   approved > pending_review > rejected
 *   ties broken by earliest created_at
 *
 * Run: cd ~/Desktop/jpix && node deduplicate-images.mjs
 * Add --dry-run to preview without deleting anything.
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

const SUPABASE_URL = "https://zgcqbvvvwbgpbgaofkmg.supabase.co";
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  process.exit(1);
}

// Extract a canonical ID from a photo URL so we can detect the same photo at different sizes/params
function canonicalId(url) {
  if (!url) return null;

  // Pexels: https://images.pexels.com/photos/12345678/pexels-photo-12345678.jpeg?...
  const pexels = url.match(/pexels\.com\/photos\/(\d+)\//);
  if (pexels) return `pexels:${pexels[1]}`;

  // Unsplash: https://images.unsplash.com/photo-1234567890-abcdef?...
  const unsplash = url.match(/unsplash\.com\/(photo-[a-zA-Z0-9_-]+)/);
  if (unsplash) return `unsplash:${unsplash[1]}`;

  // Pixabay: https://cdn.pixabay.com/photo/2023/01/01/123456/filename_640.jpg
  // webformatURL has no query params so the full URL is already the canonical key — skip
  return null;
}

const STATUS_RANK = { approved: 0, pending_review: 1, rejected: 2 };

function bestRow(rows) {
  return rows.slice().sort((a, b) => {
    const sr = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    if (sr !== 0) return sr;
    return new Date(a.created_at) - new Date(b.created_at);
  })[0];
}

async function fetchAllImages() {
  const PAGE = 1000;
  let offset = 0;
  const all = [];
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/generated_images?select=id,image_url,prompt,status,category_slug,created_at&order=created_at.asc&limit=${PAGE}&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function deleteImages(ids) {
  // Delete in batches of 50
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const filter = batch.map((id) => `id.eq.${id}`).join(",");
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/generated_images?or=(${filter})`,
      {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "return=minimal" },
      }
    );
    if (!res.ok) {
      console.error(`  ❌ Delete failed (batch ${i / 50 + 1}):`, await res.text());
    }
  }
}

async function main() {
  console.log(`\n🔍 Fetching all images from DB...`);
  const all = await fetchAllImages();
  console.log(`   Loaded ${all.length} total images\n`);

  const toDelete = new Set();

  // ── Pass 1: canonical URL dedup (same Pexels/Unsplash photo, different params) ──
  const byCanonical = new Map(); // canonicalId → rows[]
  for (const row of all) {
    const cid = canonicalId(row.image_url);
    if (!cid) continue;
    const key = `${cid}|${row.category_slug || ""}`;
    if (!byCanonical.has(key)) byCanonical.set(key, []);
    byCanonical.get(key).push(row);
  }

  let urlDupGroups = 0;
  for (const [key, rows] of byCanonical) {
    if (rows.length < 2) continue;
    urlDupGroups++;
    const keep = bestRow(rows);
    const drop = rows.filter((r) => r.id !== keep.id);
    console.log(`[URL dup] ${key} — keeping ${keep.status} (${keep.id.slice(0, 8)}), dropping ${drop.length}`);
    drop.forEach((r) => toDelete.add(r.id));
  }

  // ── Pass 2: same prompt + same category (same search result imported twice) ──
  const byPromptCat = new Map(); // "prompt|category_slug" → rows[]
  for (const row of all) {
    if (!row.prompt || row.prompt.length < 20) continue; // too short to be meaningful
    if (!row.category_slug) continue;
    const key = `${row.prompt.toLowerCase().trim()}|${row.category_slug}`;
    if (!byPromptCat.has(key)) byPromptCat.set(key, []);
    byPromptCat.get(key).push(row);
  }

  let promptDupGroups = 0;
  for (const [key, rows] of byPromptCat) {
    if (rows.length < 2) continue;
    // Only flag if they're NOT already being deleted via URL dedup
    const live = rows.filter((r) => !toDelete.has(r.id));
    if (live.length < 2) continue;
    promptDupGroups++;
    const keep = bestRow(live);
    const drop = live.filter((r) => r.id !== keep.id);
    console.log(`[Prompt dup] "${key.slice(0, 60)}..." — keeping ${keep.status}, dropping ${drop.length}`);
    drop.forEach((r) => toDelete.add(r.id));
  }

  console.log(`\n📊 Summary:`);
  console.log(`   URL-based duplicate groups:    ${urlDupGroups}`);
  console.log(`   Prompt-based duplicate groups: ${promptDupGroups}`);
  console.log(`   Total images to delete:        ${toDelete.size}`);

  if (toDelete.size === 0) {
    console.log("\n✅ No duplicates found. Your catalog is clean!");
    return;
  }

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN — no changes made. Remove --dry-run to actually delete.");
    return;
  }

  console.log(`\n🗑️  Deleting ${toDelete.size} duplicate images...`);
  await deleteImages(Array.from(toDelete));
  console.log(`✅ Done! Deleted ${toDelete.size} duplicates.`);
  console.log(`\nTip: run again with --dry-run to verify the catalog is clean.`);
}

main().catch(console.error);
