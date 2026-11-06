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
| 0 — Setup y plano | (sin prompt de código; ver abajo) | `fase-0` | _se completa en la iteración 1_ |
| 1 — Estructura | `docs/prompts/01-estructura.md` | `iter-1` | |
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

_Pendiente._

## Iteración 2 — Lógica

_Pendiente._

## Iteración 3 — Refinamiento

_Pendiente._

## Iteración 4 — Tiempo real y cierre

_Pendiente._
