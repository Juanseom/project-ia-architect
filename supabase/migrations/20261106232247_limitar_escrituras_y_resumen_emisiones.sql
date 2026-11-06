-- Lab 5 · Hallazgo H2: abuso con sesiones anónimas y KPI falso por truncamiento.
-- PoC (docs/AUDITORIA_LAB5.md): un usuario anónimo insertó 30.000 filas en < 0,5 s (5.000 por request) y el
-- dashboard sumaba 1.000 kg cuando el total real era 47.228 kg, porque PostgREST corta en max_rows = 1000.

-- 1. Límite de escritura por usuario, aplicado en la BD (la única barrera que un atacante no puede saltarse).
--    Trigger por SENTENCIA con tabla de transición: ve de una vez todas las filas del bulk insert y, si se pasa,
--    revierte la sentencia completa. SQLSTATE 'PT429' hace que PostgREST responda HTTP 429.
create or replace function public.limitar_escrituras_emisiones()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_lote int;
  v_ultimo_minuto int;
  v_total int;
begin
  select count(*) into v_lote from nuevas;
  if v_lote > 10 then
    raise exception 'Máximo 10 mediciones por solicitud (recibidas: %).', v_lote
      using errcode = 'PT429', hint = 'rate_limit_lote';
  end if;

  -- RLS (security invoker) limita estos conteos a las filas del propio usuario.
  select count(*) into v_ultimo_minuto
  from public.emisiones e
  where e.owner_id = (select auth.uid()) and e.medido_en > now() - interval '1 minute';
  if v_ultimo_minuto > 30 then
    raise exception 'Demasiadas mediciones en el último minuto (%).', v_ultimo_minuto
      using errcode = 'PT429', hint = 'rate_limit_minuto';
  end if;

  select count(*) into v_total from public.emisiones e where e.owner_id = (select auth.uid());
  if v_total > 5000 then
    raise exception 'Se alcanzó el máximo de 5000 mediciones por cuenta.'
      using errcode = 'PT429', hint = 'cuota_total';
  end if;

  return null;
end;
$$;

revoke execute on function public.limitar_escrituras_emisiones() from public, anon, authenticated;

create trigger emisiones_limitar_escrituras
  after insert on public.emisiones
  referencing new table as nuevas
  for each statement
  execute function public.limitar_escrituras_emisiones();

-- 2. Resumen calculado en la BD: el dashboard ya no descarga todas las filas para sumar en el cliente.
--    security_invoker = true → la vista se evalúa con los permisos y el RLS de quien consulta (cada usuario ve lo suyo).
create view public.emisiones_resumen
with (security_invoker = true)
as
select
  e.categoria,
  count(*)::int as mediciones,
  sum(e.co2_kg) as co2_kg
from public.emisiones e
group by e.categoria;

comment on view public.emisiones_resumen is 'Total de CO2 y número de mediciones por categoría del usuario actual (RLS vía security_invoker).';

revoke all on table public.emisiones_resumen from anon, authenticated;
grant select on table public.emisiones_resumen to authenticated;
