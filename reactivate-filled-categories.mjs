/**
 * reactivate-filled-categories.mjs
 *
 * Re-enables any category that is currently inactive but has 5+ approved images.
 * Run after reviewing + approving images from fill-empty-categories.mjs.
 *
 * Run: cd ~/Desktop/jpix && node reactivate-filled-categories.mjs
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
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const MIN_IMAGES = 5; // minimum approved images to re-enable a category

async function query(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  return res;
}

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
    process.exit(1);
  }

  // Get all inactive categories with their approved image counts
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/categories?is_active=eq.false&select=slug,name`,
    {
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const inactiveCategories = await countRes.json();

  if (!Array.isArray(inactiveCategories) || inactiveCategories.length === 0) {
    console.log("✅ No inactive categories found.");
    return;
  }

  console.log(`\nChecking ${inactiveCategories.length} inactive categories...\n`);

  const toEnable = [];

  for (const cat of inactiveCategories) {
    const imgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/generated_images?category_slug=eq.${cat.slug}&status=eq.approved&select=id`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Prefer": "count=exact",
        },
      }
    );
    const countHeader = imgRes.headers.get("content-range");
    const count = countHeader ? parseInt(countHeader.split("/")[1] || "0", 10) : 0;

    console.log(`  ${cat.slug}: ${count} approved images`);
    if (count >= MIN_IMAGES) {
      toEnable.push(cat.slug);
    }
  }

  if (toEnable.length === 0) {
    console.log(`\nNo categories have ${MIN_IMAGES}+ approved images yet. Review more images in the admin panel first.`);
    return;
  }

  console.log(`\nRe-enabling ${toEnable.length} categories: ${toEnable.join(", ")}`);

  for (const slug of toEnable) {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/categories?slug=eq.${slug}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ is_active: true }),
      }
    );
    if (patchRes.ok) {
      console.log(`  ✅ Enabled: ${slug}`);
    } else {
      console.error(`  ❌ Failed to enable ${slug}:`, await patchRes.text());
    }
  }

  console.log("\nDone! These categories are now live in the catalog.");
}

main().catch(console.error);
