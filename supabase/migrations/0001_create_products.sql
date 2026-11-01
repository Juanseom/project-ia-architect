-- Tabla de productos con Row Level Security: cada usuario solo ve y modifica lo suyo.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  sku text not null unique,
  category text not null check (category in ('reciclado', 'reutilizable', 'biodegradable', 'otro')),
  stock integer not null default 0 check (stock >= 0),
  carbon_footprint_kg numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select_own" on public.products
  for select using (auth.uid() = owner_id);

create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = owner_id);

create policy "products_update_own" on public.products
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "products_delete_own" on public.products
  for delete using (auth.uid() = owner_id);
