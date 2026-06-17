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

## Current State (end of session June 16 2026)

- Login working ✓
- Catalog working ✓ — broken image fallback added (`components/catalog/CatalogImageCard.tsx`)
- Admin panel working ✓ — bulk approve/reject with checkboxes, Select All, Approve/Reject Selected
- Unsplash + Pexels images importing and displaying correctly ✓
- ~400 anime illustrations pending review in admin (Pixabay illustration-only import, `import-pixabay-anime.mjs`)
- Duplicate protection in place ✓ (DB UNIQUE constraint on `image_url` + `on_conflict` param)
- 35 categories live in DB ✓
- Stripe payments working ✓ — live mode, $1.99 per image, tested and confirmed paid ($0.36 goes to Stripe fees, $1.63 deposited)
- Live Stripe webhook registered: `empowering-voyage` → `https://friendsbehindbars.com/api/stripe-webhook` → `checkout.session.completed`
- STRIPE_WEBHOOK_SECRET updated in Vercel with live webhook signing secret ✓
- Fulfillment queue built ✓ — `/admin/delivery` shows image + JPay recipient info + download button + "Mark as Sent" → emails customer
- Stripe business verification: COMPLETE ✓ (charges_enabled, payouts_enabled, details_submitted all true)
- Customer confirmation email: WORKING ✓ (GMAIL_USER + GMAIL_APP_PASSWORD set in Vercel)
- facilities table: unique constraint added on (name, state) ✓
- JPay/Securus facility scraper: IN PROGRESS — `scrape-jpay-playwright.mjs` written but silent error on last run; `jpay-test.mjs` diagnostic ready to run

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

## Priority List for Next Session

1. **Run JPay diagnostic** — `cd ~/Desktop/jpix && node jpay-test.mjs` — paste output so scraper can be fixed
2. **Fix scraper + import facilities** — once diagnostic shows what's wrong, fix `scrape-jpay-playwright.mjs`, run it, then run `import-facilities.mjs`
3. **Switch Stripe to test mode** — get test keys from Stripe dashboard, update Vercel env vars
4. **Build facility typeahead UI** — state dropdown + type-to-search, wire into checkout/order flow
5. **Approve the ~400 anime images** — use bulk checkboxes in admin panel
6. **Fix RLS security** — 10 tables have RLS disabled, needs fixing before public launch

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
