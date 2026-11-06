# services/

Capa de **acceso a datos**. Es el ÚNICO lugar del proyecto que habla con Supabase.

- `supabase/client.ts`: `getSupabase()`, singleton **perezoso** de `createClient<Database>` (no se crea en modo mock).
- `supabase/database.types.ts`: tipos generados con la CLI de Supabase.
- `*.service.ts`: funciones async puras por dominio (`getProducts`, `createProduct`...).
- `emissions.service.ts`: interfaz `EmissionsService` + implementación Supabase; exporta `emissionsService`
  (Supabase o mock según `VITE_USE_MOCK`). `emissions.mock.ts`: implementación en memoria con las mismas reglas que el CHECK.
- `auth.service.ts`: `ensureUser()` (sesión anónima si no hay otra, deduplicada para StrictMode), `onAuthChange`, `signOut`.
- `errors.ts`: `AppError` + `toAppError()` traducen PostgrestError/AuthError/red/config a mensajes en español.
  Reciben/devuelven tipos de `types/` y lanzan `Error` ante fallos.

Es la única carpeta donde oxlint permite importar `@supabase/supabase-js`.
Los tipos del SDK no salen de aquí: se traducen a tipos de dominio (`User` → `AuthUser`).

Reglas: sin JSX, sin `useState`, sin lógica de UI. Si cambia el backend, solo cambia esta carpeta.
