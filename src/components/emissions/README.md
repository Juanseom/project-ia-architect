# components/emissions/

Componentes **presentacionales** del dominio emisiones (EcoTrack).

| Componente | Responsabilidad |
|---|---|
| `EmissionCard` | Una medición: categoría, fuente, CO₂ y fecha. |
| `EmissionList` | Grid responsive de tarjetas (1 → 2 → 3 columnas). |
| `EmissionForm` | Formulario **controlado** (values/onChange/onSubmit por props). |
| `EmissionsSummary` | Total de CO₂ y desglose por categoría. |
| `EmissionsLoading` / `EmissionsEmpty` / `EmissionsError` | Estados de la UI. |

- Reciben datos y callbacks por `props` tipadas y renderizan JSX con Tailwind.
- Prohibido importar `hooks/`, `services/`, `context/` o `@supabase/supabase-js`.
  La regla `no-restricted-imports` de `.oxlintrc.json` lo hace cumplir en `npm run lint`.
- Quien los conecta con datos es `pages/EmissionsTracker.tsx` (vía `useEmissions`).
