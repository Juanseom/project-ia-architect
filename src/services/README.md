# services/

Capa de **acceso a datos**. Es el ÚNICO lugar del proyecto que habla con Supabase.

- `supabase/client.ts`: `getSupabase()` **asíncrono**: carga el SDK con `import()` (chunk `vendor-supabase`, fuera de la ruta crítica)
  y crea el singleton; nunca en modo mock.
- `supabase/database.types.ts`: tipos generados con la CLI de Supabase.
- `*.service.ts`: funciones async puras por dominio (`getProducts`, `createProduct`...).
- `emissions.service.ts`: interfaz `EmissionsService` (`list`, `create`, `subscribeToInserts`) + implementación Supabase
  con canal Realtime y `parseEmissionRow` (valida el payload sin casts); exporta `emissionsService`
  (Supabase o mock según `VITE_USE_MOCK`). `list()` trae las 50 más recientes y `summary()` lee la vista `emisiones_resumen`.
  `emissions.mock.ts`: implementación en memoria; NO se re-exporta en el barrel (solo se descarga en modo demo).
- `projects.service.ts`: EcoFlow — `ProjectsService` (Supabase: tablas con embeds tipados + RPCs `crear_proyecto`,
  `cambiar_estado_proyecto`, `vincular_instalador`; vista `proyectos_resumen`). `projects.mock.ts`: misma interfaz en memoria.
- `auth.service.ts`: `ensureUser()` (sesión anónima si no hay otra, deduplicada para StrictMode), `onAuthChange`, `signOut`.
- `errors.ts`: `AppError` + `toAppError()` traducen PostgrestError/AuthError/red/config a mensajes en español.
  Reciben/devuelven tipos de `types/` y lanzan `Error` ante fallos.

Es la única carpeta donde oxlint permite importar `@supabase/supabase-js`.
Los tipos del SDK no salen de aquí: se traducen a tipos de dominio (`User` → `AuthUser`).

Reglas: sin JSX, sin `useState`, sin lógica de UI. Si cambia el backend, solo cambia esta carpeta.
