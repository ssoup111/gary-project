/**
 * Friends Behind Bars — Securus Snap & Send Automation
 *
 * Workflow:
 * 1. Pull next queued_for_delivery order from DB
 * 2. Log into Securus (reuse session if still active)
 * 3. Check if inmate is already a contact — add if not
 * 4. Go to Snap & Send, upload image, submit
 * 5. Mark order completed in DB → customer email fires
 * 6. Repeat for all queued orders
 *
 * Run: cd ~/Desktop/jpix && node securus-automation.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { writeFileSync, readFileSync, existsSync, mkdirSync, createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const SECURUS_URL       = "https://securustech.online";
const SECURUS_EMAIL     = "admin@friendsbehindbars.com"; // update once account confirmed
const SECURUS_PASSWORD  = process.env.SECURUS_PASSWORD || "";   // add to .env.local
const ALERT_EMAIL       = process.env.ALERT_EMAIL || "";        // add to .env.local when ready
const LOW_STAMP_THRESHOLD = 10;
const SESSION_FILE      = join(__dirname, ".securus-session.json");
const IMAGE_TEMP_DIR    = join(__dirname, ".securus-images");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── EMAIL ALERTS ─────────────────────────────────────────────────────────────

async function sendAlert(subject, message) {
  if (!ALERT_EMAIL) {
    console.warn("⚠️  ALERT_EMAIL not set — alert not sent:", subject);
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"Friends Behind Bars Bot" <${process.env.GMAIL_USER}>`,
      to: ALERT_EMAIL,
      subject: `[FBB Bot Alert] ${subject}`,
      text: message,
    });
    console.log(`📧 Alert sent: ${subject}`);
  } catch (err) {
    console.error("Failed to send alert email:", err.message);
  }
}

// ─── DB HELPERS ───────────────────────────────────────────────────────────────

async function getNextQueuedOrder() {
  const { data, error } = await supabase
    .from("delivery_queue")
    .select(`
      id,
      order_id,
      recipient_id,
      status,
      orders ( customer_email, order_items ( generated_images ( image_url, prompt ) ) ),
      recipients ( first_name, last_name, offender_id, facility, state )
    `)
    .eq("status", "queued_for_delivery")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;

  const order     = data.orders;
  const recipient = data.recipients;
  const imageArr  = order?.order_items?.[0]?.generated_images;
  const image     = Array.isArray(imageArr) ? imageArr[0] : imageArr;

  return {
    deliveryId:    data.id,
    orderId:       data.order_id,
    customerEmail: order?.customer_email || null,
    imageUrl:      image?.image_url || null,
    imagePrompt:   image?.prompt || null,
    firstName:     recipient?.first_name || "",
    lastName:      recipient?.last_name || "",
    fullName:      [recipient?.first_name, recipient?.last_name].filter(Boolean).join(" "),
    inmateNumber:  recipient?.offender_id || "",
    facility:      recipient?.facility || "",
    state:         recipient?.state || "",
  };
}

async function markOrderCompleted(deliveryId, orderId, notes = "") {
  await supabase.from("delivery_queue").update({ status: "completed", admin_notes: notes }).eq("id", deliveryId);
  await supabase.from("orders").update({ status: "completed", delivery_status: "delivered" }).eq("id", orderId);
  console.log(`✅ Order ${orderId.slice(0, 8).toUpperCase()} marked completed`);
}

async function markOrderProblem(deliveryId, notes) {
  await supabase.from("delivery_queue").update({ status: "problem", admin_notes: notes }).eq("id", deliveryId);
  console.log(`❌ Order marked as problem: ${notes}`);
}

// ─── IMAGE DOWNLOAD ───────────────────────────────────────────────────────────

async function downloadImage(imageUrl, filename) {
  if (!existsSync(IMAGE_TEMP_DIR)) mkdirSync(IMAGE_TEMP_DIR);
  const filepath = join(IMAGE_TEMP_DIR, filename);

  return new Promise((resolve, reject) => {
    const file = createWriteStream(filepath);
    https.get(imageUrl, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(filepath); });
    }).on("error", reject);
  });
}

// ─── UI SAFETY WRAPPER ────────────────────────────────────────────────────────

/**
 * Wraps a Playwright action. If the element isn't found within the timeout,
 * it's treated as a possible Securus UI change — alerts admin and throws.
 */
