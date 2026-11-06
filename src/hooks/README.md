# hooks/

**Lógica de negocio** reutilizable en forma de custom hooks (`useXxx.ts`).

- Orquestan estado (`loading`, `error`, `data`) y llaman a `services/`.
- Reglas de negocio (validar stock, calcular huella de carbono total...) viven aquí o en `utils/`.
- Devuelven datos y acciones listos para la UI; no devuelven JSX.
- Prohibido importar `supabase` directamente: siempre a través de un servicio.
- `useEmissions` (Iteración 2) es el hook del dashboard de EcoTrack: carga, inserción, errores y Realtime.
