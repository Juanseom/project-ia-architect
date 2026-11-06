# pages/

Pantallas/rutas. Son **contenedores**: usan hooks para obtener datos y los pasan a `components/`.
Contienen composición, no lógica de negocio ni llamadas directas a Supabase.

- `InventoryPage.tsx`: dominio inventario (EcoTech).
- `EmissionsTracker.tsx`: dashboard de EcoTrack (ruta `/`, eager); único consumidor de `useEmissions`.
- `NotFoundPage.tsx`: 404. `InventoryPage` y `NotFoundPage` se cargan con `React.lazy` desde `src/routes.ts`
  importando el archivo (no este barrel) para que cada una sea un chunk aparte.
