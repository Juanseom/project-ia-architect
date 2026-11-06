-- Lab 5 · Verificación del endurecimiento (H1 products, H2 límites + resumen). Transacción con ROLLBACK.
-- Ejecutar: docker exec -i supabase_db_ecotrack psql -U postgres -v ON_ERROR_STOP=0 < supabase/tests/hardening_lab5.sql
\set QUIET on
\pset footer off
begin;
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@ecotrack.test', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@ecotrack.test', 'authenticated', 'authenticated');

\echo '== H1.1 Privilegios de anon sobre products y emisiones_resumen (esperado: ninguno)'
select coalesce(string_agg(table_name||':'||privilege_type, ', '), '(ninguno)') as privilegios_anon
from information_schema.role_table_grants where grantee = 'anon' and table_name in ('products', 'emisiones', 'emisiones_resumen');

\echo '== H1.2 SKU repetido entre usuarios distintos: ya no es oráculo (esperado: 2 filas, una por dueño)'
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \g /dev/null
insert into public.products (name, sku, category) values ('Botella A', 'ECO-SECRETO', 'reutilizable');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \g /dev/null
insert into public.products (name, sku, category) values ('Botella B', 'ECO-SECRETO', 'otro');
reset role;
select count(*) as filas_con_ese_sku from public.products where sku = 'ECO-SECRETO';

\echo '== H1.3 B intenta fijar created_at u owner_id (esperado: permission denied)'
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \g /dev/null
savepoint s1; insert into public.products (name, sku, category, created_at) values ('x', 'X1', 'otro', '2000-01-01'); rollback to savepoint s1;
savepoint s2; update public.products set owner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; rollback to savepoint s2;

\echo '== H2.1 Lote de 11 filas en una sentencia (esperado: PT429 rate_limit_lote)'
savepoint s3;
insert into public.emisiones (fuente, categoria, co2_kg) select 'Lote '||g, 'energia', 1 from generate_series(1, 11) g;
rollback to savepoint s3;

\echo '== H2.2 Cuatro lotes de 10 en el mismo minuto (esperado: 3 OK y el 4.º PT429 rate_limit_minuto)'
insert into public.emisiones (fuente, categoria, co2_kg) select 'L1-'||g, 'energia', 1 from generate_series(1, 10) g;
insert into public.emisiones (fuente, categoria, co2_kg) select 'L2-'||g, 'residuos', 2.5 from generate_series(1, 10) g;
insert into public.emisiones (fuente, categoria, co2_kg) select 'L3-'||g, 'transporte', 0.5 from generate_series(1, 10) g;
savepoint s4;
insert into public.emisiones (fuente, categoria, co2_kg) select 'L4-'||g, 'energia', 1 from generate_series(1, 10) g;
rollback to savepoint s4;

\echo '== H2.3 Resumen calculado en la BD para B (esperado: 3 categorías, 30 mediciones, 40 kg)'
select categoria, mediciones, co2_kg from public.emisiones_resumen order by categoria;

\echo '== H2.4 A consulta el resumen: RLS vía security_invoker (esperado: 0 filas)'
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \g /dev/null
select count(*) as filas_de_resumen_visibles_para_a from public.emisiones_resumen;

\echo '== H2.5 anon consulta el resumen (esperado: permission denied)'
reset role;
set local role anon;
savepoint s5; select * from public.emisiones_resumen; rollback to savepoint s5;
rollback;
