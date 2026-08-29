-- A paid order can contain several package/subscription lines, each with
-- its own set of chosen categories. order_items holds the individual
-- pictures; this holds the plan lines.
create table if not exists public.order_plans (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  plan_id         uuid not null references public.product_plans(id),
  category_slugs  text[] not null default '{}',
  price_cents     integer not null default 0,
  image_count     integer not null default 0,
  fulfilled       boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists order_plans_order_id_idx on public.order_plans(order_id);

alter table public.order_plans enable row level security;

-- Customers read their own plan lines through the parent order; all writes
-- happen server-side with the service role.
drop policy if exists "read own order plans" on public.order_plans;
create policy "read own order plans" on public.order_plans
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_plans.order_id
        and o.customer_email = auth.jwt() ->> 'email'
    )
  );

grant select on public.order_plans to anon, authenticated;
