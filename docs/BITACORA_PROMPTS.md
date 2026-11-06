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
| 1 — Estructura | `docs/prompts/01-estructura.md` | `iter-1` | `f1d4c25` |
| 2 — Lógica | `docs/prompts/02-logica.md` | `iter-2` | `7dbc3e0` |
| 3 — Refinamiento | `docs/prompts/03-refinamiento.md` | `iter-3` | `eb7d305` |
| 4 — Tiempo real y cierre | `docs/prompts/04-realtime-cierre.md` | `iter-4` | ver `git rev-parse iter-4` |

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

**Prompt literal:** [`docs/prompts/02-logica.md`](prompts/02-logica.md) (aprobado sin cambios). Nace de los hallazgos 1 y 2 de la Iteración 1.

**Objetivo:** base de datos real con RLS, servicio (Supabase + mock), `useEmissions` robusto y la página conectada.

**Qué generó**
```
supabase/migrations/20261106004006_crear_emisiones.sql   ENUM, tabla, índice, revoke all + grants por columna, RLS select/insert
supabase/tests/rls_emisiones.sql                         prueba RLS reproducible (transacción + ROLLBACK)
src/config/env.ts                                        ya no lanza al importar; getSupabaseConfig() valida bajo demanda
src/services/supabase/client.ts                          getSupabase(): singleton perezoso, nunca se crea en modo mock
src/services/errors.ts                                   AppError + toAppError (42501, 23514/23502, 22P02, 22003, PGRST301, red, anon deshabilitado)
src/services/emissions.service.ts / emissions.mock.ts    interfaz EmissionsService + impl. Supabase + impl. mock con reglas del CHECK
src/services/auth.service.ts + context/AuthProvider.tsx  ensureUser() con signInAnonymously; estado 'loading' | 'ready' | 'error' (unión discriminada)
src/hooks/useEmissions.ts                                emissions, loading, error, isSubmitting, submitError, addEmission, reload
src/utils/emissions.ts                                   summarizeEmissions (suma en centésimas)
src/pages/EmissionsTracker.tsx                           sin datos de ejemplo ni selector: solo compone useEmissions + componentes
```

**Problemas reales detectados y cómo se resolvieron**
1. *Los tipos escritos a mano mentían.* Al generar `database.types.ts` con el CLI:
   ```
   src/services/inventory.service.ts(11,3): error TS2322: Type 'string' is not assignable to type 'ProductCategory'.
   ```
   `products.category` es `text + check` en SQL; el archivo manual de EcoTech lo declaraba como unión literal. Se corrigió con un
   type guard `isProductCategory` en el mapper (sin cast). Es justo el valor de `supabase gen types`: detectar en compilación que el esquema no es lo que el código cree.
2. *Warning de oxlint en la primera versión del hook:*
   ```
   src/hooks/useEmissions.ts:53:5: warning react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders
   ```
   `setLoading(true)` dentro del efecto. Se rediseñó: cada carga tiene una clave `userId:reloadToken` y `loading` se **deriva**
   (`result.key !== requestKey`), sin setState síncrono en el efecto.
3. *StrictMode creaba dos usuarios anónimos por carga.* Experimento real quitando la deduplicación de `ensureUser()` y contando en `auth.users`:
   ```
   SIN dedupe -> usuarios anonimos creados en 1 carga: 2
   CON dedupe -> usuarios anonimos creados en 1 carga: 1
   ```
   Solución: una promesa en vuelo compartida (`pending ??= resolveUser()`) en el servicio.
4. *Hallazgo 1 de la Iteración 1 resuelto:* sin variables de Supabase la app ahora muestra en la UI
   "Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env (ver .env.example), o usa VITE_USE_MOCK=true" (captura
   `docs/evidencias/iter-2/sin-config-error-visible.png`) en vez de una pantalla en blanco.
5. *Ajuste al contrato del prompt:* el prompt pedía `error` único; un fallo al insertar habría reemplazado el listado por la pantalla de error.
   Se separó `submitError` (error del envío, mostrado en el formulario) de `error` (error de carga).

