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

## Current State (as of Aug 17 2026 — full audit session)

**⚠️ Two known-broken production issues found in tonight's audit — see Priority List below. Everything else in this section is historical (July 6) and still mostly accurate for what it describes, but the Stripe/email lines are now superseded.**

- Login working ✓ — Enter key now submits, forgot password flow added, reset-password page built
- Signup working ✓ — Enter key now submits
- Catalog working ✓ — infinite scroll implemented (replaces pagination) using IntersectionObserver; 96 images load server-side, rest load automatically as user scrolls
- Admin panel working ✓ — bulk approve/reject, Select All, category filter pills with pending counts, approved count badge on every image card (green/amber/red)
- Admin orders page fixed ✓ — service-role API bypasses RLS, shows all customer orders
- Duplicate protection hardened ✓ — Pexels/Unsplash URLs now stripped of query params before insert; `deduplicate-images.mjs` cleaned 1,664 existing duplicates
- 35 categories live in DB ✓
- Fulfillment queue built ✓ — `/admin/delivery` shows image + recipient info + download + "Mark as Sent"
- Stripe business verification: COMPLETE ✓
- JPay/Securus facility scraper: COMPLETE ✓ — 619 facilities across 40 states
- Facility typeahead: shows all facilities for state, filters to 25 as user types ✓ (saved-recipient autofill only fills name/inmate#, not state/facility — minor UX gap, not blocking)
- RLS policies hardened ✓
- Nav/footer/sitemap cleaned up ✓
- All public pages have real content ✓
- **Tiered pricing COMPLETE ✓** — 10 pricing tiers (individual, packages, subscriptions) in DB + UI
- **Checkout tested end-to-end ✓** (as of July 6) — test order went through, webhook fired, order marked paid, appeared in /admin/delivery, marked as sent successfully
- **Email migrated from Gmail/nodemailer to Resend ✓ WORKING ✓** (fixed Aug 17 2026, same session as the audit) — `RESEND_API_KEY` added to Vercel, domain DNS records added at Namecheap, redeployed, confirmed "Delivered" via a real `/contact` test
- **Stripe: very likely still in TEST mode in production** — see Priority List #2 (still open, the one real blocker left)
- Daily report cron is intentionally **paused** (`vercel.json` → `"crons": []`, commit `e6b0d36`, July 5) — not a bug, just off
- **Checkout "Plan not found" bug FIXED ✓ (Aug 23 2026)** — `SUPABASE_SERVICE_ROLE_KEY` in Vercel prod (and `.env.local`) held an invalid/unregistered `sb_secret_...` key, so every server-side `product_plans` lookup in `/api/checkout/create` 401'd and got reported as "Plan not found." Fixed by pulling the real legacy `service_role` JWT from Supabase dashboard → API Keys → Legacy tab, updating the Vercel env var, redeploying, and confirming via a direct API call that checkout now passes the plan lookup. See Priority List item 7 for full detail.
- **Supabase Auth "email rate limit exceeded" bug FIXED ✓ (Aug 23 2026)** — Signup was using Supabase Auth's built-in email service, which is capped at 2 emails/hour and explicitly not meant for production. Fixed by enabling custom SMTP for Supabase Auth (Authentication → Emails → SMTP Settings) using Resend's SMTP relay (`smtp.resend.com`, port 465, username `resend`), with a new dedicated Resend API key (`friendsbehindbars supabase auth smtp`, Sending-access only, scoped to the friendsbehindbars.com domain) as the password, and sender `orders@friendsbehindbars.com`. Confirmed fix by checking Auth → Rate Limits: sending-email limit went from 2/h → 30/h after saving. This is separate from the app's own transactional emails (order/contact/delivery), which already went through Resend via `lib/email.ts` — this fix specifically covers Supabase's own signup-confirmation/password-reset/magic-link emails. See Priority List item 8 for full detail.
- **Missing order confirmation email bug FIXED ✓ (Aug 23 2026)** — Bill signed up and completed a real test purchase (Stripe test mode, `fbbpictures@gmail.com`) but got no order confirmation email. Root cause: `STRIPE_WEBHOOK_SECRET` in Vercel production didn't match the signing secret of Stripe's actual **test-mode** webhook endpoint (`upbeat-excellence`) — Stripe dashboard showed all 3 recent `checkout.session.completed` deliveries failing with `400 "Invalid webhook signature."` Since `stripe.webhooks.constructEvent()` throws on mismatch, `/api/stripe-webhook` returned 400 before ever reaching the order-update or email-send code — the order stayed stuck at `status: "pending"` with `stripe_checkout_session_id: null` forever, and the confirmation email (which fires from inside that webhook handler, not from `/api/checkout/create`) never sent. Fix: revealed the real test-webhook signing secret from Stripe dashboard → Webhooks → `upbeat-excellence` → Overview (`whsec_F4yYW5pzf7uohZwNl1Wx2ompluWuWKYe`), updated Vercel's `STRIPE_WEBHOOK_SECRET` to match, redeployed. Verified by clicking "Resend" on the previously-failed webhook event in Stripe — delivery now returns `200 OK` — then re-querying the `orders` table (Bill's order flipped to `status: "paid"`, `delivery_status: "queued_for_delivery"`), then confirming in Resend's email log that "Single Image Confirmed — Friends..." shows **Delivered** to `fbbpictures@gmail.com`. Full loop confirmed working. Note: `.env.local`'s `STRIPE_WEBHOOK_SECRET` (`whsec_08vv6m1kb...`) was NOT updated to match — only the Vercel production value was fixed, so local webhook testing would still fail until that's synced too.