async function safeAction(page, selector, action, description, timeout = 15000) {
  try {
    await page.waitForSelector(selector, { timeout });
    if (action === "click")  await page.click(selector);
    if (action === "fill")   return selector; // caller fills
    return true;
  } catch {
    const msg = `Securus UI may have changed — could not find: "${description}" (selector: ${selector})`;
    console.error("🚨", msg);
    await sendAlert("Securus UI Change Detected — Bot Paused",
      `${msg}\n\nThe automation has been paused. Please log into Securus manually to verify the UI is unchanged, then restart the bot.`
    );
    throw new Error(msg);
  }
}

// ─── SECURUS: LOGIN ───────────────────────────────────────────────────────────

async function login(page) {
  console.log("🔐 Logging into Securus...");
  await page.goto(`${SECURUS_URL}/#/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Check if already logged in
  if (page.url().includes("dashboard") || page.url().includes("home")) {
    console.log("✓ Already logged in");
    return;
  }

  // TODO: Fill in actual selectors after Bill walks through the login UI
  // These are placeholders — update after mapping the UI
  await safeAction(page, 'input[type="email"], input[name="email"], #email', "fill", "Email field");
  await page.fill('input[type="email"], input[name="email"], #email', SECURUS_EMAIL);

  await safeAction(page, 'input[type="password"], input[name="password"], #password', "fill", "Password field");
  await page.fill('input[type="password"], input[name="password"], #password', SECURUS_PASSWORD);

  await safeAction(page, 'button[type="submit"], .sign-in-btn, #signIn', "click", "Sign In button");
  await page.waitForTimeout(3000);

  console.log("✓ Logged in successfully");
}

// ─── SECURUS: CHECK STAMP COUNT ───────────────────────────────────────────────

async function getStampCount(page) {
  // TODO: Map the actual selector for stamp count after walking through UI
  // Returns the number of stamps remaining, or null if can't be determined
  try {
    // Placeholder — replace with actual selector
    const stampText = await page.textContent(".stamp-count, .stamps-remaining, [data-stamps]").catch(() => null);
    if (!stampText) return null;
    const match = stampText.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  } catch {
    return null;
  }
}

// ─── SECURUS: CHECK / ADD CONTACT ────────────────────────────────────────────

async function ensureContact(page, order) {
  console.log(`👤 Checking if ${order.fullName} (#${order.inmateNumber}) is in contacts...`);

  // TODO: Navigate to contacts page — update selector after mapping UI
  // await page.click(".contacts-nav, a[href*='contacts']");
  // await page.waitForTimeout(2000);

  // TODO: Search for the inmate in the contact list
  // const searchField = await page.$('input[placeholder*="search"], .contact-search');
  // if (searchField) {
  //   await searchField.fill(order.inmateNumber);
  //   await page.waitForTimeout(1500);
  // }

  // TODO: Check if contact appears in results
  // const contactExists = await page.$(`text=${order.inmateNumber}`);

  // PLACEHOLDER — for now always returns false (will add contact)
  const contactExists = false;

  if (contactExists) {
    console.log("✓ Contact already exists — selecting...");
    // TODO: Click the contact to select them
  } else {
    console.log("➕ Contact not found — adding new contact...");
    await addContact(page, order);
  }
}

async function addContact(page, order) {
  // TODO: Map all selectors for Add Contact form after walking through UI
  // Steps expected (to be confirmed):
  // 1. Click "Add Contact" or "New Contact" button
  // 2. Enter inmate first name
  // 3. Enter inmate last name
  // 4. Enter inmate ID / offender number
  // 5. Select state
  // 6. Select facility
  // 7. Submit / Save

  console.log(`  Adding: ${order.fullName}, #${order.inmateNumber}, ${order.facility}, ${order.state}`);

  // Placeholder steps — fill in after UI mapping:
  // await safeAction(page, '.add-contact-btn, button[data-action="add-contact"]', "click", "Add Contact button");
  // await page.waitForTimeout(1500);
  // await page.fill('#firstName, input[name="firstName"]', order.firstName);
  // await page.fill('#lastName, input[name="lastName"]', order.lastName);
  // await page.fill('#inmateId, input[name="inmateId"]', order.inmateNumber);
  // ... select state, select facility ...
  // await page.click('#saveContact, button[type="submit"]');
  // await page.waitForTimeout(2000);

  console.log("✓ Contact added (placeholder — needs UI mapping)");
}

// ─── SECURUS: SNAP & SEND ─────────────────────────────────────────────────────

async function snapAndSend(page, order, imagePath) {
  console.log(`📸 Sending image via Snap & Send to ${order.fullName}...`);

  // TODO: Navigate to Snap & Send section — update after UI mapping
  // await safeAction(page, 'a[href*="snap"], .snap-send-nav, button[data-product="snap"]', "click", "Snap & Send nav");
  // await page.waitForTimeout(2000);

  // TODO: Select the contact / recipient
  // TODO: Upload the image file
  // const fileInput = await page.$('input[type="file"]');
  // if (fileInput) await fileInput.setInputFiles(imagePath);

  // TODO: Confirm and submit
  // await safeAction(page, '.send-btn, button[type="submit"]', "click", "Send button");
  // await page.waitForTimeout(3000);

  // TODO: Confirm success (look for success message)
  // const successMsg = await page.$('.success-message, .confirmation');
  // if (!successMsg) throw new Error("Snap & Send submission may have failed — no confirmation found");

  console.log("✓ Snap & Send submitted (placeholder — needs UI mapping)");
}

// ─── SAVE / LOAD SESSION ─────────────────────────────────────────────────────

async function saveSession(context) {
  const cookies = await context.cookies();
  writeFileSync(SESSION_FILE, JSON.stringify(cookies));
  console.log("💾 Session saved");
}

async function loadSession(context) {
  if (!existsSync(SESSION_FILE)) return false;
  try {
    const cookies = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
    await context.addCookies(cookies);
    console.log("♻️  Session loaded from disk");
    return true;
  } catch {
    return false;
  }
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🤖 Friends Behind Bars — Securus Automation Starting\n");

  let ordersProcessed = 0;
  let botPaused = false;

  const browser = await chromium.launch({
    headless: false, // Set to true for production; false lets you watch it work
    slowMo: 500,     // Slow down actions slightly to appear more human
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    // Load saved session or log in fresh
    const sessionLoaded = await loadSession(context);
    await login(page);
    await saveSession(context);

    // Check stamp count before starting
    const stamps = await getStampCount(page);
    if (stamps !== null) {
      console.log(`🎟️  Stamps remaining: ${stamps}`);
      if (stamps < LOW_STAMP_THRESHOLD) {
        await sendAlert(
          `Low Stamps — Only ${stamps} Remaining`,
          `Your Securus account only has ${stamps} stamps remaining (threshold: ${LOW_STAMP_THRESHOLD}).\n\nPlease purchase more stamps before the bot runs out.\n\nThe bot will continue processing orders until stamps are exhausted.`
        );
      }
    }

    // Process orders one by one
    while (!botPaused) {
      const order = await getNextQueuedOrder();

      if (!order) {
        console.log("\n🎉 All orders processed — nothing left in queue!");
        break;
      }

      console.log(`\n─── Processing Order ${order.orderId.slice(0, 8).toUpperCase()} ───`);
      console.log(`    Recipient: ${order.fullName}`);
      console.log(`    Inmate #:  ${order.inmateNumber}`);
      console.log(`    Facility:  ${order.facility}, ${order.state}`);
      console.log(`    Image:     ${order.imageUrl}`);

      try {
        // Download image to temp file
        const imageFilename = `${order.orderId}.jpg`;
        const imagePath = await downloadImage(order.imageUrl, imageFilename);
        console.log(`✓ Image downloaded: ${imageFilename}`);

        // Ensure contact exists in Securus
        await ensureContact(page, order);

        // Send via Snap & Send
        await snapAndSend(page, order, imagePath);

        // Mark completed in DB
        await markOrderCompleted(order.deliveryId, order.orderId, "Sent via automated Snap & Send");
        ordersProcessed++;

        // Brief pause between orders to appear human
        await page.waitForTimeout(3000);

      } catch (err) {
        if (err.message.includes("UI may have changed")) {
          // UI change detected — stop processing, admin already alerted
          botPaused = true;
          await markOrderProblem(order.deliveryId, "Bot paused — Securus UI change detected");
          break;
        }
        // Other error — mark problem and continue to next order
        console.error(`Error on order ${order.orderId.slice(0, 8)}:`, err.message);
        await markOrderProblem(order.deliveryId, err.message);
      }
    }

  } catch (err) {
    console.error("🚨 Fatal error:", err.message);
    await sendAlert("Bot Crashed", `The Securus automation bot encountered a fatal error:\n\n${err.message}\n\nStack:\n${err.stack}`);
  } finally {
    await saveSession(context);
    await browser.close();
    console.log(`\n📊 Session complete — ${ordersProcessed} order(s) processed`);
  }
}

main().catch(console.error);
