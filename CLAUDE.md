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

## Image Status Flow

`pending_review` → (admin approves) → `approved` (shows in catalog)  
`pending_review` → (admin rejects) → `rejected`

Bulk import script: `bulk-import.mjs` in project root — imports ~5 images per category from Unsplash, inserts as `pending_review`.

## Current State (end of session June 7 2026)

- Login working ✓ (fixed NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel)
- Catalog working ✓ (8 approved images, 18 categories)
- Admin panel working ✓ at /admin — login, review queue, approve/reject
- 90 Unsplash images imported, sitting in `pending_review` — ready for Bill to approve
- Admin nav link added to desktop nav (amber) and mobile menu

## Pending / Next Steps

- Bill needs to approve (or reject) the 90 pending images via /admin → Review Queue
- Task #13 still open: Update catalog image cards to link to the image detail page (`/catalog/[id]`)
- Consider adding bulk-approve button to admin for efficiency
- The `NEXT_PUBLIC__ASE_ANON_KEY` typo variable in Vercel can be deleted (it's a duplicate of `NEXT_PUBLIC_SUPABASE_ANON_KEY` with a display artifact)

## Vercel Env Vars (production)

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL baked into client bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key baked into client bundle |
| `SUPABASE_URL` | Runtime server-side Supabase URL |
| `SUPABASE_ANON_KEY` | Runtime server-side anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin API routes |
| `NEXT_PUBLIC_SITE_URL` | https://friendsbehindbars.com (used for Stripe redirects) |
| `NEXT_PUBLIC_APP_URL` | Same as above |
| `NEXT_PUBLIC_ADMIN_EMAIL` | ssoup1@protonmail.com |
