# supabase/

Infraestructura de base de datos versionada: migraciones SQL, políticas RLS y seeds.
Local: `npm run db:start` (Docker), `npm run db:lint`, `npm run db:types`.
`config.toml` habilita `enable_anonymous_sign_ins` (sesión anónima para la demo).
Remoto: `npx supabase db push`.

`tests/rls_emisiones.sql`: prueba de RLS y privilegios con dos usuarios y `anon` (en transacción con ROLLBACK):
`docker exec -i supabase_db_ecotrack psql -U postgres < supabase/tests/rls_emisiones.sql`

`tests/ecoflow_rls.sql`: EcoFlow con 4 actores (RLS, FKs compuestas, transiciones, códigos de invitación, resumen).

`tests/hardening_lab5.sql`: privilegios de `products`, SKU por dueño, límites de escritura (PT429) y vista `emisiones_resumen`. El código cliente vive en `src/services/supabase/`.
