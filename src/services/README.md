# services/

Capa de **acceso a datos**. Es el ÚNICO lugar del proyecto que habla con Supabase.

- `supabase/client.ts`: instancia única (singleton) de `createClient<Database>`.
- `supabase/database.types.ts`: tipos generados con la CLI de Supabase.
- `*.service.ts`: funciones async puras por dominio (`getProducts`, `createProduct`...).
- `emissions.service.ts` (Iteración 2): interfaz `EmissionsService` con dos implementaciones,
  Supabase y mock en memoria; `VITE_USE_MOCK` decide cuál se exporta.
  Reciben/devuelven tipos de `types/` y lanzan `Error` ante fallos.

Es la única carpeta donde oxlint permite importar `@supabase/supabase-js`.
Si otra capa necesita un tipo del SDK (ej. `Session`), se re-exporta desde aquí (`AuthSession`).

Reglas: sin JSX, sin `useState`, sin lógica de UI. Si cambia el backend, solo cambia esta carpeta.
