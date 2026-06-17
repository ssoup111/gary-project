// Debug script — takes a screenshot of JPay's facility page and dumps the HTML
// so we can see what the page actually looks like in a real browser
import { chromium } from "playwright";
import { writeFileSync } from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log("Loading JPay facility page...");
  await page.goto("https://www.jpay.com/PAvail.aspx", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({ path: "jpay-screenshot.png", fullPage: false });
  console.log("📸 Screenshot saved: jpay-screenshot.png");

  // Dump all select elements
  const selects = await page.$$eval("select", els =>
    els.map(el => ({
      id: el.id,
      name: el.name,
      options: [...el.options].map(o => `${o.value}: ${o.text}`).slice(0, 5)
    }))
  );
  console.log("\nAll <select> elements found:", JSON.stringify(selects, null, 2));

  // Dump all links (first 20)
  const links = await page.$$eval("a", els =>
    els.slice(0, 30).map(el => ({ text: el.textContent.trim(), href: el.href }))
  );
  console.log("\nFirst 30 links:", JSON.stringify(links, null, 2));

  // Look for anything that looks like a facility/state name
  const bodyText = await page.evaluate(() => document.body.innerText);
  writeFileSync("jpay-body-text.txt", bodyText);
  console.log("\n📄 Full page text saved: jpay-body-text.txt");
  console.log("First 500 chars of page text:");
  console.log(bodyText.slice(0, 500));

  await browser.close();
}

main().catch(console.error);
