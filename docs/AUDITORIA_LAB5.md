# Informe de Auditoría de IA y Optimización Final — Lab 5

> Proyecto: **EcoTrack** (equivale a "EcoMart" del enunciado: React + Vite + Supabase listos para producción).
> Repositorio: https://github.com/Juanseom/project-ia-architect · estado previo: tag `lab5-antes` · resultado: tag `lab5`.
> Toda cifra de este informe sale de un comando o script versionado; las salidas están en `docs/evidencias/lab5/`.

## 0. Proceso (Arquitectura Basada en Especificaciones)

1. **Especificar** criterios verificables antes de tocar código (`docs/SPEC.md` §8, CA-17 a CA-25).
2. **Prompt avanzado** por paso del laboratorio (`docs/prompts/05` auditoría, `06` bundle, `07` hardening):
   rol + modelo de amenazas + alcance + exigencia de PoC + formato verificable.
3. **Verificar la respuesta de la IA** con PoC reales contra la API pública (curl con la anon key, psql con
   `set role` + `request.jwt.claims`) antes de aceptar un hallazgo. Lo que no se pudo demostrar se reporta como "no vulnerable".
4. **Corregir** con migraciones nuevas y código; **repetir la PoC** para demostrar el cierre.
5. **Medir** el rendimiento antes/después; cuando una hipótesis de la IA no mejoró la métrica, se **re-preguntó con los datos** (prompt 06b) y se descartó.

## 1. Auditoría de seguridad (Paso 1)

Modelo de amenazas: la URL y la anon key viajan en el bundle, así que un atacante llama a PostgREST/Auth/Realtime
con curl sin pasar por la UI. La app crea sesiones anónimas sin CAPTCHA. La única barrera real es la base de datos.

| ID | Sev. | Componente | Vector | Impacto |
|---|---|---|---|---|
| H1 | Alta | `products` (migración 0001 heredada) | Privilegios por defecto + políticas para `public` + `UNIQUE(sku)` global | Oráculo de datos de otros usuarios, secuestro de SKU, `TRUNCATE` concedido a `anon` (RLS no lo controla) |
| H2 | Alta | `emisiones` + sesión anónima + `list()` | Bulk insert ilimitado vía PostgREST; `max_rows=1000` | DoS / almacenamiento; **KPI falso**: el dashboard sumaba 1.000 kg con 30.000 kg reales |
| H3 | Crítica | `config/env.ts` + build de Vite | `service_role` pegada en `VITE_SUPABASE_ANON_KEY` | La clave que ignora RLS queda en el JS público; lectura de datos de todos los usuarios |
| M1 | Media | `index.html` | Sin Content-Security-Policy | Sin defensa en profundidad si aparece un XSS futuro |
| M2 | Media | `emissions.service.ts` | Mock y datos semilla en el bundle de producción | Código muerto y datos de demo publicados |
| M3 | Media | `inventory.service.ts` | `throw new Error(error.message)` | Mensaje crudo de Postgres en la UI (constraint, valores) |
| M4 | Media | `config.toml` | CAPTCHA deshabilitado; el rate limit de sign-ins anónimos no se activó en local (40/40 → 200) | Creación masiva de cuentas (mitigado por H2 por usuario; pendiente en producción) |

### H1 — Privilegios y oráculo entre usuarios en `products`
PoC antes (`curl` con dos sesiones anónimas A y B):
```
anon: DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE          políticas: roles={public}
A inserta SKU "ECO-SECRETO-2027": 201
B inserta el MISMO SKU: 409 {"code":"23505","message":"duplicate key value violates unique constraint \"products_sku_key\""}
B inserta un SKU inexistente: 201      → B sabe qué SKU privados tiene A
```
Corrección: `supabase/migrations/20261106232245_endurecer_products.sql`.
```sql
revoke all on table public.products from anon, authenticated;
grant select, delete on table public.products to authenticated;
grant insert (name, sku, category, stock, carbon_footprint_kg) on table public.products to authenticated;
grant update (name, sku, category, stock, carbon_footprint_kg) on table public.products to authenticated;
alter table public.products drop constraint products_sku_key;
alter table public.products add constraint products_owner_sku_key unique (owner_id, sku);
create policy "products_select_own" on public.products
  for select to authenticated using (owner_id = (select auth.uid()));   -- (+ insert/update/delete)
```
Más: `inventory.service.ts` usa `toAppError` (M3) y `useProducts` espera la sesión antes de consultar (antes leía con RLS y sin sesión → 0 filas).
PoC después: anon `(ninguno)` · B usa el mismo SKU → **201** (cada dueño tiene su espacio) · fijar `created_at`/`owner_id` → `permission denied` · anon lista → 401.

