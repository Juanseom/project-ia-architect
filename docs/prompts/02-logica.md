# Prompt 02 — Lógica

```text
# ROL
Actúa como ingeniero senior full-stack experto en Supabase (Postgres 17, RLS, CLI 2.122) y en custom hooks
de React 19 con TypeScript estricto, que escribe código asíncrono robusto y lo verifica contra una base real.

# CONTEXTO
- EcoTrack: la Iteración 1 dejó la estructura (docs/prompts/01-estructura.md). EmissionsTracker usa datos de
  ejemplo locales, un selector de vista de demo y calcula totales dentro de la página.
- Hallazgos de la Iteración 1 que este prompt debe resolver:
  (a) La app se cae sin .env: config/env.ts lanza al importarse
      ("Uncaught Error: Falta la variable de entorno VITE_SUPABASE_URL"), incluso cuando no se necesita Supabase.
  (b) EmissionsTracker contiene lógica (estado de datos, cálculo de totales, inserción local).
- Heredado de EcoTech: AuthProvider no maneja el rechazo de getSession() y no garantiza sesión; useProducts
  usa `(e as Error)` y no gestiona errores ni estado de envío en la mutación. No repetir esos patrones.
- Supabase local con Docker, CLI como devDependency; config.toml ya tiene enable_anonymous_sign_ins = true.
- Reglas de capas verificadas por oxlint: solo src/services/** importa @supabase/supabase-js.

# TAREA
1. Migración `npx supabase migration new crear_emisiones`:
   - ENUM public.categoria_emision ('transporte','energia','residuos').
   - Tabla public.emisiones: id uuid pk default gen_random_uuid(); owner_id uuid not null default auth.uid()
     references auth.users on delete cascade; fuente text not null check (char_length(trim(fuente)) between 2 and 100);
     categoria categoria_emision not null; co2_kg numeric(12,2) not null check (co2_kg > 0);
     medido_en timestamptz not null default now().
   - Índice (owner_id, medido_en desc). RLS activado.
   - revoke all on public.emisiones from anon, authenticated; grant select y grant insert (fuente, categoria, co2_kg)
     solo a authenticated, para que el cliente no pueda fijar owner_id ni medido_en.
   - Políticas `to authenticated` de select e insert con owner_id = (select auth.uid()). Sin update ni delete.
   Luego: npm run db:start, npm run db:lint, supabase migration list --local, npm run db:types.
2. config/env.ts: VITE_USE_MOCK=true debe funcionar sin variables de Supabase; si es false, fallar con un
   mensaje claro. El cliente Supabase no debe crearse en modo mock.
3. services/emissions.service.ts: interfaz EmissionsService { list(): Promise<Emission[]>;
   create(input: NewEmission): Promise<Emission> } con dos implementaciones (Supabase y mock en memoria con
   latencia simulada y datos semilla), elegida por env. Mapeo snake_case → camelCase en el servicio.
   Traducir PostgrestError/AuthError a mensajes en español entendibles (por código: 42501 permiso/RLS,
   23514 check, 22P02 valor inválido, error de red) mediante una clase de error de dominio.
4. services/auth.service.ts + AuthProvider: garantizar una sesión (signInAnonymously si no hay), manejar el error
   y exponer status 'loading' | 'ready' | 'error'. Los datos se cargan solo con sesión lista.
5. hooks/useEmissions.ts: expone { emissions, loading, error, isSubmitting, addEmission, reload }.
   - Sin setState tras desmontar y sin doble carga problemática en StrictMode.
   - addEmission devuelve si tuvo éxito (para que el formulario se limpie solo en ese caso) y antepone el registro creado.
   - error es string | null con el mensaje ya traducido; nada de `as Error`.
6. Cálculo de total y desglose como función pura en utils/ (summarizeEmissions), probada aparte.
7. EmissionsTracker: reemplazar datos de ejemplo y selector de vista por useEmissions(); la página solo compone.
8. Prueba de RLS en psql con dos usuarios (A inserta y ve lo suyo, B ve 0 filas, insertar con owner_id ajeno
   falla, anon no ve nada) y registrar la salida.

# RESTRICCIONES
- TypeScript strict, cero `any`, sin casts para silenciar errores (usar type guards cuando haga falta).
- Ningún hook, página ni componente importa @supabase/supabase-js (oxlint debe seguir en exit 0).
- No editar migraciones aplicadas (0001_create_products queda igual). Nunca service_role en el frontend;
  la anon key local sale de `npx supabase status` y va a .env (ignorado por git).
- No agregar librerías. Validación de formulario, accesibilidad avanzada y useMemo/React.memo quedan para la Iteración 3.

# FORMATO DE SALIDA
1. SQL de la migración y salida de db:lint y migration list.
2. Archivos creados/modificados, completos.
3. Explicación breve de cómo el hook evita setState tras desmontar y la doble carga en StrictMode.
4. Transcripción de la prueba RLS en psql.
5. Resultado de npm run typecheck, lint, test y build, y prueba manual en modo Supabase y en modo mock.
```