**Evolución del código (antes → después)**
```ts
// Iteración 1 (EmissionsTracker): estado y datos dentro de la página
const [emissions, setEmissions] = useState<Emission[]>(SAMPLE_EMISSIONS)
setEmissions((prev) => [created, ...prev])            // inserción local, sin BD ni errores
// Iteración 2: la página solo compone; la lógica vive en el hook
const { emissions, loading, error, isSubmitting, submitError, addEmission, reload } = useEmissions()
const saved = await addEmission({ ... }); if (saved) setForm(EMPTY_FORM)   // limpia solo si se guardó
```

**Cómo el hook evita setState tras desmontar y la doble carga en StrictMode**
- Carga: el efecto marca `active = false` en su limpieza; la respuesta de un efecto ya limpiado (el primero de StrictMode o un reload anterior) se descarta.
- Mutación: `mountedRef` evita `setState` si el componente se desmontó durante `await service.create()`; `submittingRef` bloquea doble envío.
- Sesión: la promesa compartida de `ensureUser()` evita dos `signInAnonymously` (ver problema 3).

**Prueba RLS en psql** (`supabase/tests/rls_emisiones.sql`, salida completa en `docs/evidencias/iter-2/rls-psql.txt`):
```
1. A inserta 2 filas sin enviar owner_id → owner_es_a = t (lo puso auth.uid())
2. B lista → filas_visibles_para_b = 0
3. B fija owner_id de A → ERROR: permission denied for table emisiones            (grant por columnas)
3b. con grant temporal de owner_id → ERROR: new row violates row-level security policy (RLS: defensa en profundidad)
4. B fija medido_en → permission denied · 5. B update/delete → permission denied
6. co2_kg = 0 → violates check constraint "emisiones_co2_kg_check" · fuente '  X  ' → "emisiones_fuente_check"
7. JWT sin sub → violates row-level security policy · 8. anon select/insert → permission denied
9. A lista → filas_visibles_para_a = 2
```

**Prueba manual en el navegador** (Playwright 1.64.1, script temporal):
- Supabase: carga inicial OK · inserción válida aparece sin recargar y limpia el formulario · CO₂ = 0 → la BD responde 400 (23514) y la UI
  muestra "Algún dato no cumple las reglas…" conservando lo escrito · tras recargar, la medición persiste (misma sesión anónima).
- Mock (`VITE_USE_MOCK=true`, sin `.env`): carga los 4 datos semilla, inserta y valida igual que la BD.

**Hallazgos para la Iteración 3** (observados en capturas y pruebas, no corregidos aún):
- Durante la carga y con error, el resumen muestra `0.00 kg CO₂e` (engañoso); la prueba automatizada incluso confundió el resumen con datos.
- El mensaje de la BD es genérico ("algún dato no cumple…"): falta validación en el cliente que señale **qué** campo falla, antes de ir a la red.
- El formulario sigue habilitado aunque no haya sesión o la carga haya fallado.
- `summarizeEmissions` se recalcula en cada render (incluido cada tecleo en el formulario); las tarjetas se re-renderizan al escribir.
- Pendientes de la Iteración 1: cast en el `<select>`, separador de miles, `role="alert"`/`aria-busy`, encabezado del resumen.

**Verificación:** `tsc -b` exit 0 · `oxlint` exit 0 · `vitest run` 17/17 (summarize, toAppError, mock) · `vite build` OK · `db:lint` "No schema errors found" · `migration list --local` local = remoto en ambas migraciones.

## Iteración 3 — Refinamiento

**Prompt literal:** [`docs/prompts/03-refinamiento.md`](prompts/03-refinamiento.md). Redactado a partir de los hallazgos (a)–(h) de las
iteraciones 1 y 2 y ejecutado con la instrucción del Arquitecto de continuar sin pausa ("si no necesitas algo de mí, continúa").

**Objetivo:** endurecer el código que ya funcionaba: TypeScript estricto, accesibilidad, validación, re-renders, UI profesional y tests.

**Qué generó (por restricción)**
- *TypeScript:* `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` en `tsconfig.app.json`.
  `useEmissions` expone `state` como unión discriminada (`loading | error | empty | success`, `emissions` solo existe en `success`).
  `isEmissionCategory` (type guard) reemplaza el cast del `<select>`. `FocusRequest` y `EmissionFieldErrors` viven en `types/`.
- *Validación:* `utils/validation.ts` → `validateEmission(values)` con las mismas reglas que el CHECK (2–100 tras trim, ENUM, > 0,
  ≤ 2 decimales, ≤ 9.999.999.999,99) y acepta coma decimal ("845,3"). `hooks/useEmissionForm.ts`: errores por campo tras blur
  o intento de envío, se corrigen en vivo, pedido de foco al primer inválido, mensaje de éxito.
