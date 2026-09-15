-- A delivery job can now carry dozens of pictures. Whoever is sending them
-- needs to know which ones already went, so progress survives closing the tab.
alter table public.order_items
  add column if not exists delivered_at timestamptz;

create index if not exists order_items_delivered_idx
  on public.order_items(order_id, delivered_at);