## Tiered Pricing System (session July 6 2026)

### Architecture
- `product_plans` table: 10 tiers with `plan_type` (individual/package/subscription), `image_count`, `price_cents`, `duration_days`, `badge`, `savings_pct`, `sort_order`
- `subscriptions` table: tracks active package credits and daily delivery subscriptions (`images_remaining`, `images_total`, `start_date`, `end_date`, `next_delivery_date`)
- Subscriptions are one-time Stripe payments (not recurring billing) — avoids dependency on unbuilt Securus automation
- `orders` table: has `plan_id` and `subscription_id` columns

### Pages & API
- `/pricing` — marketing page showing all 3 plan types with badges, savings %, per-image cost, FAQ
- `/order` — two-step flow: (1) pick plan, (2) enter recipient → calls `/api/checkout/create`
- `/api/checkout/create` — unified checkout: loads plan from DB, creates order + optional order_items, creates Stripe session
- `/api/stripe-webhook` — routes by `planType` metadata: individual queues delivery, package/subscription creates `subscriptions` record
- `/my-orders` — two tabs: "Images" (individual orders) and "Plans & Packages" (credit/sub tracker with progress bar)
- `/admin/subscriptions` — table view of all customer subscriptions with credits remaining, progress bar, dates

### Pricing Tiers Seeded
- Single image: $0.99
- 5-pack: $4.49 (saves 10%)
- 10-image package: $7.99 (saves 20%)
- 20-image package: $14.99 (saves 25%, Popular)
- 50-image package: $34.99 (saves 30%)
- 100-image package: $59.99 (saves 40%, Best Value)
- 30-day subscription: $19.99 (30 images)
- 90-day subscription: $44.99 (90 images, Popular)
- 180-day subscription: $74.99 (180 images)
- 365-day subscription: $119.99 (365 images, Best Value)

## Image Quality Initiative (session June 30)

Goal: higher-quality professional glamour/lingerie photography — moving away from amateur stock shots.

### What was tried
- Uploaded reference images (professional lingerie/boudoir editorial style) to analyze quality markers
- Wrote `test-import-glamour.mjs` — targeted test importer for female-models category
- Problem: Pixabay was returning irrelevant images (lions, horses) because "editorial/model" matched animal photography
- Fix applied: added `category=fashion` to Pixabay API calls + all search terms now include "woman" explicitly
- Fix applied: removed `orientation=portrait` restriction from Pexels (was limiting result pool)
- Still working on getting clean fresh results — page cycling caused 0 new inserts on some runs

### Search terms in test-import-glamour.mjs (current)
- "woman lingerie bedroom"
- "glamour woman portrait blonde"
- "boudoir woman studio"
- "woman lingerie stockings heels"
- "woman black lingerie interior"
- "woman lingerie back pose stockings"
- "woman lingerie fashion portrait"
- "boudoir woman black lingerie"
- "woman lingerie editorial"

