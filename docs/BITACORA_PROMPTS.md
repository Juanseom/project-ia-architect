# Bitácora de Prompts — EcoTrack (Ciclo Spec-to-Code)

Registro del prompteo iterativo usado para construir `EmissionsTracker` y `useEmissions`.
Cada iteración guarda: el prompt literal (también en `docs/prompts/`), el objetivo, lo que generó la IA,
los **problemas reales** detectados (con la salida del comando que los evidencia), la evolución del
código (antes/después) y el commit/tag. Si algo salió bien a la primera, se dice.

Roles: **Arquitecto de IA** (Sebastian) aprueba/edita cada prompt · **IA** (Claude Code) lo ejecuta.
Verificación estándar por iteración: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
y, cuando aplica, `npm run db:lint` + pruebas RLS en psql.

| Iteración | Prompt | Tag | Commit |
|---|---|---|---|
| 0 — Setup y plano | (sin prompt de código; ver abajo) | `fase-0` | `2aa27c8` |
| 1 — Estructura | `docs/prompts/01-estructura.md` | `iter-1` | _ver `git rev-parse iter-1`; se anota en la iteración 2_ |
| 2 — Lógica | `docs/prompts/02-logica.md` | `iter-2` | |
| 3 — Refinamiento | `docs/prompts/03-refinamiento.md` | `iter-3` | |
| 4 — Tiempo real y cierre | `docs/prompts/04-realtime-cierre.md` | `iter-4` | |

---

## Fase 0 — Setup y plano

**Objetivo:** preparar el entorno sobre el scaffolding existente de EcoTech (Vite 8 + React 19 + TS strict + Supabase)
sin escribir código de features: Tailwind, Supabase CLI, Vitest, reglas de capas y documentos SDD.

**Qué se hizo**
- Tailwind CSS v4.3.4 con `@tailwindcss/vite` (peer `vite ^8` verificado con `npm view`), tokens en `@theme`.
- Supabase CLI 2.122.1 (`v2.stable`), `npx supabase init`, `enable_anonymous_sign_ins = true`, `project_id = "ecotrack"`.
- Vitest 5.1.0 + Testing Library + jsdom, `src/test/setup.ts` y prueba de humo.
- `.oxlintrc.json` con `no-restricted-imports` por capa y plugin `jsx-a11y`.
- `docs/SPEC.md` (16 criterios de aceptación), sección EcoTrack en `ARCHITECTURE.md`, `CLAUDE.md`.

**Problemas reales detectados**
1. *Versión del CLI distinta a la indicada.* `npm view supabase dist-tags` → `latest: '3.0.0'`, `v2.stable: '2.122.1'`.
   Se fijó 2.122.1 para mantener la versión probada en MentorLink (decisión D8).
2. *Violación de capas en código heredado, encontrada por la nueva regla de lint.* Al activar `no-restricted-imports`:
   ```
   src/context/auth-context.ts:2:1: error eslint(no-restricted-imports): '@supabase/supabase-js' import is restricted from being used.
   src/context/AuthProvider.tsx:2:1: error eslint(no-restricted-imports): '@supabase/supabase-js' import is restricted from being used.
   ```
   `context/` importaba el tipo `Session` directamente del SDK, rompiendo la regla "solo `services/` toca Supabase".
3. *Peer dependency faltante.* `@testing-library/react@16` requiere `@testing-library/dom ^10` (`npm view ... peerDependencies`); se instaló 10.4.2.

**Evolución del código (antes → después)**
```ts
// antes: src/context/auth-context.ts
import type { Session } from '@supabase/supabase-js'
// después: el tipo se re-exporta desde la capa de servicios
import type { AuthSession } from '../services'   // services/auth.service.ts: export type AuthSession = Session
```

**Verificación:** `tsc -b` exit 0 · `oxlint` exit 0 · `vitest run` 2/2 tests · `vite build` OK (CSS 7.88 kB con Tailwind).
Además se comprobó la regla de capas con un archivo sonda en `components/` que importaba `hooks` y `services`: oxlint reportó ambos errores (archivo eliminado después).

**Hallazgos que alimentan las siguientes iteraciones** (observados en el código heredado, no corregidos aún):
- `AuthProvider` crea el objeto `value` en cada render → re-renderiza a todos los consumidores (Iteración 3, re-renders).
- `AuthProvider` no maneja el rechazo de `getSession()` y no hay sesión anónima (Iteración 2).
- `useProducts` usa `(e as Error)` y `addProduct` no gestiona errores ni estado de envío (patrón a no repetir en `useEmissions`).
- `config/env.ts` lanza error al importarse si faltan variables, incluso si se quisiera usar el mock (Iteración 2).

