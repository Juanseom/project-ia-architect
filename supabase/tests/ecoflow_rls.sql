-- EcoFlow · Verificación de RLS, integridad multi-tenant y RPCs (EF-01..EF-04, EF-06). Transacción con ROLLBACK.
-- Ejecutar: docker exec -i supabase_db_ecotrack psql -U postgres -v ON_ERROR_STOP=0 < supabase/tests/ecoflow_rls.sql
-- Actores: A = coordinador · B = instalador vinculado y ASIGNADO · C = instalador vinculado NO asignado · D = otro coordinador
\set QUIET on
\pset footer off
begin;
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@ecoflow.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@ecoflow.test', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@ecoflow.test', 'authenticated', 'authenticated'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@ecoflow.test', 'authenticated', 'authenticated');

-- Ayudante: actuar como un usuario (rol authenticated + JWT con sub).
create function pg_temp.como(p_uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

\echo '== Preparación: A crea 2 instaladores, 1 material y 2 proyectos (uno asignado a Ana)'
select pg_temp.como('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') \g /dev/null
insert into public.instaladores (nombre, especialidad) values ('Ana Solar', 'electrica'), ('Luis Techo', 'estructural');
insert into public.materiales (nombre, unidad, costo_unitario) values ('Panel 550 W', 'unidad', 520000);
select public.crear_proyecto('Granja Solar Norte', 'Hacienda La Esperanza', 'Tunja, Boyacá', 120.5, '2026-11-10', '2026-12-20',
  (select id from public.instaladores where nombre = 'Ana Solar'),
  jsonb_build_array(jsonb_build_object('material_id', (select id from public.materiales where nombre = 'Panel 550 W'), 'cantidad', 220))) \g /dev/null
select public.crear_proyecto('Techo Colegio Sur', 'Colegio San José', 'Bogotá', 35, '2026-11-15', '2026-11-30') \g /dev/null
select nombre, codigo_invitacion is not null as tiene_codigo from public.instaladores order by nombre;
-- guardar códigos en variables de psql
reset role;
select codigo_invitacion as cod_ana from public.instaladores where nombre = 'Ana Solar' \gset
select codigo_invitacion as cod_luis from public.instaladores where nombre = 'Luis Techo' \gset

\echo '== EF-04 Vinculación: B canjea el código de Ana, C el de Luis'
select pg_temp.como('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') \g /dev/null
select nombre as b_quedo_vinculado_a from public.vincular_instalador(:'cod_ana');
select pg_temp.como('cccccccc-cccc-4ccc-8ccc-cccccccccccc') \g /dev/null
select nombre as c_quedo_vinculado_a from public.vincular_instalador(lower(:'cod_luis'));
\echo '-- D intenta reutilizar el código de Ana (esperado: Código inválido o ya utilizado)'
select pg_temp.como('dddddddd-dddd-4ddd-8ddd-dddddddddddd') \g /dev/null
savepoint s1; select public.vincular_instalador(:'cod_ana'); rollback to savepoint s1;
\echo '-- D prueba un código inventado (esperado: mismo mensaje, no distingue)'
savepoint s2; select public.vincular_instalador('ABCDEF1234'); rollback to savepoint s2;

\echo '== EF-01 Visibilidad de proyectos'
select pg_temp.como('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') \g /dev/null
select 'A (coordinador)' as actor, count(*) as proyectos_visibles from public.proyectos;
select pg_temp.como('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') \g /dev/null
select 'B (asignado)' as actor, string_agg(nombre, ', ') as proyectos_visibles from public.proyectos;
select 'B materiales visibles' as actor, string_agg(nombre, ', ') as materiales from public.materiales;
select 'B instaladores visibles' as actor, string_agg(nombre, ', ') as instaladores from public.instaladores;
select pg_temp.como('cccccccc-cccc-4ccc-8ccc-cccccccccccc') \g /dev/null
select 'C (no asignado)' as actor, count(*) as proyectos_visibles from public.proyectos;
select pg_temp.como('dddddddd-dddd-4ddd-8ddd-dddddddddddd') \g /dev/null
select 'D (otro coordinador)' as actor, count(*) as proyectos_visibles, (select count(*) from public.materiales) as materiales, (select count(*) from public.instaladores) as instaladores from public.proyectos;
reset role;
select 'anon' as actor, coalesce(string_agg(table_name || ':' || privilege_type, ', '), '(ningún privilegio)') as privilegios
from information_schema.role_table_grants where grantee = 'anon' and table_name in ('proyectos', 'instaladores', 'materiales', 'proyecto_materiales', 'proyectos_resumen');

\echo '== EF-02 Integridad multi-tenant: D usa el id (filtrado) del instalador y del material de A'
reset role;
select id as ana_id from public.instaladores where nombre = 'Ana Solar' \gset
select id as panel_id from public.materiales where nombre = 'Panel 550 W' \gset
select pg_temp.como('dddddddd-dddd-4ddd-8ddd-dddddddddddd') \g /dev/null
savepoint s4;
insert into public.proyectos (nombre, cliente, ubicacion, capacidad_kw, fecha_inicio, fecha_fin_estimada, instalador_id)
values ('Robo de instalador', 'Cliente X', 'Cali', 10, '2026-11-10', '2026-11-20', :'ana_id');
rollback to savepoint s4;
savepoint s5;
select public.crear_proyecto('Robo de material', 'Cliente X', 'Cali', 10, '2026-11-10', '2026-11-20', null,
  jsonb_build_array(jsonb_build_object('material_id', :'panel_id', 'cantidad', 5)));
rollback to savepoint s5;
\echo '-- D no dejó un proyecto a medias (crear_proyecto es atómico): proyectos de D ='
select count(*) as proyectos_de_d from public.proyectos;

\echo '== EF-03 Transiciones de estado'
select pg_temp.como('cccccccc-cccc-4ccc-8ccc-cccccccccccc') \g /dev/null
select id as granja_id from (select null::uuid as id) x \gset
reset role;
select id as granja_id from public.proyectos where nombre = 'Granja Solar Norte' \gset
select id as colegio_id from public.proyectos where nombre = 'Techo Colegio Sur' \gset
\echo '-- C (no asignado) intenta mover la Granja (esperado: Proyecto no encontrado)'
select pg_temp.como('cccccccc-cccc-4ccc-8ccc-cccccccccccc') \g /dev/null
savepoint s6; select public.cambiar_estado_proyecto(:'granja_id', 'en_progreso'); rollback to savepoint s6;
\echo '-- B (asignado) salta pendiente → completado (esperado: Transición no permitida)'
select pg_temp.como('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') \g /dev/null
savepoint s7; select public.cambiar_estado_proyecto(:'granja_id', 'completado'); rollback to savepoint s7;
\echo '-- B avanza correctamente pendiente → en_progreso → completado'
select estado as paso_1 from public.cambiar_estado_proyecto(:'granja_id', 'en_progreso');
select estado as paso_2 from public.cambiar_estado_proyecto(:'granja_id', 'completado');
\echo '-- B intenta reabrir (solo coordinador; esperado: Transición no permitida)'
savepoint s8; select public.cambiar_estado_proyecto(:'granja_id', 'en_progreso'); rollback to savepoint s8;
\echo '-- B intenta cambiar el estado con UPDATE directo, sin la RPC (esperado: permission denied)'
savepoint s9; update public.proyectos set estado = 'pendiente' where id = :'granja_id'; rollback to savepoint s9;
\echo '-- A inicia el Colegio sin instalador asignado (esperado: Asigna un instalador)'
select pg_temp.como('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') \g /dev/null
savepoint s10; select public.cambiar_estado_proyecto(:'colegio_id', 'en_progreso'); rollback to savepoint s10;
\echo '-- A reabre la Granja (coordinador sí puede)'
select estado as reabierto from public.cambiar_estado_proyecto(:'granja_id', 'en_progreso');

\echo '== EF-06 Resumen del dashboard (vista security_invoker)'
select 'A' as actor, estado, proyectos, capacidad_kw from public.proyectos_resumen order by estado;
select pg_temp.como('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') \g /dev/null
select 'B' as actor, estado, proyectos, capacidad_kw from public.proyectos_resumen order by estado;
rollback;