### Next step for image quality
Run: `cd ~/Desktop/jpix && node test-import-glamour.mjs`
Review results in admin → female-models filter
If quality is good → scale up to full import for female-models + lingerie categories

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

## Red/White/Blue Rebrand (session Aug 24 2026)

Gary requested a full storefront-style redesign: top nav with logo, Categories dropdown, Subscriptions/Packages/Contact/About Us links; homepage showing pictures directly below nav with lazy-load infinite scroll and a cart-icon "add to order" button per image; American-flag color scheme (white = primary/background, blue = secondary, red = tertiary/accent) applied consistently site-wide with matching borders/shadows on every card.

**What changed:**
- `components/layout/SiteNav.tsx` — blue (`#0A3161`) top bar, logo mark + wordmark left, live Categories dropdown (fetched from Supabase), Subscriptions/Packages(→`/pricing`)/Contact/About Us(→`/how-it-works`) links, red (`#B31942`) accents.
- `components/layout/SiteFooter.tsx` — recolored to match.
- `app/page.tsx` + new `components/home/HomeStoreGrid.tsx` — homepage replaced with a white-background picture grid directly below the nav (newest-approved first — no purchase-count tracking exists yet, so this isn't true "best sellers"), lazy-loaded via IntersectionObserver reusing `/api/catalog/images`, white cards with consistent shadow/border, red circular cart-icon button linking into the existing single-image checkout (`/order?imageId=...`). No real multi-item cart was built — this is a visual-only restyle of the existing "Select" flow, per explicit instruction that this was styling-only, not new functionality.
- **Site-wide reskin**: every customer-facing page/component (all of `app/` and `components/` except `app/admin/` and `components/admin/`, which were deliberately left on the old dark theme as an internal tool) had its dark zinc/amber theme converted to the new palette: `bg-zinc-950`/`bg-zinc-900` → white, `bg-zinc-800` → `#F1F4F9`, all `border-zinc-*` → consistent `border-black/10–15`, all `text-zinc-*`/`text-white` (headings/body) → navy `#0A3161` at varying opacity for hierarchy, all `amber-*` accent classes → red `#B31942` (with `#8f1434` as the darker hover shade). Button pattern that was previously "light button on dark page" (`bg-white text-black`) flipped to a proper red-fill CTA (`bg-[#B31942] text-white`) since the page itself is now white. Status colors (green success / red error badges) were re-tuned from dark-mode-bright shades to light-mode-readable shades (e.g. `text-green-400`→`text-green-700`, `bg-red-950`→`bg-red-50`) for contrast, but kept as green/red (not brand red) since those are functional status indicators, not brand accents. Card shadow/border treatment standardized to `border border-black/10 bg-white shadow-md shadow-black/10` (or `shadow-2xl` specifically for floating/overlay elements like dropdowns and modals) across the app.
- `app/globals.css` — `--background`/`--foreground` flipped to white/navy; the existing zinc-text-forced-white override rule was left in place since it's now effectively admin-only (no other files use zinc-* classes anymore).
- Verified via `tsc --noEmit` (clean, aside from one pre-existing unrelated `resend` module resolution error caused by this sandbox's `node_modules` not being fully installed — not something introduced by this change). Could not run a live preview from the sandbox (no network access to fetch Next's SWC binary for this environment) — Bill verified locally via `npm run dev`.
- **Scoping notes for next time**: admin panel (`/admin/**`) intentionally NOT touched — still dark zinc theme. "About Us" and "Packages" nav links point at the closest existing pages (`/how-it-works`, `/pricing`) rather than new dedicated pages, since no new pages were requested. No real shopping cart or best-seller tracking was built — flagged explicitly to Bill/Gary before starting.
- **Contrast pass (same session, after Bill/Gary reviewed live)**: muted navy body text (`text-[#0A3161]/NN` — used for secondary text like dates, facility/inmate info, descriptions, delivery status) was too light/washed-out on white, hard to read per Gary's feedback. Darkened every opacity tier site-wide: `/40→/58`, `/45→/68`, `/50→/72`, `/60→/78`, `/70→/85`; placeholder text `/45→/55` (kept slightly lighter than body text, standard placeholder convention). Applied uniformly across all non-admin files via the same sed-based sweep pattern as the initial reskin, so hierarchy (headings full-strength navy → body /78-85 → placeholders/labels /55-72) stays consistent everywhere, not just `/my-orders` where Bill spotted it.

## "Use a Credit" Double-Charge Bug (session Aug 26 2026, follow-up)

Right after the RLS fix let Bill see his packages, he clicked "Use a Credit" on a package and got charged $0.99 for the image — separate from his package credits. Root cause: the button (`app/my-orders/page.tsx`, subscriptions tab) linked to `/order?plan=single`, which just opens the normal single-image $0.99 checkout — it never touched `subscriptions.images_remaining` or created a free `order_item`/`delivery_queue` entry. No redemption API route existed anywhere in `app/api/`; the button was wired to the wrong flow (or a leftover from an earlier plan that was never finished). Confirmed via SQL the resulting charge was Stripe **test mode** (`cs_test_...`), so no real money moved.

Asked Bill whether to build real self-serve credit redemption or keep the existing admin-curated model (customer picks categories at checkout, admin pulls actual images from that pool during fulfillment — see "Package Image-Browsing Fix" above). He chose to keep it admin-curated. Fix: removed the "Use a Credit" button entirely and replaced it with static copy — "No need to pick images yourself — we send them to your recipient from your chosen categories as your credits are used." No new redemption feature was built; not needed under the chosen model.

## Missing RLS Policy on `subscriptions` (session Aug 26 2026)

Bill reported: pay for a package/subscription, then `/my-orders` → "Plans & Packages" tab shows nothing. Confirmed via direct SQL that the `subscriptions` rows were being created correctly by the Stripe webhook (right `customer_email`, right plan, `status: active`) — the data was fine. Root cause: `subscriptions` had RLS enabled but only a `service_role_all` policy; unlike `orders` (which has `users_select_own_orders`), there was no policy letting an `authenticated` customer SELECT their own rows by email. The page's browser-side Supabase client queried `subscriptions.eq("customer_email", userEmail)` and RLS silently returned zero rows — no error, just empty. Fixed via migration `add_users_select_own_subscriptions_policy`: added `users_select_own_subscriptions` (SELECT, `authenticated`, `customer_email = auth.jwt()->>'email'`), mirroring the existing orders policy. No code/deploy needed — this was a DB-only fix, live immediately. Bill should refresh `/my-orders` and confirm his existing packages/subscriptions now show up.

## Design Critique Round 2 — Soft-Launch Punch List (session Aug 26 2026)

Gary sent a much deeper 10-section critique after seeing the reskin live, ending with an explicit "ship-before-soft-launch (design only)" 7-item list. Worked through that punch list plus a few directly-related items from the fuller critique:

- **Homepage no longer leads with glamour content**: new `lib/sensitiveCategories.ts` (`bikinis`, `lingerie`, `female-models`, `pin-up`) is excluded from the homepage feed — both the SSR initial load in `app/page.tsx` and the infinite-scroll pagination (`/api/catalog/images?exclude=sensitive`, wired from `HomeStoreGrid.tsx`). `/catalog` is untouched and still shows every category, including these — just not what a first-time visitor sees on the homepage.
- **"Broken card" re-checked**: grepped every customer-facing use of `image.prompt` — all of it is `alt=` text now (safe fallback), the one earlier bug (raw prompt as a visible caption) was already fixed on Aug 25 and had likely just not been looked at post-deploy. No remaining code issue found.
- **Hero simplified**: killed the redundant "FRIENDS BEHIND BARS" eyebrow (logo already says it), cut hero copy to one line, price moved into the primary CTA ("Browse photos — $0.99"), section height reduced.
- **Trust row**: cut from 4 items to 3 (Reviewed / Delivered to Tablet / $0.99 · 1–2 Day Delivery), single duotone navy/red icon style, added one proof line below ("Works with Securus Snap & Send and JPay facility tablets").
- **Catalog grid rebuilt**: `CatalogInfiniteScroll.tsx` switched from masonry `columns-*` to a uniform `aspect-[4/5]` grid (mirrors homepage grid). `CatalogImageCard.tsx` rewritten — Approved is now a small amber corner stamp directly on the photo (was a green pill on a white slab below it), and title + Select live in a bottom gradient overlay that's persistent on mobile and hover-revealed on desktop.
- **Contact page**: added real `<label>`s above every field (was placeholder-only), added a sidebar (Response Time / What You Can Ask / Subscription Changes) next to the form, tightened header height.
- **How It Works**: steps section rebuilt as a horizontal 4-step timeline with a connecting line on desktop, stacked with the same line vertically implied on mobile; header height reduced.
- **Pricing**: verified "1 Image" already has a real space in the DB and renders correctly — likely a kerning/screenshot artifact, not a text bug. Package/subscription cards: the "Popular"-badged card now gets a visual size bump (`shadow-xl` + `scale-105`) so there's one clear default choice instead of every card reading the same weight; added "Credits never expire · one recipient per pack" / "One recipient per subscription" directly on the cards instead of only in FAQ copy.
- **Color direction**: accent shifted from rose-magenta `#9C2B44`/`#7A2036` → brick/clay `#A6412B`/`#8C3520` site-wide (same sed-sweep pattern, admin excluded). "Best Value" badges and all savings/discount text switched from green → amber (`amber-400`/`amber-700`) so green stays reserved for functional status (paid, confirmed, allowed) per the existing rule. Nav logo: removed the white circle disc around the shield mark (sits directly on the navy bar now, white-stroked for contrast), wordmark tightened to `tracking-tighter`.
- **Favicon/PWA icons**: previously just the default Next.js placeholder `favicon.ico` and no `icon-192.png`/`icon-512.png` at all (the `/install` page's manifest referenced files that didn't exist). Generated a real brand favicon (navy rounded-square + red shield mark) via `cairosvg`/Pillow, added `public/icon-192.png` + `public/icon-512.png`, and updated `app/manifest.ts`'s `background_color`/`theme_color` from the old dark-theme values (`#09090b`/`#f59e0b`) to match the current palette (`#FAF8F5`/`#0A3161`).

**Explicitly NOT done this round (bigger/subjective, flagged rather than built silently):**
- Full "art direction" pass on photography itself (consistent color grading of thumbnails, homepage cut down to 8–12 curated best images + "See all 800+" instead of full infinite scroll) — real curation work, not a code fix.
- Hero as an actual photo/tablet mockup instead of a text-on-navy band — needs a real image asset, not generated here.
- Full nav simplification (fold Packages + Subscriptions into Pricing, single "Send a photo" CTA) — changes site IA, worth confirming before touching live nav structure.
- "Paper and tablets" craft pass (print-style card borders/rotation, paper texture backgrounds) and mobile-specific layout work (sticky compact header, 2-col mobile grid, horizontal-scroll filters) — lower-priority polish per the critique's own ordering, left for a follow-up pass.

## Package Image-Browsing Fix (session Aug 25 2026, follow-up)

Bill hit "no place to click to look at pictures" when selecting the 5-image package at checkout. Two real issues found and fixed:
- **Data bug**: `product_plans` row for `five-pack` ($4.49, 5 images) had `plan_type = 'individual'` instead of `'package'` — every other multi-image plan was typed correctly. `app/order/page.tsx` step 2 only renders a picker for `individual && image_count === 1` (single-image flow) or `package`/`subscription` (category flow) — the five-pack matched neither, so step 2 rendered nothing to select. Fixed via direct SQL: `update product_plans set plan_type = 'package' where slug = 'five-pack'`. No code/deploy needed.
- **UX gap**: package/subscription plans only ever had a category-tag picker, never showed actual photos. Added a live preview grid to `app/order/page.tsx` — when categories are selected, it fetches up to 24 real approved thumbnails from those categories via Supabase (`generated_images` filtered by `category_slug IN (...)`, `status = 'approved'`) plus an exact count, shown read-only under the category picker. Per Bill's choice, this is preview-only — customers don't hand-pick each of their N images; the actual images for a package/subscription still get pulled from that category pool at fulfillment time (or delivered daily for subscriptions).
- Bill's test order `#81023bca` (five-pack, $4.49) is stuck at `status: pending` with no `stripe_checkout_session_id` — it was an abandoned test from before the fix, not a real charge. Harmless, left as-is.
- **Worth auditing**: only `five-pack` was found mistyped — the other 9 plans (`single`, `pack-10/20/50/100`, `sub-30/90/180/365`) were all confirmed correctly typed. No reason to suspect more, but if another plan ever shows a blank step 2 again, check `product_plans.plan_type` first.

## Aesthetic + Bug Feedback Round (session Aug 25 2026)

Gary sent a design critique (broken cards, no hero, weak trust signals, About Us 404) plus Bill relayed 7 functional notes. Findings and fixes:

**Fixed:**
- **Broken/spammy product cards** — root cause was never actually broken images; it was raw `prompt` text being shown as the card title. `prompt` holds 3 incompatible formats depending on import source (Pexels clean captions, Pixabay comma-spammed keyword-tag dumps, Unsplash photographer-credit/CTA text) — never fit for customer display. Fix: new `lib/categoryLabel.ts` humanizes `category_slug` (e.g. `female-models` → "Female Models") and now replaces raw-prompt display everywhere: `HomeStoreGrid.tsx`, `CatalogInfiniteScroll.tsx`, `catalog/[id]/page.tsx`, `order/page.tsx`, `my-orders/page.tsx`, `favorites/page.tsx`. Underlying `prompt` data was NOT touched/cleaned — this is a display-layer fix only.
- **"About Us" (`/how-it-works`) asking logged-in users to sign in** — wasn't an actual auth wall, just static CTA copy ("Create Account") that didn't check session state. Converted the page to `"use client"` (new `app/how-it-works/layout.tsx` added to carry `metadata`, since client pages can't export it), added a Supabase session check, and every CTA now swaps to logged-in variants (e.g. "View My Orders" instead of "Create Account").
- **"Harsh magenta" / "clinical pure white"** — softened the accent from `#B31942`→`#9C2B44` (hover `#8f1434`→`#7A2036`) and background from pure white→`#FAF8F5` warm off-white, site-wide across all customer-facing files via sed sweep. Admin panel untouched (still dark theme, as before).
- **No hero / no trust signals above the fold** — added a hero section to `app/page.tsx` (navy gradient band, headline, subhead, "Browse the Catalog" / "How It Works" CTAs) plus a 4-item trust strip directly below it (Facility-Approved, Reviewed by Our Team, Works with Securus & JPay, 1–2 Day Delivery) before the product grid.

**Investigated, needs Bill's input:**
- Notes #2 ("recipient info not autofilling at checkout") and #3/#4 ("can't pick a category for packages/subscriptions") — code review of `app/order/page.tsx` shows both features already fully built and look correct: a "Choose Categories" multi-select for package/subscription plans (validates ≥1 category picked) and a "Saved Recipients" picker that fills name/inmate#/facility/state on click. Since the code looks right, this is either (a) a stale-deploy/cache issue on Bill's end, or (b) a real bug not visible from static review (e.g. an RLS policy silently blocking the `inmate_contacts` query at runtime). **Needs Bill to retest on the live site and report exactly what happens** (error message, blank state, etc.) before further action.

**Confirmed as real gaps, not yet built (need scoping before starting):**
- **Multi-item cart** (note #1) — checkout only ever submits one plan per order today; no way to combine a single image + package + subscription in one cart/checkout.
- **Multi-recipient orders** (note #6) — no way to send to more than one inmate in a single order; would need new schema, checkout API, and Stripe/webhook changes.

These two are bigger architecture changes than the rest of this list — worth a quick scoping conversation (how urgent vs. the Stripe live-mode switch and Securus automation work already queued) before building.

## Priority List for Next Session (updated Aug 17 2026 audit)

1. ~~Fix email~~ — **DONE (Aug 17 2026, same night).** `RESEND_API_KEY` was missing from Vercel production entirely — created a new Resend API key (`friendsbehindbars production`, Sending-access only) and added it to Vercel. Also found `friendsbehindbars.com` domain in Resend was stuck at "Not Started" — added the missing DNS records at Namecheap (DKIM TXT `resend._domainkey`, SPF TXT `send`, MX `send` → `feedback-smtp.us-east-1.amazonses.com` priority 10, DMARC TXT `_dmarc`), verified in Resend (went to Pending → should finish propagating shortly after). Redeployed production, then sent a real test message through `/contact` — confirmed **Delivered** in Resend's email log. Email is fully working end to end now.
2. **Switch Stripe back to live mode — very likely still in test mode right now.** Vercel won't let you re-reveal a "Sensitive" env var once saved (by design), so this couldn't be 100% confirmed by reading the value directly, but: the `STRIPE_SECRET_KEY` currently in Vercel production was added tonight as part of a rotation done explicitly in Stripe's **Test mode** — meaning the live key rotation from this priority item is still outstanding. Fix: Stripe dashboard → switch OFF Test mode/Sandbox → Developers → API keys → get `sk_live_...` and `pk_live_...` → Vercel → update `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → also restore `STRIPE_WEBHOOK_SECRET` to the live value (from the `empowering-voyage` webhook) → Redeploy. Test with a real $0.99 order afterward to confirm.
3. ~~Add CRON_SECRET to Vercel~~ — **already done**, confirmed present in Vercel production (added May 21). Daily report cron itself is still intentionally paused (`vercel.json`), separate decision — turn back on if wanted.
4. **Fill empty categories** — `node fill-empty-categories.mjs` → review in admin → `node reactivate-filled-categories.mjs` (status not re-checked tonight)
5. **Call Securus to add email to account** — blocks all Snap & Send automation work
6. ~~Optional cleanup~~ — **DONE (Aug 23 2026).** Deleted the unused `GMAIL_USER` / `GMAIL_APP_PASSWORD` env vars from Vercel production (old email system, no longer used now that Resend is confirmed working) and redeployed; also removed them from local `.env.local`. Separately, found the live-mode Stripe key literally named `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` was actually a live **secret** key (`sk_live_...HAIb`), not the publishable key — renamed it in Stripe's dashboard (Developers → API keys, Live mode) to `DO NOT USE - LIVE SECRET KEY (was mislabeled as publishable)` so nobody copies it into a public-facing var by mistake. The correctly-labeled live secret key in use is "Friends Behind Bars Live" (`sk_live_...tMdn`).
7. ~~Fix "Plan not found" checkout error~~ — **DONE (Aug 23 2026).** Bill reported the error while doing a live test purchase on `/order`. Root cause: `SUPABASE_SERVICE_ROLE_KEY` in Vercel production (and in `.env.local`) was set to `sb_secret_f8T3RAM...` — a new-style Supabase secret key that was never actually created/registered in the Supabase project (confirmed via a direct API call that returned `"Unregistered API key"`). Because `/api/checkout/create` uses this key to query `product_plans` server-side, every lookup 401'd and the route's catch-all logic reported it as "Plan not found." (the `product_plans` table and RLS policies were fine the whole time — `single` plan slug confirmed active at $0.99). Fix: pulled the real key from Supabase dashboard → Settings → API Keys → "Legacy anon, service_role API keys" tab → Reveal on `service_role` → copied the JWT → replaced the value in Vercel's `SUPABASE_SERVICE_ROLE_KEY` (Production) → Redeployed → confirmed via a direct `fetch()` to `/api/checkout/create` that the plan lookup now succeeds (response changed from "Plan not found" 404 to the expected "imageId is required" 400 for a test call with no image). Also updated the same key in local `.env.local` for consistency. Bill still needs to do his own test purchase through the actual `/order` UI to confirm the full flow (image → recipient → Stripe test checkout → confirmation email).
8. ~~Fix "email rate limit exceeded" on signup~~ — **DONE (Aug 23 2026).** Bill hit this while creating a fresh test account on `/signup`. Root cause: Supabase Auth was still using its default built-in email service for signup confirmations, which Supabase caps at 2 emails/hour and explicitly documents as not meant for production apps (confirmed in dashboard: Authentication → Emails showed the "Set up custom SMTP" warning banner, and Authentication → Rate Limits showed `2 emails/h`). This is separate from the app's own order/contact/delivery emails, which already went through Resend via `lib/email.ts` — Supabase Auth's own emails (signup confirm, password reset, magic link) were never wired to Resend. Fix: Authentication → Emails → SMTP Settings → enabled custom SMTP → sender `orders@friendsbehindbars.com` / "Friends Behind Bars" → host `smtp.resend.com`, port 465 → username `resend` → password = a brand-new dedicated Resend API key (`friendsbehindbars supabase auth smtp`, Sending-access only, scoped to friendsbehindbars.com domain — a fresh key was created rather than reusing the app's existing Resend key, since Resend never re-displays a key's value after creation) → Saved. Confirmed via Rate Limits page: sending-email limit changed from `2 emails/h` to `30 emails/h` immediately after saving. Bill retried signup himself on `/signup` (`fbbpictures@gmail.com`) — confirmation email arrived, confirmed via his own screenshot.
9. ~~Fix missing order confirmation email~~ — **DONE (Aug 23 2026).** Bill did a real test purchase right after the signup fix and got no order confirmation email. Root cause: `STRIPE_WEBHOOK_SECRET` in Vercel didn't match the signing secret of Stripe's actual test-mode webhook (`upbeat-excellence`) — all `checkout.session.completed` deliveries were failing with `400 "Invalid webhook signature."`, so the webhook handler (which both marks orders paid AND sends the confirmation email) never ran. Fix: pulled the correct signing secret from Stripe → updated `STRIPE_WEBHOOK_SECRET` in Vercel → redeployed → resent the failed webhook event from Stripe (now `200 OK`) → confirmed order `ae1dedda...` flipped to `status: "paid"` → confirmed "Single Image Confirmed" email shows **Delivered** in Resend's log. Full loop verified working. Local `.env.local`'s `STRIPE_WEBHOOK_SECRET` also updated to match (`whsec_F4yYW5pzf7uohZwNl1Wx2ompluWuWKYe`) — no remaining gap.

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

## Vercel Env Vars (production) — full inventory confirmed Aug 17 2026

| Var | Purpose | Note |
|-----|---------|------|
| `STRIPE_SECRET_KEY` | Stripe secret key | **Rotated tonight in TEST mode — likely still test, not live. See Priority #2.** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Check matches live/test alongside secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Must match whichever mode the secret key is in |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zgcqbvvvwbgpbgaofkmg.supabase.co` — baked into client bundle | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy JWT anon key | |
| `SUPABASE_URL` | Runtime server-side Supabase URL | |
| `SUPABASE_ANON_KEY` | Runtime server-side anon key | |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin API routes | |
| `NEXT_PUBLIC_SITE_URL` | https://friendsbehindbars.com | |
| `NEXT_PUBLIC_ADMIN_EMAIL` | ssoup1@protonmail.com | |
| `CRON_SECRET` | Auth for `/api/cron/daily-report` | Confirmed present (added May 21) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin basic-auth (Production + Development variants both exist) | |
| `OPENAI_API_KEY` | Used somewhere in the app (not audited tonight) | |
| `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` | Import scripts | |
| `VERCEL_OIDC_TOKEN` | Vercel-managed, ignore | |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Old email system, unused now | **Deleted from Vercel and `.env.local` Aug 23 2026** |
| `RESEND_API_KEY` | Resend sending key, "friendsbehindbars production" (Sending-access only) | **Added Aug 17 2026** — confirmed working (contact form test showed "Delivered" in Resend's log) |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` | Not set | Optional — `lib/email.ts` has working defaults (`orders@friendsbehindbars.com` / `ssoup1@gmail.com`) if left unset |
| `NEXT_PUBLIC_APP_URL` | Not found in production list tonight | Code falls back to `NEXT_PUBLIC_SITE_URL` fine, but confirm if anything depends on it directly |
| `PIXABAY_API_KEY` | Import script | Present in `.env.local` for local dev; not checked in Vercel prod tonight |

## .env.local Keys (local dev)

- `UNSPLASH_ACCESS_KEY` — Unsplash API key
- `PEXELS_API_KEY` — Pexels API key
- `PIXABAY_API_KEY` — Pixabay API key
- `SUPABASE_SERVICE_ROLE_KEY` — used by import scripts for DB writes
