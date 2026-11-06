-- EcoTrack · Mediciones de emisiones de CO2 por usuario.
-- Seguridad: RLS desde el día 1 + privilegios por columna (el cliente nunca fija owner_id ni medido_en).

-- 1. Tipo cerrado para la categoría (coincide con EmissionCategory en src/types/emission.ts).
create type public.categoria_emision as enum ('transporte', 'energia', 'residuos');

-- 2. Tabla.
create table public.emisiones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fuente text not null check (char_length(trim(fuente)) between 2 and 100),
  categoria public.categoria_emision not null,
  co2_kg numeric(12, 2) not null check (co2_kg > 0),
  medido_en timestamptz not null default now()
);

comment on table public.emisiones is 'Mediciones de CO2 (kg CO2e) registradas por cada usuario de EcoTrack.';

-- 3. Índice para el listado (where owner_id = ... order by medido_en desc) y para la política RLS.
create index emisiones_owner_medido_idx on public.emisiones (owner_id, medido_en desc);

-- 4. Privilegios. Supabase concede ALL a anon/authenticated en public por defecto:
--    sin este revoke, el grant por columnas no protegería owner_id.
revoke all on table public.emisiones from anon, authenticated;
grant select on table public.emisiones to authenticated;
grant insert (fuente, categoria, co2_kg) on table public.emisiones to authenticated;

-- 5. Row Level Security: cada usuario solo lee e inserta lo suyo. Sin update ni delete.
alter table public.emisiones enable row level security;

create policy "emisiones_select_propias"
  on public.emisiones
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "emisiones_insert_propias"
  on public.emisiones
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));
