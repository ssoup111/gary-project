// Scrape JPay facility list — 1538 facility links are already in the DOM.
import { chromium } from "playwright";
import { writeFileSync } from "fs";

function extractStateAndType(agencySlug) {
  // Pattern 1: "AZ-Community-Supervision" → state=AZ, type="Community Supervision"
  const startMatch = agencySlug.match(/^([A-Z]{2})-(.+)$/);
  if (startMatch) {
    return { state: startMatch[1], facilityType: startMatch[2].replace(/-/g, " ") };
  }
  // Pattern 2: "Chilton-County-Jail-AL" → state=AL, type="Chilton County Jail"
  const endMatch = agencySlug.match(/^(.+)-([A-Z]{2})$/);
  if (endMatch) {
    return { state: endMatch[2], facilityType: endMatch[1].replace(/-/g, " ") };
  }
  return { state: null, facilityType: agencySlug };
}

async function main() {
  console.log("🏛️  Scraping JPay / Securus facilities...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Loading https://www.jpay.com/PAvail.aspx ...");
  await page.goto("https://www.jpay.com/PAvail.aspx", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const rawLinks = await page.$$eval("a", (els) =>
    els
      .filter((a) => a.href.includes("Facility-Details"))
      .map((a) => ({ text: a.textContent.trim(), href: a.href }))
  );

  console.log(`Found ${rawLinks.length} facility links\n`);
  await browser.close();

  const facilities = [];
  const seen = new Set();

  for (const { text, href } of rawLinks) {
    if (!text || !href) continue;
    const parts = href.split("/Facility-Details/")[1]?.split("/") || [];
    const agencySlug = parts[0] || "";
    const { state, facilityType } = extractStateAndType(agencySlug);
    if (!state) continue;

    // Clean name: strip trailing " (ID)" and ", ST" suffix
    const name = text
      .replace(/\s*\(\d+\)\s*$/, "")
      .replace(/,\s*[A-Z]{2}\s*$/, "")
      .trim();

    if (!name) continue;
    const key = `${state}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    facilities.push({ name, state, facility_type: facilityType, is_active: true });
  }

  const facilities_filtered = facilities.filter(
    (f) => f.state && /^[A-Z]{2}$/.test(f.state)
  );

  // Group by state for display
  const byState = {};
  facilities_filtered.forEach((f) => { byState[f.state] = (byState[f.state] || 0) + 1; });
  Object.keys(byState).sort().forEach((s) => console.log(`  ${s}: ${byState[s]} facilities`));
  console.log(`\n✅ Total: ${facilities_filtered.length} unique facilities across ${Object.keys(byState).length} states`);

  writeFileSync("jpay-facilities.json", JSON.stringify(facilities_filtered, null, 2));
  console.log("📄 Saved: jpay-facilities.json");

  const csv = [
    "name,state,facility_type",
    ...facilities_filtered.map(
      (f) => `"${f.name.replace(/"/g, '""')}","${f.state}","${f.facility_type.replace(/"/g, '""')}"`
    ),
  ].join("\n");
  writeFileSync("jpay-facilities.csv", csv);
  console.log("📄 Saved: jpay-facilities.csv");
  console.log("\n▶️  Next: node import-facilities.mjs");
}

main().catch(console.error);
