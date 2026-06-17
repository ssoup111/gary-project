// Quick diagnostic — test if Playwright can reach JPay and find facility links
import { chromium } from "playwright";

async function main() {
  console.log("Step 1: Launching browser...");
  const browser = await chromium.launch({ headless: true });
  console.log("Step 2: Browser launched OK");

  const page = await browser.newPage();
  console.log("Step 3: New page created");

  console.log("Step 4: Navigating to JPay...");
  try {
    await page.goto("https://www.jpay.com/PAvail.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    console.log("Step 5: Page loaded. URL =", page.url());
  } catch (err) {
    console.error("FAILED at navigation:", err.message);
    await browser.close();
    return;
  }

  await page.waitForTimeout(3000);
  console.log("Step 6: Waited 3s for JS to run");

  // Count ALL links
  const allLinks = await page.$$eval("a", els => els.length);
  console.log(`Step 7: Total <a> tags on page: ${allLinks}`);

  // Count Facility-Details links specifically
  const facilityLinks = await page.$$eval("a", els =>
    els.filter(a => a.href.includes("Facility-Details")).length
  );
  console.log(`Step 8: Links containing 'Facility-Details': ${facilityLinks}`);

  // Show first 5 facility links if any
  if (facilityLinks > 0) {
    const sample = await page.$$eval("a", els =>
      els.filter(a => a.href.includes("Facility-Details"))
        .slice(0, 5)
        .map(a => ({ text: a.textContent.trim().slice(0, 60), href: a.href }))
    );
    console.log("Sample facility links:", JSON.stringify(sample, null, 2));
  } else {
    const anyLinks = await page.$$eval("a", els =>
      els.slice(0, 10).map(a => ({ text: a.textContent.trim().slice(0, 60), href: a.href }))
    );
    console.log("No facility links found. First 10 links:", JSON.stringify(anyLinks, null, 2));
    const title = await page.title();
    console.log("Page title:", title);
  }

  await browser.close();
  console.log("Done.");
}

main().catch(err => {
  console.error("UNCAUGHT ERROR:", err);
  process.exit(1);
});
