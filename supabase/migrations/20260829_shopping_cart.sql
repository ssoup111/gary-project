-- Shopping cart: multi-item checkout
-- Adds carts + cart_items, and the columns fulfillment needs to trace
-- which plan produced which delivered photo.

-- ============================================================
-- carts
-- ============================================================
create table if not exists public.carts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One active cart per signed-in customer.
create unique index if not exists carts_one_active_per_user
  on public.carts(user_id) where status = 'active';

-- ============================================================
-- cart_items
-- ============================================================
create table if not exists public.cart_items (
  id                  uuid primary key default gen_random_uuid(),
  cart_id             uuid not null references public.carts(id) on delete cascade,
  item_type           text not null check (item_type in ('image', 'plan')),
  generated_image_id  uuid references public.generated_images(id) on delete cascade,
  plan_id             uuid references public.product_plans(id) on delete cascade,
  category_slugs      text[] not null default '{}',
  price_cents         integer not null default 0,
  created_at          timestamptz not null default now(),

  -- An image row carries an image; a plan row carries a plan. Never both.
  constraint cart_items_shape check (
    (item_type = 'image' and generated_image_id is not null and plan_id is null)
    or
    (item_type = 'plan'  and plan_id is not null and generated_image_id is null)
  )
);

create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);

-- A customer cannot add the same photo to the same cart twice.
-- Plans have no such limit: the same 50-pack can be added again with
-- a different set of categories.
create unique index if not exists cart_items_no_duplicate_image
  on public.cart_items(cart_id, generated_image_id)
  where item_type = 'image';

-- ============================================================
-- order_items: trace plan-sourced photos
-- ============================================================
alter table public.order_items
  add column if not exists plan_id uuid references public.product_plans(id),
  add column if not exists source  text not null default 'individual';

-- 'individual' = customer picked this photo by hand.
-- 'plan'       = auto-selected to fill a package plan.
alter table public.order_items
  drop constraint if exists order_items_source_check;
alter table public.order_items
  add constraint order_items_source_check check (source in ('individual', 'plan'));

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- ============================================================
-- orders: shortfall + item count for the admin view
-- ============================================================
alter table public.orders
  add column if not exists item_count        integer not null default 0,
  add column if not exists fulfillment_notes text;

-- ============================================================
-- Row level security
-- ============================================================
alter table public.carts      enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists "own cart" on public.carts;
create policy "own cart" on public.carts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own cart items" on public.cart_items;
create policy "own cart items" on public.cart_items
  for all
  using (
    exists (select 1 from public.carts c
            where c.id = cart_items.cart_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.carts c
            where c.id = cart_items.cart_id and c.user_id = auth.uid())
  );

-- ============================================================
-- Grants (required since the October 2026 policy change)
-- ============================================================
grant select, insert, update, delete on public.carts      to anon, authenticated;
grant select, insert, update, delete on public.cart_items to anon, authenticated;
