# hooks/

**Lógica de negocio** reutilizable en forma de custom hooks (`useXxx.ts`).

- Orquestan estado (`loading`, `error`, `data`) y llaman a `services/`.
- Reglas de negocio (validar stock, calcular huella de carbono total...) viven aquí o en `utils/`.
- Devuelven datos y acciones listos para la UI; no devuelven JSX.
- Prohibido importar `supabase` directamente: siempre a través de un servicio.
- `useEmissions(service?)`: carga, inserción y errores. Devuelve `state` (unión `loading | error | empty | success`), `summary` memoizado (null si no hay datos fiables), `canSubmit`, `isSubmitting`, `submitError`, `addEmission`, `reload`. Recibe el servicio por parámetro para probarlo con el mock.
- `useEmissionForm({ onSubmit })`: valores, errores por campo (tras blur o intento de envío), pedido de foco al primer inválido y mensaje de éxito.
- `useAuth()`: estado de sesión (`loading | ready | error`) + `retry` y `signOut`.
