-- EcoFlow · Gestión de proyectos de instalación de paneles solares (proyecto final).
-- Especificación: docs/prompts/08-prompt-maestro-ecoflow.md
-- Roles derivados de los datos (nunca de metadata del cliente):
--   coordinador = dueño del espacio (coordinador_id = auth.uid())
--   instalador  = usuario vinculado a una fila de instaladores (user_id = auth.uid()) mediante código de invitación.

-- ============================================================================ tipos
create type public.estado_proyecto as enum ('pendiente', 'en_progreso', 'completado');
create type public.especialidad_instalador as enum ('general', 'electrica', 'estructural', 'mantenimiento');
create type public.unidad_material as enum ('unidad', 'metro', 'kg', 'juego');

-- ============================================================================ tablas
create table public.instaladores (
  id uuid primary key default gen_random_uuid(),
  coordinador_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_id uuid unique references auth.users (id) on delete set null,
  nombre text not null check (char_length(trim(nombre)) between 2 and 80),
  especialidad public.especialidad_instalador not null default 'general',
  -- 10 caracteres hex (~1,1 billones de combinaciones) generados por la BD; un solo uso.
  codigo_invitacion text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  vinculado_en timestamptz,
  created_at timestamptz not null default now(),
  -- Destino de las FK compuestas: permite exigir "mismo coordinador" en proyectos.
  constraint instaladores_id_coordinador_key unique (id, coordinador_id),
  constraint instaladores_no_autovinculo check (user_id is null or user_id <> coordinador_id)
);

create table public.materiales (
  id uuid primary key default gen_random_uuid(),
  coordinador_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(trim(nombre)) between 2 and 80),
  unidad public.unidad_material not null default 'unidad',
  costo_unitario numeric(12, 2) not null default 0 check (costo_unitario >= 0),
  created_at timestamptz not null default now(),
  constraint materiales_id_coordinador_key unique (id, coordinador_id),
  constraint materiales_nombre_por_coordinador_key unique (coordinador_id, nombre)
);

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  coordinador_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  instalador_id uuid,
  nombre text not null check (char_length(trim(nombre)) between 3 and 120),
  cliente text not null check (char_length(trim(cliente)) between 2 and 120),
  ubicacion text not null check (char_length(trim(ubicacion)) between 2 and 160),
  capacidad_kw numeric(8, 2) not null check (capacidad_kw > 0 and capacidad_kw <= 100000),
  estado public.estado_proyecto not null default 'pendiente',
  fecha_inicio date not null,
  fecha_fin_estimada date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proyectos_fechas_check check (fecha_fin_estimada >= fecha_inicio),
  constraint proyectos_id_coordinador_key unique (id, coordinador_id),
  -- FK compuesta: el instalador debe pertenecer al MISMO coordinador. Al borrarlo, solo instalador_id queda en null.
  constraint proyectos_instalador_fkey foreign key (instalador_id, coordinador_id)
    references public.instaladores (id, coordinador_id) on delete set null (instalador_id)
);

-- Tabla intermedia N:M proyecto ↔ material con cantidad.
create table public.proyecto_materiales (
  proyecto_id uuid not null,
  material_id uuid not null,
  coordinador_id uuid not null default auth.uid(),
  cantidad numeric(10, 2) not null check (cantidad > 0),
  primary key (proyecto_id, material_id),
  constraint proyecto_materiales_proyecto_fkey foreign key (proyecto_id, coordinador_id)
    references public.proyectos (id, coordinador_id) on delete cascade,
  constraint proyecto_materiales_material_fkey foreign key (material_id, coordinador_id)
    references public.materiales (id, coordinador_id) on delete restrict
);

-- ============================================================================ índices (FKs y columnas de RLS)
create index instaladores_coordinador_idx on public.instaladores (coordinador_id);
create index proyectos_coordinador_estado_idx on public.proyectos (coordinador_id, estado);
create index proyectos_instalador_idx on public.proyectos (instalador_id, coordinador_id);
create index proyecto_materiales_material_idx on public.proyecto_materiales (material_id, coordinador_id);
-- instaladores.user_id y materiales(coordinador_id, nombre) ya tienen índice por sus UNIQUE.

-- ============================================================================ privilegios (mínimos, por columna)
revoke all on table public.instaladores, public.materiales, public.proyectos, public.proyecto_materiales
  from anon, authenticated;

grant select, delete on table public.instaladores to authenticated;
grant insert (nombre, especialidad), update (nombre, especialidad) on table public.instaladores to authenticated;

grant select, delete on table public.materiales to authenticated;
grant insert (nombre, unidad, costo_unitario), update (nombre, unidad, costo_unitario) on table public.materiales to authenticated;

-- estado NO tiene grant: solo cambia por la RPC cambiar_estado_proyecto (valida actor y transición).
grant select, delete on table public.proyectos to authenticated;
grant insert (instalador_id, nombre, cliente, ubicacion, capacidad_kw, fecha_inicio, fecha_fin_estimada),
  update (instalador_id, nombre, cliente, ubicacion, capacidad_kw, fecha_inicio, fecha_fin_estimada)
  on table public.proyectos to authenticated;

