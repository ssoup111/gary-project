// Scrape JPay facility list from PAvail.aspx (public page, no login needed)
// JPay uses ASP.NET WebForms — we must grab ViewState tokens first, then POST per state.
// Saves results to jpay-facilities.json + jpay-facilities.csv in the current directory.

import { writeFileSync } from "fs";

const BASE_URL = "https://www.jpay.com/PAvail.aspx";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": "https://www.jpay.com/PAvail.aspx",
};

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","GU","PR"
];

// Extract a hidden field value from HTML
function extractField(html, name) {
  const match = html.match(new RegExp(`id="${name}"[^>]*value="([^"]*)"`, "i"))
    || html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`, "i"))
    || html.match(new RegExp(`value="([^"]*)"[^>]*name="${name}"`, "i"));
  return match ? match[1] : "";
}

// Parse facility names from JPay's tree view HTML
function parseFacilities(html, state) {
  const facilities = [];
  const seen = new Set();

  // Method 1: option elements in facility dropdown
  const optionRe = /<option[^>]+value="(\d+)"[^>]*>([^<]+)<\/option>/gi;
  let m;
  while ((m = optionRe.exec(html)) !== null) {
    const id = m[1].trim();
    const name = m[2].trim();
    if (id && name && !name.toLowerCase().includes("select") && !seen.has(name)) {
      seen.add(name);
      facilities.push({ name, jpay_id: id, state, platform: "JPay", is_active: true });
    }
  }

  // Method 2: tree view node text (fallback)
  if (facilities.length === 0) {
    const treeRe = /TreeView[^>]+>([^<]{4,80})</gi;
    while ((m = treeRe.exec(html)) !== null) {
      const name = m[1].trim();
      if (name && !name.startsWith("javascript") && !seen.has(name)) {
        seen.add(name);
        facilities.push({ name, jpay_id: null, state, platform: "JPay", is_active: true });
      }
    }
  }

  // Method 3: anchor text in tree (fallback)
  if (facilities.length === 0) {
    const linkRe = /href="javascript:[^"]*"[^>]*>([^<]{4,80})</gi;
    while ((m = linkRe.exec(html)) !== null) {
      const name = m[1].trim();
      if (!seen.has(name) && !name.includes("©") && name.length > 3) {
        seen.add(name);
        facilities.push({ name, jpay_id: null, state, platform: "JPay", is_active: true });
      }
    }
  }

  return facilities;
}

async function getInitialPage() {
  const res = await fetch(BASE_URL, { headers: HEADERS });
  const html = await res.text();
  return {
    html,
    viewState: extractField(html, "__VIEWSTATE"),
    viewStateGen: extractField(html, "__VIEWSTATEGENERATOR"),
    eventValidation: extractField(html, "__EVENTVALIDATION"),
    cookies: res.headers.get("set-cookie") || "",
  };
}

async function fetchStateData(state, session) {
  const body = new URLSearchParams({
    "__EVENTTARGET": "ctl00$cphBody$ddlState",
    "__EVENTARGUMENT": "",
    "__VIEWSTATE": session.viewState,
    "__VIEWSTATEGENERATOR": session.viewStateGen,
    "__EVENTVALIDATION": session.eventValidation,
    "ctl00$cphBody$ddlState": state,
    "ctl00$cphBody$ddlFacility": "",
  });

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": session.cookies,
    },
    body: body.toString(),
  });

  if (!res.ok) return [];
  const html = await res.text();
  return parseFacilities(html, state);
}

async function main() {
  console.log("🏛️  Scraping JPay facilities (all US states)...\n");

  // Step 1: Get initial page for ASP.NET session tokens
  console.log("Getting session tokens...");
  let session;
  try {
    session = await getInitialPage();
    console.log(`✓ ViewState: ${session.viewState.length > 0 ? "found" : "NOT FOUND"}`);
  } catch (err) {
    console.error("Failed to load initial page:", err.message);
    process.exit(1);
  }

  // Step 2: Fetch facilities state by state
  const allFacilities = [];
  let statesWithData = 0;

  for (const state of STATES) {
    process.stdout.write(`${state}... `);
    try {
      const facilities = await fetchStateData(state, session);
      if (facilities.length > 0) {
        console.log(`${facilities.length} facilities`);
        allFacilities.push(...facilities);
        statesWithData++;
      } else {
        console.log("none (not served by JPay)");
      }
    } catch (err) {
      console.log(`error: ${err.message}`);
    }

    // 600ms between requests — be polite
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n✅ Done: ${allFacilities.length} facilities across ${statesWithData} states`);

  if (allFacilities.length === 0) {
    console.log("\n⚠️  No facilities extracted — JPay may require JavaScript rendering.");
    console.log("   Try running this in a browser console instead, or use the Chrome-based approach.");
    process.exit(0);
  }

  // Save JSON
  writeFileSync("jpay-facilities.json", JSON.stringify(allFacilities, null, 2));
  console.log("📄 Saved: jpay-facilities.json");

  // Save CSV
  const csv = [
    "name,state,jpay_id,platform",
    ...allFacilities.map(f =>
      `"${f.name.replace(/"/g, '""')}","${f.state}","${f.jpay_id || ""}","${f.platform}"`
    )
  ].join("\n");
  writeFileSync("jpay-facilities.csv", csv);
  console.log("📄 Saved: jpay-facilities.csv");
  console.log("\nNext: run import-facilities.mjs to load into Supabase.");
}

main().catch(console.error);
