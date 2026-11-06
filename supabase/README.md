# supabase/

Infraestructura de base de datos versionada: migraciones SQL, políticas RLS y seeds.
Local: `npm run db:start` (Docker), `npm run db:lint`, `npm run db:types`.
`config.toml` habilita `enable_anonymous_sign_ins` (sesión anónima para la demo).
Remoto: `npx supabase db push`. El código cliente vive en `src/services/supabase/`.
