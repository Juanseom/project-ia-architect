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
