# services/

Capa de **acceso a datos**. Es el ÚNICO lugar del proyecto que habla con Supabase.

- `supabase/client.ts`: instancia única (singleton) de `createClient<Database>`.
- `supabase/database.types.ts`: tipos generados con la CLI de Supabase.
- `*.service.ts`: funciones async puras por dominio (`getProducts`, `createProduct`...).
  Reciben/devuelven tipos de `types/` y lanzan `Error` ante fallos.

Reglas: sin JSX, sin `useState`, sin lógica de UI. Si cambia el backend, solo cambia esta carpeta.