- *Accesibilidad:* labels asociados, `aria-required`, `aria-invalid` + `aria-describedby` (pista + error), foco al primer inválido,
  éxito en `<output aria-live="polite">`, error de envío y de carga con `role="alert"`, `aria-busy` en el listado, el resumen y el
  formulario, skeleton `aria-hidden` con texto para lectores, resumen como `<dl>` con encabezado, `focus-visible` global,
  objetivos táctiles de 44 px (`min-h-11`), `motion-reduce` en animaciones.
- *Re-renders:* `useMemo` para `state` y `summary` en el hook, `useCallback` en todos los handlers de los hooks,
  `React.memo` en `EmissionCard`, `EmissionList`, `EmissionsSummary` y `EmissionForm`.
- *UI:* skeletons de tarjetas y resumen, el resumen ya no muestra ceros falsos (skeleton al cargar, "—" con error), estado vacío con
  CTA que enfoca el formulario, formato es-CO, badges de color por categoría (siempre con texto), formulario deshabilitado sin sesión.
- *Tests (44 en total):* `validation.test.ts` (16), `useEmissions.test.tsx` (8: carga, vacío, error de red + reload, inserción,
  error de inserción conservando el listado, doble envío, sin sesión, desmontaje), `emission-form.integration.test.tsx` (6: a11y y foco),
  `EmissionsTracker.renders.test.tsx` (1: medición de renders).

**Medición de re-renders antes/después** (mismo escenario: 20 tarjetas, escribir "Caldera 01" en el formulario):
```
ANTES (código de la iteración 2):  RENDERS ANTES: iniciales=20 tras escribir 10 caracteres=200
DESPUÉS (memo + referencias estables): 0 renders de tarjetas  → afirmado en EmissionsTracker.renders.test.tsx
```
Método: `formatMeasuredAt` solo lo llama `EmissionCard`, así que se reemplaza por un contador con `vi.mock('../utils')`.

**Lo que salió bien a la primera:** activar `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` dio **0 errores** (`tsc -b` exit 0):
el código previo ya usaba `?.` en accesos por índice. El flag queda como protección a futuro, no corrigió nada existente.

**Problemas reales detectados en esta iteración**
1. *Lint de accesibilidad* (plugin `jsx-a11y` activado en la Fase 0):
   ```
   src/components/emissions/EmissionsLoading.tsx:11:10: warning jsx-a11y(prefer-tag-over-role): Prefer `output` over `role` attribute `status`.
   src/components/emissions/EmissionForm.tsx:177:29: warning jsx-a11y(prefer-tag-over-role): Prefer `output` over `role` attribute `status`.
   ```
   Se reemplazó `role="status"` por el elemento nativo `<output>`.
2. *La regla de capas atrapó un test mal ubicado:*
   ```
   src/components/emissions/EmissionForm.test.tsx:4:1: error eslint(no-restricted-imports): '../../hooks' import is restricted from being used by a pattern.
   ```
   El test integra `useEmissionForm` + `EmissionForm`; se movió a `src/test/` en lugar de relajar la regla.
3. *Foco perdido al enviar (revisión propia del primer borrador):* el borrador deshabilitaba el `<fieldset>` durante el envío; un control
   `disabled` pierde el foco y el lector de pantalla queda en `<body>`. Se cambió a `aria-disabled` en el botón + guarda contra doble envío.
4. *Valor partido en dos líneas* con 3 columnas a 1440 px ("1.250,50 kg / CO₂e", captura `docs/evidencias/iter-3/antes-valor-partido.png`).
   Se separó número y unidad (`formatKg` + `CO2_UNIT`), con la unidad en tamaño menor y sin corte (`escritorio-1440.png`).
5. *Medición responsive inválida en el primer intento:* contra Supabase, cada contexto de Playwright es un usuario anónimo nuevo sin
   datos, así que no había `<ul>` que medir (reportó 1 columna en tablet). Se repitió en modo mock:
   ```
   movil-360: viewport=360px scrollWidth=360px columnas=1 sin scroll horizontal
   movil: viewport=390px scrollWidth=390px columnas=1 sin scroll horizontal      (iPhone 13, emulación real)
   tablet: viewport=768px scrollWidth=768px columnas=2 sin scroll horizontal     (iPad Mini)
   escritorio: viewport=1440px scrollWidth=1440px columnas=3 sin scroll horizontal
   ```