grant select, delete on table public.proyecto_materiales to authenticated;
grant insert (proyecto_id, material_id, cantidad), update (cantidad) on table public.proyecto_materiales to authenticated;

-- ============================================================================ RLS
alter table public.instaladores enable row level security;
alter table public.materiales enable row level security;
alter table public.proyectos enable row level security;
alter table public.proyecto_materiales enable row level security;

-- instaladores: el coordinador ve su equipo; un instalador ve solo su propia ficha.
create policy "instaladores_select" on public.instaladores for select to authenticated
  using (coordinador_id = (select auth.uid()) or user_id = (select auth.uid()));
create policy "instaladores_insert" on public.instaladores for insert to authenticated
  with check (coordinador_id = (select auth.uid()));
create policy "instaladores_update" on public.instaladores for update to authenticated
  using (coordinador_id = (select auth.uid())) with check (coordinador_id = (select auth.uid()));
create policy "instaladores_delete" on public.instaladores for delete to authenticated
  using (coordinador_id = (select auth.uid()));

-- proyectos: coordinador dueño, o instalador ASIGNADO (subconsulta sujeta a la RLS de instaladores).
create policy "proyectos_select" on public.proyectos for select to authenticated
  using (
    coordinador_id = (select auth.uid())
    or instalador_id in (select i.id from public.instaladores i where i.user_id = (select auth.uid()))
  );
create policy "proyectos_insert" on public.proyectos for insert to authenticated
  with check (coordinador_id = (select auth.uid()));
create policy "proyectos_update" on public.proyectos for update to authenticated
  using (coordinador_id = (select auth.uid())) with check (coordinador_id = (select auth.uid()));
create policy "proyectos_delete" on public.proyectos for delete to authenticated
  using (coordinador_id = (select auth.uid()));

-- proyecto_materiales: visible si el proyecto es visible (hereda la RLS de proyectos).
create policy "proyecto_materiales_select" on public.proyecto_materiales for select to authenticated
  using (exists (select 1 from public.proyectos p where p.id = proyecto_id));
create policy "proyecto_materiales_insert" on public.proyecto_materiales for insert to authenticated
  with check (coordinador_id = (select auth.uid()));
create policy "proyecto_materiales_update" on public.proyecto_materiales for update to authenticated
  using (coordinador_id = (select auth.uid())) with check (coordinador_id = (select auth.uid()));
create policy "proyecto_materiales_delete" on public.proyecto_materiales for delete to authenticated
  using (coordinador_id = (select auth.uid()));

-- materiales: el coordinador ve su catálogo; el instalador ve los materiales de SUS proyectos.
create policy "materiales_select" on public.materiales for select to authenticated
  using (
    coordinador_id = (select auth.uid())
    or exists (select 1 from public.proyecto_materiales pm where pm.material_id = materiales.id)
  );
create policy "materiales_insert" on public.materiales for insert to authenticated
  with check (coordinador_id = (select auth.uid()));
create policy "materiales_update" on public.materiales for update to authenticated
  using (coordinador_id = (select auth.uid())) with check (coordinador_id = (select auth.uid()));
create policy "materiales_delete" on public.materiales for delete to authenticated
  using (coordinador_id = (select auth.uid()));

-- ============================================================================ funciones
-- updated_at automático.
create function public.tocar_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger proyectos_updated_at before update on public.proyectos
  for each row execute function public.tocar_updated_at();

-- Límite de abuso (lección del Lab 5): máx. 30 proyectos por minuto por coordinador → HTTP 429.
create function public.limitar_creacion_proyectos() returns trigger
language plpgsql set search_path = '' as $$
declare v_recientes int;
begin
  select count(*) into v_recientes from public.proyectos p
  where p.coordinador_id = (select auth.uid()) and p.created_at > now() - interval '1 minute';
  if v_recientes > 30 then
    raise exception 'Demasiados proyectos creados en el último minuto (%).', v_recientes
      using errcode = 'PT429', hint = 'rate_limit_minuto';
  end if;
  return null;
end;
$$;
create trigger proyectos_limitar_creacion after insert on public.proyectos
  for each statement execute function public.limitar_creacion_proyectos();

-- Cambio de estado: única vía para modificar proyectos.estado. SECURITY DEFINER porque el cliente no tiene
-- grant sobre estado; por eso valida explícitamente el actor (coordinador dueño o instalador asignado).
create function public.cambiar_estado_proyecto(p_proyecto_id uuid, p_estado public.estado_proyecto)
returns public.proyectos
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_proyecto public.proyectos;
  v_es_coordinador boolean;
  v_es_instalador boolean;
