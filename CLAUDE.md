@AGENTS.md

# Project: Friends Behind Bars (jpix)

E-commerce app for sending approved images to incarcerated recipients. Next.js 16.2.6 App Router, Supabase, Stripe.

Live at: https://friendsbehindbars.com  
Supabase project: zgcqbvvvwbgpbgaofkmg  
Admin email: ssoup1@protonmail.com  

## Key Architecture Notes

- `NEXT_PUBLIC_` env vars are baked into the build at compile time — changing them in Vercel requires a new build (Redeploy), not just a redeploy
- Server components use `getServerSupabase()` which reads `SUPABASE_URL` / `SUPABASE_ANON_KEY` (non-NEXT_PUBLIC, runtime) instead of the baked-in client vars
- `@supabase/auth-helpers-nextjs` is incompatible with Next.js 16 — use client-side auth checks instead
- `useSearchParams()` requires a `<Suspense>` wrapper in Next.js 15+/16
- Admin protection is in `app/admin/layout.tsx` — checks logged-in email against `NEXT_PUBLIC_ADMIN_EMAIL` (defaults to ssoup1@protonmail.com)
- Two recipient tables: `inmate_contacts` (user-saved contacts, has `user_id`) and `recipients` (what orders FK to, has `first_name, last_name, offender_id, state, facility`)
- Orders are linked to recipients via `orders.recipient_id → recipients.id`
- RLS on `generated_images`: public can only SELECT `status = 'approved'`; authenticated users can SELECT all (added policy `authenticated_read_all`)
- Git index.lock periodically blocks commits — fix with: `rm ~/Desktop/jpix/.git/HEAD.lock`
- Sandbox cannot push to GitHub (403) — Bill must always run `git push` manually from his terminal

## Image Status Flow

`pending_review` → (admin approves) → `approved` (shows in catalog)  
`pending_review` → (admin rejects) → `rejected`

## Import Scripts (project root)

| Script | Source | Notes |
|--------|--------|-------|
| `bulk-import.mjs` | Unsplash | 55/category, page 2, reads `.env.local` |
| `pexels-import.mjs` | Pexels | 55/category, page 1, reads `.env.local` |
| `pixabay-import.mjs` | Pixabay | 55/category, page 1, uses `webformatURL` ✓ |
| `import-cars.mjs` | All 3 | Classic Cars + Supercars only, 35 each, pages 1 & 2 |

All scripts use `?on_conflict=image_url` + `resolution=ignore-duplicates` — safe to run multiple times. DB has a UNIQUE constraint on `image_url`.

To run: `cd ~/Desktop/jpix && node <script-name>.mjs`

## Categories (35 total)

animals, anime, beaches, big-cats, bikinis, boxing-mma, cars-motorcycles, classic-cars, celebrity, costume, faith, fantasy, female-models, food, funny, hip-hop, inspirational, lingerie, lowriders, male-models, military, miscellaneous, music, native-american, nature, old-school, pin-up, seasonal, sports, supercars, tattoo-art, western, wolves-eagles, yoga

Note: "yoga-pants" renamed to "yoga", "hot-rods" renamed to "classic-cars" — slugs updated in DB and images reassigned.

## Current State (end of session June 28 2026 — night)

