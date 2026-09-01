#!/usr/bin/env node
/**
 * Re-host Pixabay images into Supabase Storage.
 *
 * Rows whose image_url points at https://pixabay.com/get/... do not render:
 * those are Pixabay's own download URLs, not a public CDN, and hotlinking
 * them from another domain fails. Pixabay's licence expects the file to be
 * downloaded and served from your own storage anyway.
 *
 * This downloads each one, uploads it to the jpix-generated bucket, and
 * repoints the row at the new public URL. It is safe to re-run: rows already
 * moved no longer match the query.
 *
 * Try a few first:   node fix-pixabay-images.mjs
 * Then the lot:      node fix-pixabay-images.mjs --all
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = "jpix-generated";
const PREFIX = "pixabay";

// ---- env ----------------------------------------------------------------
const env = {};
for (const line of fs.readFileSync(path.join(HERE, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ALL = process.argv.includes("--all");
const LIMIT = ALL ? 100000 : 5;

// ---- work ---------------------------------------------------------------
const { data: rows, error } = await supabase
  .from("generated_images")
  .select("id, image_url, category_slug")
  .like("image_url", "https://pixabay.com/get/%")
  .limit(LIMIT);

if (error) {
  console.error("Could not read the catalog:", error.message);
  process.exit(1);
}

if (!rows || rows.length === 0) {
  console.log("\nNothing left to move - no rows still point at pixabay.com.\n");
  process.exit(0);
}

console.log(`\nMoving ${rows.length} image${rows.length === 1 ? "" : "s"} into Supabase Storage`);
if (!ALL) console.log("(trial run of 5 - add --all once these look right)");
console.log();

let moved = 0;
const failures = [];

for (const row of rows) {
  const label = `${row.category_slug || "uncategorised"} ${row.id.slice(0, 8)}`;
  try {
    const res = await fetch(row.image_url, {
      headers: { "User-Agent": "Mozilla/5.0 (friendsbehindbars image migration)" },
      redirect: "follow",
    });

    if (!res.ok) {
      failures.push({ id: row.id, category: row.category_slug, reason: `HTTP ${res.status}` });
      console.log(`  dead    ${label}  HTTP ${res.status}`);
      continue;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      failures.push({ id: row.id, category: row.category_slug, reason: `not an image (${contentType})` });
      console.log(`  dead    ${label}  returned ${contentType}`);
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) {
      failures.push({ id: row.id, category: row.category_slug, reason: `only ${buf.length} bytes` });
      console.log(`  dead    ${label}  only ${buf.length} bytes`);
      continue;
    }

    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const key = `${PREFIX}/${row.id}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buf, { contentType, upsert: true });

    if (upErr) {
      failures.push({ id: row.id, category: row.category_slug, reason: `upload: ${upErr.message}` });
      console.log(`  FAILED  ${label}  upload: ${upErr.message}`);
      continue;
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

    const { error: updErr } = await supabase
      .from("generated_images")
      .update({ image_url: publicUrl })
      .eq("id", row.id);

    if (updErr) {
      failures.push({ id: row.id, category: row.category_slug, reason: `db: ${updErr.message}` });
      console.log(`  FAILED  ${label}  db: ${updErr.message}`);
      continue;
    }

    moved++;
    console.log(`  ok      ${label}  ${(buf.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    failures.push({ id: row.id, category: row.category_slug, reason: e.message });
    console.log(`  FAILED  ${label}  ${e.message}`);
  }

  await new Promise((r) => setTimeout(r, 250)); // be polite to Pixabay
}

console.log(`\n  moved:  ${moved}`);
console.log(`  failed: ${failures.length}`);

if (failures.length) {
  const byCategory = {};
  for (const f of failures) {
    byCategory[f.category || "uncategorised"] = (byCategory[f.category || "uncategorised"] || 0) + 1;
  }
  console.log("\n  Failures by category:");
  for (const [cat, n] of Object.entries(byCategory)) console.log(`    ${cat}: ${n}`);
  console.log("\n  Those images can't be recovered from Pixabay. Tell Claude and");
  console.log("  they can be taken out of the catalog so they aren't sold.");
}

const { count: remaining } = await supabase
  .from("generated_images")
  .select("id", { count: "exact", head: true })
  .like("image_url", "https://pixabay.com/get/%");

console.log(`\n  Still on pixabay.com: ${remaining ?? "?"}`);
console.log();