---

## Iteración 1 — Estructura

**Prompt literal:** [`docs/prompts/01-estructura.md`](prompts/01-estructura.md) (aprobado sin cambios por el Arquitecto).

**Objetivo:** arquitectura de componentes a partir de la SPEC: árbol, props tipadas, flujo de datos y los
cuatro estados de la UI, con JSX básico y sin lógica de datos.

**Qué generó**
```
src/types/emission.ts             EMISSION_CATEGORIES (as const) → EmissionCategory, Emission, NewEmission, EmissionFormValues
src/utils/formatters.ts           CATEGORY_LABELS ("Energía"), formatCategory, formatMeasuredAt (Intl es-CO)
src/components/ui/                Button (variantes con Tailwind, type="button" por defecto), Card
src/components/emissions/         EmissionCard, EmissionList, EmissionForm, EmissionsSummary,
                                  EmissionsLoading, EmissionsEmpty, EmissionsError (+ barrel con tipos de props)
src/pages/EmissionsTracker.tsx    contenedor con datos de ejemplo + selector de vista (list/loading/empty/error)
src/App.tsx                       monta EmissionsTracker (InventoryPage se conserva en pages/)
```

| Componente | Props | Eventos | Estado UI |
|---|---|---|---|
| `EmissionList` | `emissions: Emission[]` | — | éxito |
| `EmissionCard` | `emission: Emission` | — | éxito |
| `EmissionForm` | `values: EmissionFormValues`, `isSubmitting: boolean` | `onChange(field, value)` genérico tipado, `onSubmit()` | inserción |
| `EmissionsSummary` | `totalKg: number`, `byCategory: Record<EmissionCategory, number>` | — | éxito |
| `EmissionsLoading` | — | — | cargando |
| `EmissionsEmpty` | — | — | vacío |
| `EmissionsError` | `message: string` | `onRetry()` | error |

Flujo de datos: `EmissionsTracker` (estado) → props → componentes; componentes → callbacks → `EmissionsTracker`.
En la Iteración 2 el estado y los callbacks pasan a salir de `useEmissions()`.

**Lo que salió bien a la primera:** `tsc -b` exit 0 y `oxlint` exit 0 (ningún componente rompió la regla de capas);
el layout de escritorio quedó como se esperaba (captura `docs/evidencias/iter-1/estructura-escritorio.png`).

**Problemas reales detectados en la revisión**
1. *La app no arranca sin `.env` aunque el dashboard aún no use datos.* Al cargarla en Chrome headless el `#root` quedó vacío:
   ```
   "Uncaught Error: Falta la variable de entorno VITE_SUPABASE_URL. Revisa .env.example", source: http://localhost:5173/src/config/env.ts (4)
   ```
   Cadena: `App → AuthProvider → services → supabase/client → config/env` lanza al importarse. `build` y `tsc` pasaban:
   el fallo solo aparece en ejecución. Para revisar la estructura se usaron variables placeholder en línea; la corrección
   (modo mock sin variables de Supabase) se lleva al prompt 02.
2. *Lógica de negocio en la página.* `EmissionsTracker` calcula total y desglose con `reduce`/`for` en cada render y convierte
   `Number(form.co2Kg)` sin validar: un envío con fuente vacía o CO₂ negativo se acepta (solo se bloquea la categoría vacía).
3. *Cast en el formulario:* `e.target.value as EmissionFormValues['category']` confía en el DOM en vez de comprobar el valor.
4. *Formato numérico:* la captura muestra `4980.75 kg CO₂e` sin separador de miles (`toFixed`), poco legible en un dashboard.
5. *Accesibilidad básica incompleta:* el resumen es una `section` sin encabezado; el error no tiene `role="alert"`; la carga
   no tiene `aria-busy`.
6. *Evidencia móvil no válida con Chrome headless:* `--window-size=390` produce `innerWidth=500` (medido), así que la captura
   móvil sale recortada. No es un bug de layout; las capturas móviles se harán con emulación de dispositivo (Iteración 4).

Los puntos 2–5 son intencionalmente del alcance de las Iteraciones 2 y 3 (el prompt 01 excluía validación, a11y y memo).

**Verificación:** `tsc -b` exit 0 · `oxlint` exit 0 · `vitest run` 2/2 · `vite build` OK (CSS 13.97 kB).

## Iteración 2 — Lógica

_Pendiente._

## Iteración 3 — Refinamiento

_Pendiente._

## Iteración 4 — Tiempo real y cierre

_Pendiente._
