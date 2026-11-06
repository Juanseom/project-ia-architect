# router/

Router mínimo propio (History API + `useSyncExternalStore`), sin dependencias.

- `navigate(to)`: cambia la URL sin recargar. `usePathname()`: ruta actual.
- La tabla de rutas vive en `src/routes.ts`; cada página se carga con `React.lazy()` (code splitting por ruta)
  y `App.tsx` la envuelve en `<Suspense>` + `ErrorBoundary`.
- Por qué no react-router: con 2 rutas no justifica sumar ~20 kB gzip al bundle inicial (Lab 5).