### H2 — Abuso con sesión anónima y KPI falso
PoC antes:
```
5000 filas en 1 request: HTTP 201 en 0.07 s (×6 → 30.000 filas)
GET /emisiones → 1000 filas (max_rows) → total calculado en el cliente: 1000 kg   (real del usuario: 30.000 kg)
```
Corrección: `20261106232247_limitar_escrituras_y_resumen_emisiones.sql`.
```sql
create trigger emisiones_limitar_escrituras after insert on public.emisiones
  referencing new table as nuevas for each statement
  execute function public.limitar_escrituras_emisiones();   -- ≤10 por request, ≤30/min, ≤5000 por cuenta
-- raise exception ... using errcode = 'PT429'  → PostgREST responde HTTP 429
create view public.emisiones_resumen with (security_invoker = true) as
  select e.categoria, count(*)::int as mediciones, sum(e.co2_kg) as co2_kg from public.emisiones e group by e.categoria;
```
Frontend: `list()` pide solo las 50 más recientes; el total y el desglose vienen de la vista (RLS por `security_invoker`)
y Realtime los incrementa con `addToTotals`; `PT429` se traduce a "Estás registrando mediciones muy rápido…".
PoC después: bulk 5000 → **429** "Máximo 10 mediciones por solicitud" · lotes de 10: 201, 201, 201, **429** "(40) en el último minuto"
· resumen de A = **30.000 kg** (real) · anon → 401. Script: `supabase/tests/hardening_lab5.sql`.

### H3 — Clave secreta publicada en el bundle
PoC antes: `VITE_SUPABASE_ANON_KEY=<service_role> vite build` → build OK, clave encontrada en `assets/index-*.js`
(payload `{"role":"service_role"}`); con ella, `GET /emisiones` devolvió filas de **6 usuarios distintos**.
Corrección en dos barreras:
- Build: `tooling/vite-security.ts` (`noClientSecrets`) revisa las `VITE_*` y cada archivo generado; **falla el build**.
- Ejecución: `isSecretSupabaseKey()` en `config/env.ts` rechaza `sb_secret_…` y JWT con `role=service_role` antes de crear el cliente.

PoC después: `Error: [seguridad] VITE_SUPABASE_ANON_KEY contiene una clave secreta de Supabase…` y no se genera `dist/`.

### Controles verificados sin hallazgo
- **XSS**: fuente `<img src=x onerror=alert(1)>` guardada y recargada → 0 `alert`, 0 `<img>` en el DOM (React escapa); no hay `dangerouslySetInnerHTML`/`innerHTML`/`eval`.
- **Inyección**: ningún filtro PostgREST se arma con texto del usuario; `.eq('id', id)` va parametrizado.
- **RLS de `emisiones` y Realtime**: pruebas del Lab 4 repetidas sin regresión (B ve 0 filas; suplantación bloqueada por grant y por RLS).

## 2. Endurecimiento de Supabase (Paso 3)

| Variable | Dónde | ¿Al cliente? | Nota |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (git-ignorado) | Sí (pública) | Origen permitido en la CSP |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Sí (pública por diseño) | El build y `env.ts` rechazan claves secretas |
| `VITE_USE_MOCK` | `.env` | Sí | `true` = demo sin BD; el mock solo se descarga en ese modo |
| `service_role` / `sb_secret_…` | Solo servidor (CLI, Edge Functions, CI) | **Nunca** | Ignora RLS |

Comunicación mínima: columnas explícitas (`owner_id` nunca sale de la BD), 50 filas en vez de hasta 1.000
(150,9 kB → 7,8 kB por carga, medido en la PoC), resumen agregado en la BD, canal Realtime con `filter: owner_id=eq.<uid>`.
CSP de producción (inyectada solo en build): `script-src 'self'`, `connect-src` limitado al proyecto Supabase (http + ws).
Verificado en `vite preview`: Realtime funciona y un `<script>` inline inyectado se bloquea (`script-src-elem`).
Pendiente en el hosting (no aplica en `<meta>`): cabeceras `frame-ancestors`, HSTS; activar CAPTCHA (Turnstile) para sesiones anónimas (M4).

## 3. Optimización del bundle (Paso 2)

Herramienta: `rollup-plugin-visualizer` (`ANALYZE=antes|despues npm run build`) + `scripts/bundle-report.mjs`.
Rendimiento: `scripts/measure-performance.mjs` (servidor con gzip, 3G rápida 150 ms/1,6 Mbps, CPU 4×, mediana de 9).

