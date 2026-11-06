# pages/

Pantallas/rutas. Son **contenedores**: usan hooks para obtener datos y los pasan a `components/`.
Contienen composición, no lógica de negocio ni llamadas directas a Supabase.

- `InventoryPage.tsx`: dominio inventario (EcoTech).
- `EmissionsTracker.tsx` (Iteración 1): dashboard de EcoTrack; único consumidor de `useEmissions`.
