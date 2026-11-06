-- Prueba manual de RLS y privilegios de public.emisiones con dos usuarios y anon.
-- Ejecutar: docker exec -i supabase_db_ecotrack psql -U postgres -v ON_ERROR_STOP=0 < supabase/tests/rls_emisiones.sql
-- Todo ocurre en una transacción con ROLLBACK: no deja datos.
\set QUIET on
\pset footer off
begin;

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@ecotrack.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@ecotrack.test', 'authenticated', 'authenticated');

\echo '== 1. Usuario A inserta 2 mediciones (sin enviar owner_id)'
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
insert into public.emisiones (fuente, categoria, co2_kg) values ('Flota A', 'transporte', 120.5), ('Planta A', 'energia', 300);
select fuente, categoria, co2_kg, owner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as owner_es_a from public.emisiones;

\echo '== 2. Usuario B lista: debe ver 0 filas'
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select count(*) as filas_visibles_para_b from public.emisiones;

\echo '== 3. Usuario B intenta suplantar a A fijando owner_id: debe fallar (sin privilegio de columna)'
savepoint s1;
insert into public.emisiones (owner_id, fuente, categoria, co2_kg) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Suplantación', 'residuos', 1);
rollback to savepoint s1;

\echo '== 3b. Defensa en profundidad: aunque se concediera INSERT sobre owner_id, RLS bloquea la suplantación'
reset role;
grant insert (owner_id) on public.emisiones to authenticated;  -- solo dentro de esta transacción (rollback al final)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
savepoint s1b;
insert into public.emisiones (owner_id, fuente, categoria, co2_kg) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Suplantación', 'residuos', 1);
rollback to savepoint s1b;
reset role;
revoke insert (owner_id) on public.emisiones from authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);

\echo '== 4. Usuario B intenta fijar medido_en (fecha retroactiva): debe fallar'
savepoint s2;
insert into public.emisiones (fuente, categoria, co2_kg, medido_en) values ('Retroactiva', 'residuos', 1, '2000-01-01');
rollback to savepoint s2;

\echo '== 5. Usuario B intenta actualizar y borrar: no tiene privilegio'
savepoint s3;
update public.emisiones set co2_kg = 1;
rollback to savepoint s3;
savepoint s4;
delete from public.emisiones;
rollback to savepoint s4;

\echo '== 6. CHECK constraints: CO2 <= 0 y fuente de 1 caracter'
savepoint s5;
insert into public.emisiones (fuente, categoria, co2_kg) values ('Caldera', 'energia', 0);
rollback to savepoint s5;
savepoint s6;
insert into public.emisiones (fuente, categoria, co2_kg) values ('  X  ', 'energia', 5);
rollback to savepoint s6;

\echo '== 7. Sin owner real: un JWT sin sub no puede insertar (owner_id = auth.uid() es null)'
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
savepoint s7;
insert into public.emisiones (fuente, categoria, co2_kg) values ('Sin dueño', 'energia', 5);
rollback to savepoint s7;

\echo '== 8. Rol anon: no puede leer ni insertar'
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
savepoint s8;
select count(*) from public.emisiones;
rollback to savepoint s8;
savepoint s9;
insert into public.emisiones (fuente, categoria, co2_kg) values ('Anónimo', 'energia', 5);
rollback to savepoint s9;

\echo '== 9. Usuario A vuelve a listar: sigue viendo solo sus 2 filas'
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select count(*) as filas_visibles_para_a from public.emisiones;

rollback;