6. *Comentario inexacto propio:* el código afirmaba "contraste ≥ 7:1" en los badges; el cálculo dio 6.41:1 (ámbar). Cumple AA, pero se
   corrigió el comentario al valor medido.

**Contraste WCAG** (`scripts/contrast.mjs`, salida en `docs/evidencias/iter-3/contraste-wcag.txt`): 14 pares, todos AA; el mínimo de texto es
5.48:1 (blanco sobre `brand-600` en el botón) y el foco 5.22:1 (≥ 3 requerido para componentes no textuales).

**Navegación por teclado (Playwright, contra Supabase):** orden de Tab "Registrar primera medición → Fuente → Categoría → CO₂ → Agregar
medición"; Enter con el formulario vacío deja el foco en `emission-source`; tras guardar se anuncia
`Medición "Montacargas a gas" (Transporte) agregada.`; consola sin errores ni warnings.

**Evolución del código (antes → después)**
```tsx
// Iteración 2: errores solo del servidor, cast y recálculo en cada render
onChange={(e) => onChange('category', e.target.value as EmissionFormValues['category'])}
const { totalKg, byCategory } = summarizeEmissions(emissions)        // en la página, cada tecleo
// Iteración 3: validación local por campo, type guard y memo
category: isEmissionCategory(raw) ? raw : ''                         // useEmissionForm.setField
const summary = useMemo(() => ..., [emissionsForSummary])            // useEmissions
<input aria-invalid={errors.source !== undefined} aria-describedby="emission-source-hint emission-source-error" />
```

**Verificación:** `tsc -b` exit 0 · `oxlint` exit 0 (0 warnings) · `vitest run` 44/44 · `vite build` OK.

**Para la Iteración 4:** el subtítulo ya promete "actualizada en tiempo real" pero aún no hay suscripción; falta README final y capturas
automatizadas reproducibles (hoy son scripts temporales).

## Iteración 4 — Tiempo real y cierre

**Prompt literal:** [`docs/prompts/04-realtime-cierre.md`](prompts/04-realtime-cierre.md). Nace del hallazgo final de la Iteración 3
(la UI prometía "tiempo real" sin suscripción) y de que las capturas dependían de scripts temporales.

**Objetivo:** Realtime robusto, evidencia reproducible y documentación de cierre.

**Qué generó**
```
supabase/migrations/20261106005539_habilitar_realtime_emisiones.sql   alter publication supabase_realtime add table public.emisiones
EmissionsService.subscribeToInserts(onInsert, onStatus) → () => void   canal postgres_changes INSERT + removeChannel; mock con eco
parseEmissionRow(unknown)                                               valida el payload de Realtime sin casts (co2_kg número o texto)
useEmissions                                                            suscripción por usuario, withEmission() deduplica por id, realtime status
LiveIndicator                                                           "En vivo" / "Conectando…" / "Sin tiempo real" en <output>
scripts/capture-evidence.mjs (npm run evidence)                         9 verificaciones + capturas en docs/evidencias/final/
README final, ARCHITECTURE (flujo Realtime, D10–D14), SPEC §7 (estado de CA-01…CA-16)
```

**Deduplicación:** la inserción propia llega dos veces (respuesta de `create()` y eco de Realtime) y en orden no garantizado.
Ambas rutas pasan por `withEmission(prev, e)`, que solo antepone si el `id` no existe. Probado en los dos órdenes
(`useEmissions.test.tsx`: "eco DESPUÉS de create()" y "eco ANTES de que create() resuelva") y en navegador.

**Problemas reales detectados**
1. *Bug de usabilidad que los tests de jsdom no veían: el primer click en "Agregar medición" se perdía.* El script de evidencias
   reportó `foco en ""` y solo 2 `aria-invalid` (se esperaban 3). Instrumentando el `onSubmit`:
   ```
   DEBUG handleSubmit isSubmitting= false      ← primer envío (válido)
   --- segundo envío (inválido)
   [ 'emission-source', 'emission-co2' ]       ← handleSubmit NUNCA se ejecutó
   ```
   Causa: al presionar el botón, el campo CO₂ pierde el foco; el error "en blur" (Iteración 3) aparece y **empuja el botón hacia abajo
   entre mousedown y mouseup**, así que el click cae fuera. jsdom no calcula layout, por eso los 44 tests pasaban.
   Solución: errores visibles al intentar enviar y, desde ahí, actualizados en vivo (patrón recomendado: no errores prematuros).
   Después del cambio: `focus: 'emission-source', invalid: ['emission-source','emission-category','emission-co2']`.
   Se agregaron 2 tests de regresión ("no muestra errores al salir de un campo" y "envío inválido DESPUÉS de uno exitoso").
