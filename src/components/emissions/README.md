# components/emissions/

Componentes **presentacionales** del dominio emisiones (EcoTrack). Se crean en la Iteración 1:
`EmissionCard`, `EmissionList`, `EmissionForm`, `EmissionsSummary` y los estados de carga, vacío y error.

- Reciben datos y callbacks por `props` tipadas y renderizan JSX con Tailwind.
- Prohibido importar `hooks/`, `services/`, `context/` o `@supabase/supabase-js`.
  La regla `no-restricted-imports` de `.oxlintrc.json` lo hace cumplir en `npm run lint`.
- Quien los conecta con datos es `pages/EmissionsTracker.tsx` (vía `useEmissions`).
