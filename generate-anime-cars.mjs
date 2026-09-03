#!/usr/bin/env node
/**
 * Generate anime tuner / drift car scenes for review.
 *
 * Uses the same OpenAI model and storage bucket as /api/generate-image, but
 * runs from the terminal so a batch doesn't need the browser. Images land as
 * pending_review - nothing goes on sale until approved in /admin/images.
 *
 * Four images:      node generate-anime-cars.mjs
 * Twelve:           node generate-anime-cars.mjs --count 12
 * Different home:   node generate-anime-cars.mjs --category cars-motorcycles
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = "jpix-generated";
const PREFIX = "anime-cars";

const SCENES = [
  "a tuned Japanese sports coupe mid-drift on a mountain touge road at dusk, tyre smoke curling, headlights cutting the haze",
  "a neon-lit night street race through a rain-slicked Tokyo district, reflections of signage across a low widebody coupe",
  "a parking-garage meet at night, a row of tuner cars with popped hoods and underglow, city skyline beyond the open wall",
  "a drift car sliding through a hairpin bend, sparks off the guardrail, autumn maples on the hillside",
  "a lone tuner car parked on a coastal road at sunset, hood up, sea and cliffs behind, warm orange light",
  "a rear three-quarter view of a widebody drift car mid-slide on a wet circuit, spray fanning off the rear tyres",
  "a mechanic's garage at night, a stripped tuner car on jack stands under fluorescent lights, tools and parts around",
  "two tuner cars side by side under an expressway overpass at night, steam rising from a vent, moody lighting",
  "a downhill mountain pass at dawn, a drift car leading a trail of smoke, mist in the valley below",
  "a race-liveried tuner car launching from a start line, motion blur, floodlit night circuit",
  "an alley meet with a lowered coupe, vending machines glowing, wet asphalt reflecting pink and blue light",
  "a hilltop viewpoint at night, a tuner car parked facing the city lights below, stars above",
];

const STYLE =
  "Anime illustration in the style of Japanese animation cel art: clean linework, " +
  "bold saturated colour, dramatic cinematic lighting, detailed background art. " +
  "No people, no text, no logos, no lettering of any kind.";

// ---- env ----------------------------------------------------------------
const env = {};
for (const line of fs.readFileSync(path.join(HERE, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) { console.error("Missing Supabase settings in .env.local"); process.exit(1); }
if (!OPENAI_KEY) { console.error("Missing OPENAI_API_KEY in .env.local"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

const countArg = process.argv.indexOf("--count");
const COUNT = countArg > -1 ? Math.max(1, parseInt(process.argv[countArg + 1], 10) || 4) : 4;
const catArg = process.argv.indexOf("--category");
const CATEGORY_SLUG = catArg > -1 ? process.argv[catArg + 1] : "anime";

// ---- category -----------------------------------------------------------
const { data: category } = await supabase
  .from("categories")
  .select("id, name, slug")
  .eq("slug", CATEGORY_SLUG)
  .single();

if (!category) {
  console.error(`No category with slug "${CATEGORY_SLUG}".`);
  process.exit(1);
}

console.log(`\nGenerating ${COUNT} anime tuner/drift scene${COUNT === 1 ? "" : "s"} into "${category.name}"`);
console.log(`Roughly $${(COUNT * 0.04).toFixed(2)} of OpenAI usage.\n`);

let made = 0;
const failures = [];

for (let i = 0; i < COUNT; i++) {
  const scene = SCENES[i % SCENES.length];
  const prompt = `${STYLE}\n\nScene: ${scene}`;

  try {
    process.stdout.write(`  [${i + 1}/${COUNT}] drawing...`);

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) { failures.push(`${i + 1}: no image returned`); console.log(" no image returned"); continue; }

    const buf = Buffer.from(b64, "base64");
    const key = `${PREFIX}/${Date.now()}-${i}.png`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buf, { contentType: "image/png", upsert: false });
    if (upErr) { failures.push(`${i + 1}: upload ${upErr.message}`); console.log(` upload failed: ${upErr.message}`); continue; }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

    const { error: insErr } = await supabase.from("generated_images").insert({
      category_id: category.id,
      category_slug: category.slug,
      title: "Anime Tuner Car",
      prompt: `Anime — tuner car, drift, ${scene.split(",")[0].replace(/^a /, "")}`,
      image_url: publicUrl,
      status: "pending_review",
      tags: ["anime", "car", "tuner", "drift", "jdm"],
      sell_price_cents: 99,
    });
    if (insErr) { failures.push(`${i + 1}: db ${insErr.message}`); console.log(` db failed: ${insErr.message}`); continue; }

    made++;
    console.log(` done  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failures.push(`${i + 1}: ${e.message}`);
    console.log(` failed: ${e.message}`);
  }
}

console.log(`\n  generated: ${made}`);
if (failures.length) {
  console.log(`  failed:    ${failures.length}`);
  for (const f of failures) console.log(`    ${f}`);
}
console.log(`\n  Review them in /admin/images (filter: pending_review, category: ${category.name}).\n`);