2. *Falso positivo en mi propio script:* "sin duplicados: 2 tarjeta(s)". `getByText` coincide por subcadena y contó también el
   mensaje de éxito `Medición "Generador diésel…" agregada.`. Se corrigió contando solo `<article>`: 1 tarjeta.
3. *`supabase migration new` se quedó colgado* (timeout de 120 s): con stdin canalizado el CLI espera el SQL por ahí. Al matarlo,
   el resto de la cadena en segundo plano corrió `migration up` a la vez que el mío:
   `ERROR: relation "emisiones" is already member of publication "supabase_realtime" (SQLSTATE 42710)`.
   Para no depender de ese estado se hizo `supabase db reset`: las 3 migraciones se reaplicaron limpias y la tabla quedó en la publicación.
   Se documentó en `CLAUDE.md` usar `< /dev/null`.
4. *El contrato del servicio cambió y TypeScript lo hizo cumplir:* los servicios falsos de los tests fallaron con
   `Property 'subscribeToInserts' is missing in type ... but required in type 'EmissionsService'` hasta implementarlo.

**Verificación en navegador** (`npm run evidence`, salida en `docs/evidencias/final/capture-log.txt`):
```
03 validación: foco en "emission-source", campos con aria-invalid=true: 3
05 tiempo real: la pestaña 1 pasó de 4 a 5 tarjetas sin recargar (~313 ms tras enviar en la pestaña 2)
   deduplicación: la pestaña 2 (que insertó y recibió su propio eco) muestra 1 tarjeta con esa fuente
06 aislamiento RLS en Realtime: el usuario B ve 0 tarjetas (esperado 0)
07 carga lenta simulada (2,5 s): skeleton con aria-busy="true"
08 movil-iphone13: viewport 390px, 1 columna(s), sin scroll horizontal
09 tablet-ipad-mini: viewport 768px, 2 columna(s), sin scroll horizontal
consola: sin errores
```

**Evolución del código (antes → después)**
```ts
// Iteración 3: la inserción propia filtraba duplicados solo en addEmission; no había suscripción
setResult((prev) => prev && { ...prev, emissions: [created, ...prev.emissions.filter((e) => e.id !== created.id)] })
// Iteración 4: una sola función para las dos rutas (create y Realtime) + suscripción con limpieza
const unsubscribe = service.subscribeToInserts((e) => active && setResult((prev) => withEmission(prev, e)), (s) => active && setRealtime(s))
return () => { active = false; unsubscribe() }        // → supabase.removeChannel(channel)
```

**Verificación final:** `tsc -b` exit 0 · `oxlint` exit 0 · `vitest run` **59/59** (9 archivos) · `vite build` OK ·
`db:lint` "No schema errors found" · solo `src/services/` importa `@supabase/supabase-js` · sin claves en archivos versionados.

---

## Resumen de la evolución

| Iteración | Disparador | Cambio principal | Problema real más importante |
|---|---|---|---|
| 0 | Setup | Tailwind v4, Supabase CLI, Vitest, reglas de capas en lint | El lint encontró `context/` importando el SDK de Supabase |
| 1 | Spec | 7 componentes presentacionales con props tipadas | La app quedaba en blanco sin `.env` (fallo solo en ejecución) |
| 2 | Hallazgos de la 1 | RLS + grants por columna, servicio Supabase/mock, `useEmissions` | StrictMode creaba 2 usuarios anónimos por carga (medido: 2 → 1) |
| 3 | Hallazgos de la 2 | Validación, a11y, unión discriminada, memo | 200 renders de tarjetas al escribir 10 caracteres → 0 |
| 4 | Hallazgos de la 3 | Realtime con deduplicación, evidencia reproducible | El error en blur desplazaba el botón y el click se perdía |
