# SPEC — EcoTrack · Dashboard de Emisiones en Tiempo Real

> Especificación funcional (SDD): define **qué** debe hacer el sistema y **cómo se verifica**.
> Cada criterio de aceptación (CA) tiene un método de verificación. Ninguno se marca como
> cumplido sin evidencia (salida de comando, test o captura).

## 1. Contexto

EcoTrack es una plataforma de monitoreo de huella de carbono para empresas. El núcleo de la interfaz
es el componente `EmissionsTracker`: un dashboard donde la empresa ve sus mediciones de CO₂ y registra
nuevas, con datos persistidos en Supabase y protegidos con Row Level Security.

## 2. Alcance

**Incluye:** listado de mediciones en tarjetas, formulario de alta, resumen (total y desglose por
categoría), actualización en tiempo real, modo mock sin base de datos.

**No incluye:** edición o borrado de mediciones, login con email/OAuth (se usa sesión anónima),
multiempresa/roles, exportación de reportes.

## 3. Modelo de dominio

| Campo (dominio) | Columna (BD) | Tipo | Regla |
|---|---|---|---|
| `id` | `id` | uuid | generado por la BD |
| `source` | `fuente` | texto | requerido, 2–100 caracteres sin espacios sobrantes |
| `category` | `categoria` | `'transporte' \| 'energia' \| 'residuos'` | ENUM cerrado |
| `co2Kg` | `co2_kg` | numeric(12,2) | > 0, máx. 2 decimales |
| `measuredAt` | `medido_en` | timestamptz | por defecto `now()` |
| — | `owner_id` | uuid | lo fija la BD (`auth.uid()`), nunca el cliente |

Etiquetas visibles: Transporte, Energía, Residuos. CO₂ se muestra como `kg CO₂e`.

## 4. Requisitos funcionales

- **RF-1 Visualización.** Listado de tarjetas con nombre de la fuente, categoría y CO₂ producido, ordenado de la más reciente a la más antigua.
- **RF-2 Alta de medición.** Formulario con fuente, categoría y CO₂ (kg). Al enviar válido, la medición aparece en el listado sin recargar la página.
- **RF-3 Estado vía hook.** `useEmissions` gestiona carga, inserción y errores; la UI no conoce Supabase.
- **RF-4 Resumen.** Total de CO₂ y desglose por categoría, actualizados al insertar.
- **RF-5 Tiempo real.** Una medición insertada desde otra pestaña/cliente del mismo usuario aparece sin recargar.
- **RF-6 Modo mock.** Con `VITE_USE_MOCK=true` la app funciona sin base de datos, con datos simulados.

## 5. Requisitos no funcionales

- **RNF-1 Arquitectura.** Capas de EcoTech: `pages → components`, `pages → hooks → services → supabase`. Solo `services/` importa `@supabase/supabase-js`.
- **RNF-2 TypeScript estricto.** `strict`, cero `any`, estado asíncrono modelado con tipos.
- **RNF-3 Seguridad.** RLS activo; solo anon key en el frontend; el cliente no puede fijar `owner_id`.
- **RNF-4 Accesibilidad.** WCAG 2.1 AA: labels, errores anunciados, foco gestionado, teclado, contraste.
- **RNF-5 Responsive.** Usable en móvil (≥ 360 px), tablet y escritorio.
- **RNF-6 Rendimiento.** Sin re-renders innecesarios de tarjetas al escribir en el formulario.

## 6. Criterios de aceptación

