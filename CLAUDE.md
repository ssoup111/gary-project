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

Three import scripts pull images from stock photo APIs into `pending_review`:

| Script | Source | Notes |
|--------|--------|-------|
| `bulk-import.mjs` | Unsplash | Caps at 30/category (free API limit), page 2 |
| `pexels-import.mjs` | Pexels | 55/category, page 1 |
| `pixabay-import.mjs` | Pixabay | 55/category, page 1, uses `webformatURL` (not `largeImageURL`) |
| `import-cars.mjs` | All 3 | Targeted: Hot Rods + Supercars only, 40 each |

All scripts read API keys from `.env.local` automatically. Duplicate protection is enforced at the DB level (`generated_images.image_url` has a UNIQUE constraint) and all scripts use `resolution=ignore-duplicates`.

To run: `cd ~/Desktop/jpix && node <script-name>.mjs`

## Categories (35 total)

animals, anime, beaches, big-cats, bikinis, boxing-mma, cars-motorcycles, celebrity, costume, faith, fantasy, female-models, food, funny, hip-hop, hot-rods, inspirational, lingerie, lowriders, male-models, military, miscellaneous, music, native-american, nature, old-school, pin-up, seasonal, sports, supercars, tattoo-art, western, wolves-eagles, yoga

Note: "yoga-pants" was renamed to "yoga" — slug updated in DB and all images reassigned.

## Current State (end of session June 9 2026)

- Login working ✓
- Catalog working ✓
- Admin panel working ✓ at /admin
- Bulk approve/reject added to admin ✓ — checkboxes on each card, Select All, Approve Selected, Reject Selected
- 3 stock photo import scripts working ✓ (Unsplash, Pexels, Pixabay)
- Duplicate protection in place ✓ (DB unique constraint + ignore-duplicates on insert)
- 35 categories live in DB ✓
- Pixabay API key added to `.env.local` ✓
- Bulk approve UI deployed — Bill needs to push latest commit if not yet done

## Known Issues / Pending

- **Pixabay images don't preview in admin** if imported with `largeImageURL` — those should be rejected and re-imported (script now uses `webformatURL` which works correctly)
- **Hot Rods import** — previous bad query ("flame") pulled candles/fires. Query fixed to just "hot rod". Reject the bad ones in admin and re-run `node import-cars.mjs`
- **Bulk approve UI** — code written and pushed but Bill should verify it's deployed and working at /admin
- **Task #13** — catalog image cards linking to `/catalog/[id]` — believed to already be in place but not formally confirmed

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
- `PIXABAY_API_KEY` — Pixabay API key (added June 9 2026)
- `SUPABASE_SERVICE_ROLE_KEY` — used by import scripts for DB writes
