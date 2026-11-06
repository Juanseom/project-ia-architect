# EcoTrack · Dashboard de Emisiones en Tiempo Real

Dashboard de huella de carbono para empresas: listado de mediciones en tarjetas (fuente, categoría y CO₂),
formulario accesible para registrar nuevas, resumen total y por categoría, y actualización **en tiempo real**.

**Stack:** React 19 · TypeScript 7 (strict + `noUncheckedIndexedAccess`) · Vite 8 · Tailwind CSS v4 ·
Supabase (Postgres 17, RLS, Realtime, sesión anónima) · Vitest 5 + Testing Library · Playwright · oxlint.

Construido con **Desarrollo Guiado por Especificaciones** y prompteo iterativo: ver [docs/BITACORA_PROMPTS.md](docs/BITACORA_PROMPTS.md).
Se apoya en la arquitectura por capas de *EcoTech Inventory* (lab anterior), que se conserva como dominio `inventory`.

## Archivos clave

| Archivo | Rol |
|---|---|
| [src/pages/EmissionsTracker.tsx](src/pages/EmissionsTracker.tsx) | Contenedor del dashboard: une hooks y componentes |
| [src/hooks/useEmissions.ts](src/hooks/useEmissions.ts) | Carga, inserción, errores y Realtime (estado como unión discriminada) |
| [src/hooks/useEmissionForm.ts](src/hooks/useEmissionForm.ts) | Valores, validación por campo y foco del formulario |
| [src/services/emissions.service.ts](src/services/emissions.service.ts) | `EmissionsService` (Supabase) + [mock](src/services/emissions.mock.ts) |
| [src/services/supabase/client.ts](src/services/supabase/client.ts) | Cliente Supabase singleton (perezoso) |
| [src/components/emissions/](src/components/emissions/) | Componentes presentacionales (cards, lista, formulario, resumen, estados) |
| [supabase/migrations/](supabase/migrations/) | Tabla `emisiones`, RLS, grants por columna y publicación Realtime |

## Requisitos

- Node 24+ y npm.
- Docker en ejecución (solo para el modo Supabase local).

## Ejecutar

### Opción A — Supabase local (recomendada: RLS y tiempo real reales)

```bash
npm install
npm run db:start                 # levanta Postgres, Auth, Realtime... y aplica las migraciones
npm run db:status                # copia API_URL y ANON_KEY
cp .env.example .env             # pega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY; deja VITE_USE_MOCK=false
npm run dev                      # http://localhost:5173
```

Para ver el tiempo real abre la app en **dos pestañas** e inserta en una: aparece en la otra sin recargar.
Cada navegador obtiene una sesión anónima propia; una ventana de incógnito es otro usuario y no ve tus datos.

### Opción B — Modo demo sin base de datos

```bash
npm install
echo "VITE_USE_MOCK=true" > .env
npm run dev
```

Usa un servicio en memoria con datos de ejemplo y las mismas reglas de validación que la BD (los datos se pierden al recargar).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `preview` | Desarrollo, build de producción y previsualización |
| `npm run typecheck` | `tsc -b` en modo estricto |
| `npm run lint` | oxlint: reglas de React, accesibilidad (`jsx-a11y`) y **límites entre capas** |
| `npm test` | Vitest (hooks con el servicio mock, validación, formulario accesible, renders, Realtime) |
| `npm run db:start` / `db:stop` / `db:status` / `db:reset` | Supabase local |
| `npm run db:lint` | `supabase db lint --level warning` |
| `npm run db:types` | Regenera `src/services/supabase/database.types.ts` |
| `npm run evidence` | Con Supabase y `npm run dev` arriba: genera capturas y verifica Realtime + RLS (Playwright) |

Prueba de RLS en psql (dos usuarios y `anon`, sin dejar datos):
`docker exec -i supabase_db_ecotrack psql -U postgres < supabase/tests/rls_emisiones.sql`

## Arquitectura en una línea

`EmissionsTracker` → `useEmissions` / `useEmissionForm` → `emissionsService` → `getSupabase()` → tabla `emisiones` (RLS) + canal Realtime.
Solo `src/services/` importa `@supabase/supabase-js`; los componentes solo reciben props. `npm run lint` lo hace cumplir.
Detalle y decisiones en [ARCHITECTURE.md](ARCHITECTURE.md).

## Seguridad

- El frontend usa solo la anon key; la seguridad real está en la base de datos.
- RLS `to authenticated` con `owner_id = (select auth.uid())`; sin políticas de update/delete.
- `revoke all` + `grant insert (fuente, categoria, co2_kg)`: el cliente no puede fijar `owner_id` ni `medido_en`.
- Realtime respeta RLS: un usuario no recibe inserciones de otro (verificado).
- La sesión anónima es para la demo: en producción requiere CAPTCHA/Turnstile o login real.

## Documentación y evidencias

- [docs/SPEC.md](docs/SPEC.md): especificación, criterios de aceptación y su estado con evidencia.
- [ARCHITECTURE.md](ARCHITECTURE.md): capas, flujo, decisiones (ADR) y deuda técnica.
- [docs/BITACORA_PROMPTS.md](docs/BITACORA_PROMPTS.md) y [docs/prompts/](docs/prompts/): los 4 prompts y la evolución del código.
- [docs/evidencias/](docs/evidencias/): capturas por iteración, prueba RLS, contraste WCAG y `final/` (generadas con `npm run evidence`).