| ID | Criterio | Verificación |
|---|---|---|
| CA-01 | Existen `src/pages/EmissionsTracker.tsx`, `src/hooks/useEmissions.ts`, `src/services/supabase/client.ts` y la migración de `emisiones`. | `ls` / revisión del repo |
| CA-02 | Cada tarjeta muestra fuente, categoría con tilde ("Energía") y CO₂ formateado en es-CO (`4.980,75 kg CO₂e`). | Test de componente + captura |
| CA-03 | Mientras carga se muestra un skeleton con `aria-busy="true"`. | Test + captura de carga |
| CA-04 | Sin mediciones se muestra un estado vacío con llamada a la acción. | Test + captura |
| CA-05 | Si la carga falla se muestra un mensaje entendible (no el error crudo de Postgres) con `role="alert"` y botón "Reintentar". | Test del hook con mock que falla |
| CA-06 | Fuente vacía, categoría inválida o CO₂ ≤ 0 bloquean el envío, marcan el campo con `aria-invalid` y mueven el foco al primer campo inválido. | Test de validación del formulario |
| CA-07 | Durante el envío el botón queda deshabilitado; al terminar, un mensaje de éxito se anuncia por `aria-live`. | Test + captura |
| CA-08 | El total y el desglose por categoría coinciden con la suma de las mediciones listadas. | Test unitario del cálculo |
| CA-09 | Un usuario no ve las mediciones de otro (B ve 0 filas de A) y no puede insertar con `owner_id` ajeno. | Pruebas RLS en psql con dos usuarios |
| CA-10 | `anon` (sin sesión) no puede leer ni insertar en `emisiones`. | Prueba en psql con `set role anon` |
| CA-11 | Una inserción desde otra pestaña aparece en tiempo real, sin duplicar la propia. | Captura/video con dos pestañas |
| CA-12 | Con `VITE_USE_MOCK=true` la app carga e inserta sin Supabase. | Ejecución en modo mock + tests del hook |
| CA-13 | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y `npm run db:lint` terminan sin errores. | Salida de los comandos |
| CA-14 | Ningún archivo fuera de `services/` importa `@supabase/supabase-js`; ningún componente importa hooks/services/context. | `npm run lint` (`no-restricted-imports`) |
| CA-15 | El grid de tarjetas pasa de 1 columna (móvil) a 2 (tablet) y 3 (escritorio). | Capturas móvil y escritorio |
| CA-16 | No hay secretos en git y `.env.example` documenta todas las variables. | `git grep` de claves + revisión |

## 7. Estado de los criterios de aceptación (cierre de la Iteración 4)

| ID | Estado | Evidencia |
|---|---|---|
| CA-01 | ✅ | `src/pages/EmissionsTracker.tsx`, `src/hooks/useEmissions.ts`, `src/services/supabase/client.ts`, `supabase/migrations/2026110600*` |
| CA-02 | ✅ | `docs/evidencias/final/04-escritorio.png`; `formatters` probados en `smoke.test.ts` |
| CA-03 | ✅ | `final/07-cargando-skeleton.png` (latencia simulada 2,5 s, `aria-busy="true"`); `useEmissions.test.tsx` |
| CA-04 | ✅ | `final/01-estado-vacio.png`; CTA enfoca el formulario |
| CA-05 | ✅ | `useEmissions.test.tsx` ("traduce el error de carga y se recupera con reload()"); `errors.test.ts`; `iter-2/sin-config-error-visible.png` |
| CA-06 | ✅ | `emission-form.integration.test.tsx` (8 casos); `final/03-error-validacion.png` (3 campos `aria-invalid`, foco en el primero) |
| CA-07 | ✅ | `aria-disabled` + "Guardando…" y `<output aria-live="polite">` probados en `emission-form.integration.test.tsx` |
| CA-08 | ✅ | `utils/emissions.test.ts` (incluye 0.1 + 0.2) y `useEmissions.test.tsx` |
| CA-09 | ✅ | `supabase/tests/rls_emisiones.sql` → `docs/evidencias/iter-2/rls-psql.txt` (B ve 0 filas; suplantación bloqueada por grant y por RLS) |
| CA-10 | ✅ | Mismo script, caso 8: `anon` → `permission denied` en select e insert |
| CA-11 | ✅ | `npm run evidence`: pestaña 1 recibe la inserción de la pestaña 2 en ~313 ms, sin duplicados; otro usuario ve 0 (`final/capture-log.txt`) |
| CA-12 | ✅ | `iter-2/mock-datos-semilla.png`; tests del hook con `createMockEmissionsService` |
| CA-13 | ✅ | typecheck, lint, 59 tests, build y db:lint en verde (ver bitácora, Iteración 4) |
| CA-14 | ✅ | `no-restricted-imports` en `.oxlintrc.json`; atrapó 2 violaciones heredadas (Fase 0) y 1 test mal ubicado (Iteración 3) |
| CA-15 | ✅ | `final/08-movil-iphone13.png` (1 col.), `final/09-tablet-ipad-mini.png` (2 col.), `final/04-escritorio.png` (3 col.), sin scroll horizontal |
| CA-16 | ✅ | `.env` ignorado (`git check-ignore`), escaneo de claves sobre el diff en cada commit; `.env.example` con las 3 variables |