- Login working ✓ — Enter key now submits, forgot password flow added, reset-password page built
- Signup working ✓ — Enter key now submits
- Catalog working ✓ — broken image fallback added (`components/catalog/CatalogImageCard.tsx`)
- Admin panel working ✓ — bulk approve/reject with checkboxes, Select All, Approve/Reject Selected
- Admin orders page fixed ✓ — now uses service-role API (`/api/admin/orders/list`) so all customer orders show (was only showing admin's own orders due to RLS)
- Unsplash + Pexels images importing and displaying correctly ✓
- ~400 anime illustrations pending review in admin (Pixabay illustration-only import, `import-pixabay-anime.mjs`)
- Duplicate protection in place ✓ (DB UNIQUE constraint on `image_url` + `on_conflict` param)
- 35 categories live in DB ✓
- Stripe payments working ✓ — live mode, $1.99 per image, tested and confirmed paid ($0.36 goes to Stripe fees, $1.63 deposited)
- Live Stripe webhook registered: `empowering-voyage` → `https://friendsbehindbars.com/api/stripe-webhook` → `checkout.session.completed`
- STRIPE_WEBHOOK_SECRET updated in Vercel with live webhook signing secret ✓
- Fulfillment queue built ✓ — `/admin/delivery` shows image + JPay recipient info + download button + "Mark as Sent" → emails customer
- Stripe business verification: COMPLETE ✓ (charges_enabled, payouts_enabled, details_submitted all true)
- Customer confirmation email: WORKING ✓ — CTA links to /my-orders (was /dashboard)
- facilities table: unique constraint added on (name, state) ✓
- JPay/Securus facility scraper: COMPLETE ✓ — 619 facilities across 40 states imported (`scrape-jpay-playwright.mjs` + `import-facilities.mjs`)
- Missouri DOC prisons: 19 state prisons added manually → Missouri now has 22 facilities ✓
- Facility typeahead: shows all facilities for state (no cap), filters to 25 as user types ✓
- RLS fixes applied: orders/order_items restricted to owner; recipients SELECT/INSERT open to authenticated ✓
- Stripe test webhook registered + working ✓
- Playwright automation framework written: `securus-automation.mjs` — needs UI selectors filled in after manual Snap & Send walkthrough
- RLS policies hardened ✓ — orders/order_items/delivery_queue INSERT now enforce ownership via WITH CHECK; favorite_images/inmate_contacts tightened from public → authenticated role
- Dashboard: Subscriptions card removed (feature doesn't exist)
- Nav/footer/menu/sitemap: cleaned up (dead links removed, auth-aware nav) ✓
- All public pages have real content ✓ — privacy policy, terms, FAQ, How It Works, content rules

## Fulfillment Workflow — Phase 1 (Manual)

1. Customer pays $1.99 → order appears in `/admin/delivery` under "Queued For Delivery"
2. Bill logs into friendsbehindbars Securus account, clicks Download JPEG for the ordered image
3. Bill manually enters inmate name, inmate number, and facility in Securus, attaches the image, sends
4. Bill clicks "Mark as Sent to JPay" in admin → order marked completed → customer gets confirmation email
5. Repeat for each unfulfilled order row

## Facility Typeahead UI (designed, not yet built)

Customer flow: pick state → type facility name → autocomplete filters as they type → hit enter to confirm.
Uses `facilities` table (state + name + facility_type columns). Two-step: state first, then typeahead search within that state.

## Stripe Test Mode

- Test card: `4242 4242 4242 4242` | any future expiry | any CVC | any ZIP
- To switch app to test mode: get `pk_test_...` + `sk_test_...` from Stripe dashboard (Test mode toggle, top right) → update Vercel env vars → redeploy

### Stripe Webhook — Test vs Live

There are TWO separate webhooks needed — one for live mode, one for test mode. Each has its own signing secret.

**Live webhook** (named `empowering-voyage`):
- URL: `https://friendsbehindbars.com/api/stripe-webhook`
- Event: `checkout.session.completed`
- Signing secret: stored in Vercel as `STRIPE_WEBHOOK_SECRET` (live value)

**Test webhook** (needs to be registered separately in Stripe test mode):
- URL: `https://friendsbehindbars.com/api/stripe-webhook` (same URL)
- Event: `checkout.session.completed`
- To register: Stripe dashboard → toggle Test mode ON → Developers → Webhooks → Add endpoint
- After registering, copy the `whsec_test_...` signing secret → update `STRIPE_WEBHOOK_SECRET` in Vercel → Redeploy

**IMPORTANT when switching back to live mode:**
- Restore `STRIPE_WEBHOOK_SECRET` in Vercel to the live webhook signing secret (from `empowering-voyage` webhook)
- Update `STRIPE_SECRET_KEY` back to `sk_live_...`
- Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` back to `pk_live_...`
- Redeploy

## Catalog Content Status

| Category | Approved | Active |
|----------|----------|--------|
| Classic Cars | 525 | ✓ |
| Anime | 317 | ✓ |
| Supercars | 39 | ✓ |
| Bikinis | 32 | ✓ |
| Cars & Motorcycles | 17 | ✓ |
| Female Models | 15 | ✓ |
| Military | 15 | ✓ |
| Celebrity | 14 | ✓ |
| Animals | 11 | ✓ |
| Costume | 11 | ✓ |
| Lingerie | 11 | ✓ |
| Old School | 9 | ✓ |
| Faith | 9 | ✓ |
| Yoga | 8 | ✓ |
| Miscellaneous | 6 | ✓ |
| Inspirational/Sports/Nature/Seasonal | 5 each | ✓ |
| Male Models | 3 | ✓ |
| Music | 1 | ✓ |
| Beaches, Pin-Up, Lowriders, Funny, Boxing-MMA, Wolves-Eagles, Hip-Hop, Big-Cats, Fantasy, Food, Western, Tattoo-Art, Native-American | 0 | hidden |

**To fill empty categories:** `cd ~/Desktop/jpix && node fill-empty-categories.mjs` → review in admin → `node reactivate-filled-categories.mjs`

## Priority List for Next Session

1. **Review 2,746 new images in admin** — from `fill-empty-categories.mjs` run (June 28 night) — approve good ones, then `node reactivate-filled-categories.mjs`
2. **Add CRON_SECRET to Vercel** — daily report email won't send without it; set any random string in Vercel env vars + redeploy
3. **Call Securus to add email to account** — needed before Snap & Send UI walkthrough + automation can proceed
4. **Build facility typeahead UI** — customer flow: pick state → type facility name → autocomplete (uses `facilities` table, 619 facilities across 40 states now loaded)

## Fulfillment — Phase 2: Securus Snap & Send Automation (Playwright)

### Overview
Build a Playwright bot that automates the manual Securus Snap & Send workflow. This runs on demand or on a loop, processes each queued order, and updates the DB when complete.

### Workflow (step by step)
1. Query DB for next order with `status = 'queued_for_delivery'`
2. Pull inmate info: name, inmate number, facility, state, and image URL
3. Log into Securus website (friendsbehindbars account) — reuse session if still active
4. Check Securus contact list — does this inmate already exist?
   - **YES** → select the contact
   - **NO** → add them as a new contact (name, inmate number, facility), then select them
5. Go to Snap & Send, upload the image, submit
6. Mark order as `completed` in DB → customer confirmation email fires automatically
7. Repeat for next queued order

### Alerts to Build In
- **Low stamp alert**: If Securus account has fewer than 10 stamps remaining, email admin before continuing. Bill will provide the alert email address when ready to build this step.
- **UI change detection**: If Playwright can't find an expected element (button/form/page), treat it as a possible Securus UI update — alert admin, stop processing orders, wait for human to confirm script still works.

### Admin Dashboard additions
Add an automation status panel to `/admin` showing:
- Bot status: running / idle / paused / error
- Orders processed today
- Stamps remaining
- Last run timestamp
- Active alerts (low stamps, UI change detected)
- Manual pause/resume button

### Important Notes
- Snap & Send requires stamp credits on the Securus account — not the same as eMessaging photo attachments (those cost 3 cents per stamp separately)
- Bill will walk through the Snap & Send UI manually so we can map every click/field before writing the script
- Securus uses Cloudflare anti-bot — session management and realistic timing will be important
- If Securus updates their UI, the script will break — UI change detection alert handles this
- Long-term goal: once volume is proven, approach Aventiv Technologies (Securus/JPay parent) for official API access

### Status
- [ ] Bill to walk through Snap & Send flow manually on screen
- [ ] Map every step, form field, and button
- [x] Write Playwright automation script framework (`securus-automation.mjs`) ✓
- [ ] Fill in actual Securus UI selectors (login, contacts, Snap & Send) after UI mapping
- [ ] Add `SECURUS_PASSWORD` + `ALERT_EMAIL` to `.env.local`
- [ ] Build low-stamp + UI-change alert system (need alert email from Bill)
- [ ] Add automation status panel to admin dashboard

### Running the Script
```bash
cd ~/Desktop/jpix && node securus-automation.mjs
```
Before running:
1. Add to `.env.local`: `SECURUS_PASSWORD=yourpassword` and `ALERT_EMAIL=youremail@example.com`
2. Make sure playwright is installed: `npx playwright install chromium`
3. Walk through Securus Snap & Send UI manually and fill in TODO selectors in `securus-automation.mjs`

## Fulfillment — Phase 3 Research (Print-to-Scan)

### Why No Direct API Exists
- Securus/JPay have ZERO public API endpoints for third-party developers
- Their "stamp" economy (charging families credits per photo) is their primary revenue model — allowing third-party uploads would bypass it
- Facility firewalls require all inbound media to pass AI filters + staff approval within Securus's internal admin network
- Browser automation (Playwright/Puppeteer) explicitly violates Securus/JPay ToS and will get the account banned

### How Other Inmate Photo Apps Actually Work
**Method 1 — Print-to-Scan (most common, safest):**
- App prints the photo and mails it physically to the facility
- Facility's Securus Digital Mail Center scans it and routes it electronically to the inmate's tablet
- Feels fully digital to the inmate, but backend is physical
- Examples: Pigeonly ($5/month unlimited), others

**Method 2 — Browser automation (risky):**
- Bot logs into Securus consumer site, purchases a stamp, attaches image
- Violates ToS, anti-bot protection (Cloudflare/reCAPTCHA) breaks it constantly
- Accounts can be permanently banned

### Print-to-Scan Cost Analysis
Using **Lob.com** print-mail API:
- ~$0.48–$0.75 per 4x6 postcard (print + USPS postage included)
- For photo in envelope (letter): print ~$0.30 + postage $0.73 = ~$1.00–$1.25 total
- At $1.99/order: Stripe takes $0.36 → $1.63 gross → minus ~$1.00–$1.25 print/mail = $0.38–$0.63 profit
- **Current price point ($1.99) is too thin for print-to-scan — would need $3.99–$4.99/order**

Competitor pricing: Pigeonly charges $5/month for unlimited photos (they use print-to-scan)

### Strategic Options
1. **Keep Phase 1 manual** — Bill logs into Securus, uploads image manually, marks as sent (current)
2. **Pivot to print-to-scan** — integrate Lob.com API, raise price to ~$3.99–$4.99, fully automated
3. **Aventiv partnership** — pitch to Aventiv Technologies (Securus/JPay parent) for white-label content integration on their tablet ecosystem (long shot, but real pipe)

### Next Steps if Pursuing Print-to-Scan
- Add mailing addresses to `facilities` table (currently only has name + state)
- Integrate Lob.com API (`lob` npm package)
- Update order flow to trigger print job automatically after Stripe payment
- Raise per-image price to $3.99–$4.99 to cover print+mail costs

## Pending / Backlog

- Run import-cars.mjs — Classic Cars + Supercars still light on images
- Task #13 — confirm catalog image cards link to `/catalog/[id]` detail page

## Vercel Env Vars (production)

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zgcqbvvvwbgpbgaofkmg.supabase.co` — baked into client bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy JWT anon key (from Supabase Settings → API Keys → Legacy tab) |
| `SUPABASE_URL` | Runtime server-side Supabase URL |
| `SUPABASE_ANON_KEY` | Runtime server-side anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin API routes |
| `NEXT_PUBLIC_SITE_URL` | https://friendsbehindbars.com |
| `NEXT_PUBLIC_APP_URL` | https://friendsbehindbars.com |
| `NEXT_PUBLIC_ADMIN_EMAIL` | ssoup1@protonmail.com |

## .env.local Keys (local dev)

- `UNSPLASH_ACCESS_KEY` — Unsplash API key
- `PEXELS_API_KEY` — Pexels API key
- `PIXABAY_API_KEY` — Pixabay API key
- `SUPABASE_SERVICE_ROLE_KEY` — used by import scripts for DB writes