begin
  if v_uid is null then
    raise exception 'Se requiere una sesión.' using errcode = '42501';
  end if;

  select * into v_proyecto from public.proyectos where id = p_proyecto_id for update;
  v_es_coordinador := found and v_proyecto.coordinador_id = v_uid;
  v_es_instalador := found and exists (
    select 1 from public.instaladores i where i.id = v_proyecto.instalador_id and i.user_id = v_uid
  );
  -- Mismo error si no existe o no es suyo: no revela la existencia de proyectos ajenos.
  if not (v_es_coordinador or v_es_instalador) then
    raise exception 'Proyecto no encontrado.' using errcode = 'P0002';
  end if;

  if v_proyecto.estado = p_estado then
    return v_proyecto;
  end if;

  if not (
    (v_proyecto.estado = 'pendiente' and p_estado = 'en_progreso')
    or (v_proyecto.estado = 'en_progreso' and p_estado in ('completado', 'pendiente'))
    or (v_proyecto.estado = 'completado' and p_estado = 'en_progreso' and v_es_coordinador)
  ) then
    raise exception 'Transición no permitida: % → %.', v_proyecto.estado, p_estado
      using errcode = 'P0001', hint = 'transicion_invalida';
  end if;

  if p_estado = 'en_progreso' and v_proyecto.instalador_id is null then
    raise exception 'Asigna un instalador antes de iniciar el proyecto.'
      using errcode = 'P0001', hint = 'sin_instalador';
  end if;

  update public.proyectos set estado = p_estado where id = p_proyecto_id returning * into v_proyecto;
  return v_proyecto;
end;
$$;

-- Vinculación de instalador con código de invitación de un solo uso. SECURITY DEFINER: el usuario aún no
-- puede ver la fila (no es suya); la función solo permite fijar user_id = auth.uid() y nada más.
create function public.vincular_instalador(p_codigo text)
returns public.instaladores
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_instalador public.instaladores;
begin
  if v_uid is null then
    raise exception 'Se requiere una sesión.' using errcode = '42501';
  end if;
  if exists (select 1 from public.instaladores i where i.user_id = v_uid) then
    raise exception 'Tu usuario ya está vinculado a un equipo.' using errcode = 'P0001', hint = 'ya_vinculado';
  end if;
  if exists (select 1 from public.instaladores i where i.codigo_invitacion = upper(trim(p_codigo)) and i.coordinador_id = v_uid) then
    raise exception 'Ese código es de tu propio equipo.' using errcode = 'P0001', hint = 'codigo_propio';
  end if;

  update public.instaladores
  set user_id = v_uid, vinculado_en = now()
  where codigo_invitacion = upper(trim(p_codigo)) and user_id is null
  returning * into v_instalador;

  if not found then
    -- Mismo mensaje para "no existe" y "ya usado": no ayuda a enumerar códigos.
    raise exception 'Código inválido o ya utilizado.' using errcode = 'P0001', hint = 'codigo_invalido';
  end if;
  return v_instalador;
end;
$$;

-- Creación atómica de proyecto + materiales. SECURITY INVOKER: corre con los permisos y la RLS del usuario
-- (grants por columna, FKs compuestas); si un material falla, no queda un proyecto a medias.
create function public.crear_proyecto(
  p_nombre text,
  p_cliente text,
  p_ubicacion text,
  p_capacidad_kw numeric,
  p_fecha_inicio date,
  p_fecha_fin_estimada date,
  p_instalador_id uuid default null,
  p_materiales jsonb default '[]'::jsonb
)
returns public.proyectos
language plpgsql security invoker set search_path = '' as $$
declare v_proyecto public.proyectos;
begin
  if jsonb_typeof(p_materiales) <> 'array' or jsonb_array_length(p_materiales) > 30 then
    raise exception 'Materiales inválidos (máximo 30).' using errcode = '22023', hint = 'materiales_invalidos';
  end if;

  insert into public.proyectos (nombre, cliente, ubicacion, capacidad_kw, fecha_inicio, fecha_fin_estimada, instalador_id)
  values (trim(p_nombre), trim(p_cliente), trim(p_ubicacion), p_capacidad_kw, p_fecha_inicio, p_fecha_fin_estimada, p_instalador_id)
  returning * into v_proyecto;

  insert into public.proyecto_materiales (proyecto_id, material_id, cantidad)
  select v_proyecto.id, m.material_id, m.cantidad
  from jsonb_to_recordset(p_materiales) as m(material_id uuid, cantidad numeric);

  return v_proyecto;
end;
$$;

revoke execute on function public.tocar_updated_at(), public.limitar_creacion_proyectos() from public, anon, authenticated;
revoke execute on function public.cambiar_estado_proyecto(uuid, public.estado_proyecto),
  public.vincular_instalador(text),
  public.crear_proyecto(text, text, text, numeric, date, date, uuid, jsonb)
  from public, anon;
grant execute on function public.cambiar_estado_proyecto(uuid, public.estado_proyecto),
  public.vincular_instalador(text),
  public.crear_proyecto(text, text, text, numeric, date, date, uuid, jsonb)
  to authenticated;

-- ============================================================================ resumen del dashboard
-- security_invoker: cada usuario agrega solo lo que su RLS le deja ver (coordinador: su espacio; instalador: lo asignado).
create view public.proyectos_resumen with (security_invoker = true) as
select p.estado, count(*)::int as proyectos, sum(p.capacidad_kw) as capacidad_kw
from public.proyectos p
group by p.estado;

revoke all on table public.proyectos_resumen from anon, authenticated;
grant select on table public.proyectos_resumen to authenticated;