## 8. Lab 5 — Auditoría, rendimiento y hardening (criterios adicionales)

| ID | Criterio | Estado | Evidencia |
|---|---|---|---|
| CA-17 | `anon` no tiene privilegios sobre `products`, `emisiones` ni `emisiones_resumen`; todas las políticas son `to authenticated`. | ✅ | `supabase/tests/hardening_lab5.sql` (H1.1) |
| CA-18 | Un usuario no puede inferir datos de otro por errores de unicidad (SKU único por dueño). | ✅ | `hardening_lab5.sql` (H1.2), PoC curl en `docs/AUDITORIA_LAB5.md` |
| CA-19 | Un usuario no puede insertar más de 10 filas por solicitud, 30 por minuto ni 5.000 en total (HTTP 429 traducido en la UI). | ✅ | `hardening_lab5.sql` (H2.1–H2.2), `errors.test.ts`, `useEmissions.test.tsx` |
| CA-20 | El total y el desglose del dashboard incluyen TODAS las mediciones aunque la lista muestre solo las 50 más recientes. | ✅ | Vista `emisiones_resumen`; PoC 30.000 kg; test "el resumen viene del servicio" |
| CA-21 | El build falla si una variable `VITE_*` o un archivo generado contiene una clave secreta; `env.ts` la rechaza en ejecución. | ✅ | `docs/evidencias/lab5/h3-build-bloqueado.txt`, `config/env.test.ts` |
| CA-22 | El build de producción incluye una CSP que bloquea scripts inline y limita `connect-src` al proyecto Supabase. | ✅ | Verificación en `vite preview` (script inyectado bloqueado, Realtime operativo) |
| CA-23 | El SDK de Supabase y el mock no están en la ruta crítica; las rutas secundarias se cargan con `React.lazy` + `Suspense`. | ✅ | `dist/index.html`, `bundle-despues.txt`, `routing.integration.test.tsx` |
| CA-24 | FCP y LCP mejoran ≥ 15 % con red 3G rápida + CPU 4× (mediana de ≥ 7 corridas). | ✅ | `docs/evidencias/lab5/rendimiento.txt` (−22,1 % ambos) |
| CA-25 | Los tests no usan red ni el Supabase local. | ✅ | `vite.config.ts` → `test.env` (modo mock) |

## 9. Proyecto final — EcoFlow (gestión de proyectos solares)

Especificación completa: [docs/prompts/08-prompt-maestro-ecoflow.md](prompts/08-prompt-maestro-ecoflow.md).
Arquitectura y evidencias: [docs/ARQUITECTURA_ECOFLOW.md](ARQUITECTURA_ECOFLOW.md).

| ID | Criterio | Estado | Evidencia |
|---|---|---|---|
| EF-01 | Instalador asignado ve solo su proyecto; no asignado 0; otro coordinador 0; anon sin privilegios. | ✅ | `supabase/tests/ecoflow_rls.sql`, E2E pasos 05 y 07 |
| EF-02 | Un proyecto no puede usar instaladores/materiales de otro coordinador (FK compuesta); creación atómica. | ✅ | `ecoflow_rls.sql` (EF-02) |
| EF-03 | Transiciones inválidas rechazadas por la BD; el instalador no reabre; `estado` no editable por UPDATE. | ✅ | `ecoflow_rls.sql` (EF-03), `utils/projects.test.ts` |
| EF-04 | Código de invitación de un solo uso; inválido y usado dan el mismo error; propio rechazado. | ✅ | `ecoflow_rls.sql` (EF-04), E2E paso 08, `useProjects.test.tsx` |
| EF-05 | El formulario no envía datos inválidos; errores por campo accesibles y foco al primero. | ✅ | `project-form.integration.test.tsx`, E2E paso 02 |
| EF-06 | Conteo y kW por estado correctos desde la BD (vista security_invoker). | ✅ | `ecoflow_rls.sql` (EF-06), E2E paso 09 |
| EF-07 | typecheck, lint, tests, build y db:lint verdes; sin regresiones de EcoTrack ni del Lab 5. | ✅ | 116/116 tests; regresiones SQL y E2E de EcoTrack |
