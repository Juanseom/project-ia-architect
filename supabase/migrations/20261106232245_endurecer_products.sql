-- Lab 5 · Hallazgo H1: endurecimiento de public.products (tabla heredada de EcoTech).
-- Problemas probados con PoC (docs/AUDITORIA_LAB5.md):
--   a) anon y authenticated tenían TODOS los privilegios por defecto (incluido TRUNCATE, que RLS no controla).
--   b) Políticas sin `to authenticated` (aplicaban a public) y con auth.uid() sin envolver en select.
--   c) UNIQUE(sku) global: un usuario podía saber si un SKU privado de otro existe (409 vs 201) y "secuestrarlo".
--   d) El cliente podía fijar o modificar created_at.
-- La migración 0001 no se edita (ya aplicada): se corrige aquí.

-- a) Privilegios mínimos: nada para anon; authenticated solo lo que la app necesita, por columnas.
revoke all on table public.products from anon, authenticated;
grant select, delete on table public.products to authenticated;
grant insert (name, sku, category, stock, carbon_footprint_kg) on table public.products to authenticated;
grant update (name, sku, category, stock, carbon_footprint_kg) on table public.products to authenticated;

-- c) Unicidad por dueño: cada empresa tiene su propio espacio de SKUs; ya no hay oráculo entre usuarios.
alter table public.products drop constraint products_sku_key;
alter table public.products add constraint products_owner_sku_key unique (owner_id, sku);
-- El índice único (owner_id, sku) también sirve a las políticas RLS por owner_id.

-- b) Políticas solo para usuarios autenticados y con (select auth.uid()) evaluado una vez por consulta.
drop policy "products_select_own" on public.products;
drop policy "products_insert_own" on public.products;
drop policy "products_update_own" on public.products;
drop policy "products_delete_own" on public.products;

create policy "products_select_own" on public.products
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "products_insert_own" on public.products
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "products_update_own" on public.products
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "products_delete_own" on public.products
  for delete to authenticated using (owner_id = (select auth.uid()));
