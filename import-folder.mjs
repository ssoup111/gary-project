#!/usr/bin/env node
/**
 * Import a folder of downloaded photos from ~/Desktop into the catalog.
 *
 * Uploads each file to the jpix-generated bucket (so we host it, no hotlinks)
 * and adds a generated_images row as pending_review. Nothing goes on sale
 * until it is approved in /admin/images. Safe to re-run: files already
 * imported are skipped.
 *
 * Trial:  node import-folder.mjs nature --limit 5
 * Full:   node import-folder.mjs nature
 * All:    node import-folder.mjs all
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = "jpix-generated";
const CONCURRENCY = 6;

// Desktop folder -> category slug
const FOLDERS = {
  graffiti: "graffiti",
  tattoo: "tattoo-art",
  nature: "nature",
  faith: "faith",
  inspirational: "inspirational",
  yoga: "yoga",
  music: "music",
  celebrity: "celebrity",
  military: "military",
  bikini: "bikinis",
  sports: "sports",
  supercar: "supercars",
  seasonal: "seasonal",
  "other faith": "other-faith",
};

const env = {};
for (const line of fs.readFileSync(path.join(HERE, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const which = process.argv[2];
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;
const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg > -1 ? new RegExp(process.argv[onlyArg + 1]) : null;
const targets = which === "all" ? Object.keys(FOLDERS) : [which];
if (!which || targets.some((t) => !FOLDERS[t])) {
  console.error("Usage: node import-folder.mjs <" + Object.keys(FOLDERS).join("|") + "|all> [--limit N]");
  process.exit(1);
}

async function importFolder(folder) {
  const slug = FOLDERS[folder];
  const dir = path.join(os.homedir(), "Desktop", folder);
  const { data: cat, error: catErr } = await supabase.from("categories").select("id,name").eq("slug", slug).single();
  if (catErr || !cat) { console.log(`${folder}: category "${slug}" not found`); return { ok: 0, skipped: 0, failed: 0 }; }

  // Already-imported URLs for this category.
  const have = new Set();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("generated_images").select("image_url").eq("category_slug", slug).range(from, from + 999);
    if (!data?.length) break;
    data.forEach((r) => have.add(r.image_url));
    if (data.length < 1000) break;
  }

  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && (!ONLY || ONLY.test(f))).sort().slice(0, LIMIT);
  const stats = { ok: 0, skipped: 0, failed: 0 };
  let i = 0;

  async function worker() {
    while (i < files.length) {
      const file = files[i++];
      const key = `${slug}/${file}`;
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
      if (have.has(publicUrl)) { stats.skipped++; continue; }
      try {
        const buf = fs.readFileSync(path.join(dir, file));
        const contentType = /\.png$/i.test(file) ? "image/png" : /\.webp$/i.test(file) ? "image/webp" : "image/jpeg";
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buf, { contentType, upsert: true });
        if (upErr) throw new Error("upload: " + upErr.message);
        const src = file.match(/(pexels|pixabay|met|aic|wiki)-(\d+)/);
        const { error: insErr } = await supabase.from("generated_images").insert({
          category_id: cat.id,
          category_slug: slug,
          prompt: `Stock photo: ${cat.name}`,
          title: cat.name,
          image_url: publicUrl,
          status: "pending_review",
          tags: [slug, ...(src ? [`${src[1]}-${src[2]}`] : [])],
          sell_price_cents: 99,
        });
        if (insErr) throw new Error("db: " + insErr.message);
        stats.ok++;
      } catch (e) {
        stats.failed++;
        console.log(`  failed ${file}: ${e.message}`);
      }
      if ((stats.ok + stats.failed) % 100 === 0) console.log(`  ${folder}: ${stats.ok} imported, ${stats.failed} failed`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`${folder} -> ${slug}: imported ${stats.ok}, already there ${stats.skipped}, failed ${stats.failed}`);
  return stats;
}

for (const t of targets) await importFolder(t);
console.log("\nWaiting for approval in /admin/images (filter: pending_review).");
