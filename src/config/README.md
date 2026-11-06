# config/

Configuración global y lectura **tipada** de variables de entorno (`env.ts`).
Ningún otro archivo debe leer `import.meta.env` directamente.
Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_USE_MOCK` (ver `.env.example`).
`isSecretSupabaseKey()` rechaza claves `service_role` / `sb_secret_` antes de crear el cliente.