| Chunk | Antes | Después | Carga |
|---|---|---|---|
| `index` (app + página de inicio) | 456,14 kB (131,11 gzip) | 30,98 kB (10,83 gzip) | Inicial |
| `vendor-react` | (dentro de index) | 218,74 kB (68,27 gzip) | Inicial, caché larga |
| `vendor-supabase` | (dentro de index) | 214,47 kB (55,19 gzip) | `import()` al iniciar sesión |
| `InventoryPage` / `NotFoundPage` | (no existían) | 1,39 / 0,65 kB | `React.lazy` al navegar |
| `emissions.mock` | (dentro de index) | 1,22 kB | Solo con `VITE_USE_MOCK=true` |

| Métrica (mediana) | Antes | Después | Cambio |
|---|---|---|---|
| JS en la ruta crítica (transferido) | 127,1 kB | 77,5 kB | **−39 %** |
| FCP | 1.088 ms | 848 ms | **−22,1 %** |
| LCP | 1.088 ms | 848 ms | **−22,1 %** |
| Datos visibles (sesión + API) | 1.884 ms | 1.640 ms | **−13,0 %** |
| JS total descargado | 127,1 kB | 131,3 kB | +3,3 % (costo de partir en chunks) |

Diálogo iterativo (cada variante medida con el mismo script):

| Variante | FCP | LCP | Decisión |
|---|---|---|---|
| 1. Supabase perezoso + todas las rutas con `React.lazy` | −25,6 % | +1,9 % | Re-prompt 06b: cascada a los ~770 ms |
| 2. + `modulepreload` de página y Supabase | +0,7 % | **+20,7 %** | Descartada: compite por ancho de banda con React |
| 3. + `modulepreload` solo de la página | −23,7 % | +3,3 % | Insuficiente |
| 4. Ruta de aterrizaje eager, `React.lazy` en rutas secundarias | −23,0 % | **−23,0 %** | **Elegida** |

Técnicas aplicadas: `import('@supabase/supabase-js')` en `services/supabase/client.ts` (singleton asíncrono);
`import('./emissions.mock')` solo en modo demo; router propio sin dependencias (`src/router`, `useSyncExternalStore`)
con `React.lazy` + `Suspense` (`PageSkeleton`) + `ErrorBoundary` para fallos de descarga; `codeSplitting.groups`
de rolldown (`manualChunks` está deprecado en Vite 8) para separar vendors; sub-barrels en `App` (el barrel raíz
arrastraba el dashboard al chunk inicial: 4 kB → 12,5 kB al corregirlo).
Reemplazos de librerías: no hay moment/lodash/date-fns (Intl nativo, 0 kB). Evaluado y **no aplicado**: cambiar
`supabase-js` por `postgrest-js` + `auth-js` + `realtime-js` ahorraría ~55 kB sin minificar (storage, functions,
iceberg) pero obliga a reimplementar la propagación del token a Realtime; ese chunk ya está fuera de la ruta crítica.

## 4. Fragmento de código refactorizado

`src/services/supabase/client.ts` — antes: cliente síncrono importado en el bundle inicial y sin control de claves.
```ts
// antes
import { createClient } from '@supabase/supabase-js'
export function getSupabase() { client ??= createClient<Database>(url, anonKey); return client }
// después
export function getSupabase(): Promise<SupabaseClient<Database>> {
  if (env.useMock) return Promise.reject(new Error('…modo mock…'))
  clientPromise ??= loadClient().catch((e) => { clientPromise = null; throw e })
  return clientPromise
}
async function loadClient() {
  const { url, anonKey } = getSupabaseConfig()            // lanza si la clave es service_role / sb_secret_
  const { createClient } = await import('@supabase/supabase-js')   // chunk vendor-supabase, fuera de la ruta crítica
  return createClient<Database>(url, anonKey)
}
```
Las políticas RLS refactorizadas de `products` están en §1 (H1).

## 5. Verificación final

`tsc -b` exit 0 · `oxlint` exit 0 · **75/75 tests** (11 archivos; nuevos: rate limit, resumen del servidor, filtro Realtime,
guard de secretos, enrutamiento perezoso) · `vite build` OK · `db:lint` sin errores · `db reset` reaplica las 5 migraciones ·
`hardening_lab5.sql` y `rls_emisiones.sql` con los resultados esperados · E2E del Lab 4 sin regresiones (`docs/evidencias/lab5/app/`).

Hallazgos de proceso (también reales): el guard de secretos se bloqueó a sí mismo en su primera versión (buscaba el literal
`sb_secret_` y `env.ts` lo contiene) → se cambió a un patrón de clave completa; un test de enrutamiento abría un WebSocket contra el
Supabase local porque Vitest carga `.env` → los tests ahora fuerzan modo mock (`test.env`).
