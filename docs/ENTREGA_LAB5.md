LAB 5: DESPLIEGUE Y FORTALECIMIENTO - AUDITORÍA DE IA Y OPTIMIZACIÓN FINAL
==========================================================================

1. DATOS DEL PROYECTO
- Estudiante: Sebastián - Maestría en Informática, Escuela Colombiana de Ingeniería Julio Garavito.
- App auditada: EcoTrack (React 19 + Vite 8 + Supabase), el proyecto del laboratorio anterior, en el rol de "EcoMart".
- Repositorio: https://github.com/Juanseom/project-ia-architect (tag lab5-antes = estado auditado, tag lab5 = resultado).
- Informe completo: docs/AUDITORIA_LAB5.md. Prompts: docs/prompts/05, 06 y 07. Evidencias: docs/evidencias/lab5/.

2. PROCESO: ARQUITECTURA BASADA EN ESPECIFICACIONES
- Primero se escribieron criterios verificables (docs/SPEC.md, sección 8: CA-17 a CA-25). Después vino el código.
- Un prompt avanzado por paso (ROL, CONTEXTO, TAREA, RESTRICCIONES, FORMATO). El de seguridad mejora el sugerido: agrega modelo de amenazas (la anon key es pública y cualquiera llama a la API con curl), alcance exacto, PoC obligatoria por hallazgo y la lista de lo que NO es vulnerable.
- Ningún hallazgo se aceptó sin PoC real (curl con la anon key, psql con roles); cada corrección se validó repitiendo la PoC.
- Diálogo iterativo: la primera optimización empeoró el LCP. Se volvió a preguntar con los datos medidos (prompt 06b), se midieron 3 variantes y se descartaron las que no mejoraban.

3. INFORME DE AUDITORÍA: LOS 3 HALLAZGOS MÁS CRÍTICOS

H1 (Alta) - Tabla products heredada con privilegios por defecto y oráculo entre usuarios
- Hallazgo: los roles anon y authenticated tenían TODOS los privilegios, incluido TRUNCATE, que RLS no controla. Las políticas aplicaban a "public" y había un UNIQUE(sku) global.
- PoC: A crea el SKU privado "ECO-SECRETO-2027". Cuando B intenta el mismo SKU recibe 409 "duplicate key", y con uno inexistente recibe 201. Así B descubre los SKU de A y puede secuestrarlos.
- Corrección (migración nueva endurecer_products): revoke all, grants por columna (el cliente ya no fija owner_id ni created_at), UNIQUE(owner_id, sku) y políticas "to authenticated" con (select auth.uid()). Además, inventory.service dejó de mostrar el mensaje crudo de Postgres.
- Después: anon queda sin privilegios, el mismo SKU entre usuarios responde 201 (sin oráculo) y fijar created_at da "permission denied".

H2 (Alta) - Abuso con sesión anónima y KPI falso
- Hallazgo: cualquiera puede crear una sesión anónima e insertar sin límite. Además, el dashboard descargaba todas las filas para sumarlas en el cliente.
- PoC: 5.000 filas en UNA petición en 0,07 s (30.000 en total). PostgREST corta las respuestas en max_rows=1000, así que el dashboard mostraba 1.000 kg cuando el total real del usuario era 30.000 kg. En un producto de huella de carbono, eso es un KPI falso.
- Corrección (migración limitar_escrituras_y_resumen_emisiones):
  - Trigger por sentencia con tabla de transición: máximo 10 filas por solicitud, 30 por minuto y 5.000 por cuenta.
  - El trigger lanza el SQLSTATE PT429, que PostgREST convierte en HTTP 429; la UI lo traduce a "Estás registrando mediciones muy rápido".
  - Vista emisiones_resumen con security_invoker (RLS por usuario) para calcular total y desglose en la BD.
  - El frontend pide solo las 50 mediciones más recientes.
- Después: el bulk de 5.000 da 429, el cuarto lote de 10 en el mismo minuto da 429 y el resumen muestra los 30.000 kg reales.

H3 (Crítica) - La service_role podía terminar en el bundle
- Hallazgo: Vite publica toda variable VITE_*, y el proyecto no validaba qué clave se pegaba.
- PoC: un build con la service_role en VITE_SUPABASE_ANON_KEY terminó OK, la clave quedó en assets/index-*.js con role=service_role y, con ella, la API devolvió filas de 6 usuarios distintos (RLS ignorado).
- Corrección en dos barreras:
  1. Plugin de Vite noClientSecrets: falla el build si una VITE_* o un archivo generado contiene sb_secret_ o un JWT con role=service_role.
  2. env.ts: rechaza la clave en ejecución antes de crear el cliente.
- Después: el build se detiene con "[seguridad] VITE_SUPABASE_ANON_KEY contiene una clave secreta" y no genera dist.

Otros corregidos: no había CSP; el mock con datos de demo viajaba en producción; mensajes crudos de Postgres en la UI; useProducts consultaba sin sesión.

Pendiente para el hosting: CAPTCHA (Turnstile) en las sesiones anónimas, porque en local el rate limit de sign-ins no se activó (40 de 40 respondieron 200).

Controles verificados sin hallazgo:
- XSS: se guardó "<img src=x onerror=alert(1)>" como fuente y se mostró como texto (0 alert). No hay dangerouslySetInnerHTML.
- Inyección: no se arman filtros de PostgREST con texto del usuario.
- RLS de emisiones y Realtime: se repitieron las pruebas del laboratorio anterior sin regresiones.

4. OPTIMIZACIÓN DEL BUNDLE (CAPTURA Y REPORTE)
- Análisis con rollup-plugin-visualizer (treemaps en docs/evidencias/lab5/bundle-antes.png y bundle-despues.png).
- Antes había un solo chunk de 456 kB (131 kB gzip): react-dom 54,6 %, familia @supabase 38 % (incluye storage, functions e iceberg, que la app no usa) y código propio 5 %.
- Cambios en vite.config.ts:
  - build.rolldownOptions.output.codeSplitting.groups separa vendor-react y vendor-supabase (manualChunks está deprecado en Vite 8). Así la caché del navegador sobrevive a los deploys de la app.
  - Plugins propios: guard de secretos y CSP (solo en build); visualizer con ANALYZE.
- Cambios de código:
  - El SDK de Supabase se carga con import() dinámico, así que getSupabase() pasó a ser asíncrono.
  - El mock solo se descarga en modo demo.
  - Router propio sin dependencias (useSyncExternalStore). Se descartó react-router porque sumaría peso.
  - React.lazy + Suspense (skeleton de página) + ErrorBoundary (por si falla la descarga de un chunk) en las rutas /inventario y 404.
- Chunks después: app 10,8 kB gzip, vendor-react 68 kB, vendor-supabase 55 kB (dinámico), InventoryPage y NotFound (perezosos, <1 kB).
- Medición con Playwright (3G rápida + CPU 4×, mediana de 9 corridas, servidor con gzip):
  - JS en la ruta crítica: 127,1 -> 77,5 kB (-39 %).
  - FCP: 1.088 -> 848 ms (-22,1 %).
  - LCP: 1.088 -> 848 ms (-22,1 %).
  - Datos visibles: 1.884 -> 1.640 ms (-13 %).
  - El JS total sube 3,3 % por la partición en chunks; se reporta igual.
- Diálogo con la IA, con cada variante medida:
  - Hacer perezosas todas las rutas dio FCP -25,6 % pero LCP +1,9 %: había una cascada de peticiones a los ~770 ms.
  - Agregar modulepreload de la página y de Supabase dio LCP +20,7 %, porque competía por ancho de banda con React. Descartada.
  - Ruta de aterrizaje eager y lazy solo en las secundarias dio LCP -23 %. Fue la elegida.
- Reemplazo de librerías: no hay moment ni lodash; fechas y números usan Intl nativo (0 kB). Se evaluó cambiar supabase-js por sus clientes modulares (~55 kB menos) y no se aplicó: implicaba reimplementar el token de Realtime, y ese chunk ya no bloquea la carga.

5. ENDURECIMIENTO DE SUPABASE
- Variables de entorno:
  - VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son públicas por diseño (.env ignorado por git); VITE_USE_MOCK activa la demo.
  - service_role y sb_secret_ solo en servidor o CLI, nunca en el cliente (lo garantizan el build y env.ts; documentado en .env.example y README).
- Comunicación mínima:
  - Columnas explícitas: owner_id nunca sale de la BD.
  - 50 filas en vez de 1.000 (150,9 kB -> 7,8 kB por carga).
  - Totales agregados en la BD.
  - Canal Realtime con filter owner_id=eq.<uid>.
- CSP de producción: script-src 'self' y connect-src limitado al proyecto Supabase (http y ws). Se verificó en vite preview: Realtime funciona y un script inline inyectado queda bloqueado.

6. FRAGMENTO DE CÓDIGO MEJORADO (política RLS de products)
Antes (migración 0001):
    create policy "products_select_own" on public.products for select using (auth.uid() = owner_id);
    -- sin revoke: anon y authenticated con ALL (incluido TRUNCATE); sku UNIQUE global
Después (migración endurecer_products):
    revoke all on table public.products from anon, authenticated;
    grant insert (name, sku, category, stock, carbon_footprint_kg) on table public.products to authenticated;
    alter table public.products add constraint products_owner_sku_key unique (owner_id, sku);
    create policy "products_select_own" on public.products
      for select to authenticated using (owner_id = (select auth.uid()));
Además, client.ts pasó de un createClient estático a un singleton asíncrono con await import('@supabase/supabase-js') que valida antes que la clave no sea secreta.

7. VERIFICACIÓN Y EVIDENCIAS
- Resultados:
  - tsc y oxlint exit 0; 75 de 75 tests (rate limit, resumen, filtro Realtime, guard de secretos, rutas perezosas).
  - Build OK, db lint sin errores y db reset reaplica las 5 migraciones.
  - supabase/tests/hardening_lab5.sql y rls_emisiones.sql dan los resultados esperados.
  - El E2E del laboratorio anterior pasa sin regresiones (tiempo real en unos 310 ms).
- Errores reales durante el proceso:
  - El guard de secretos se bloqueó a sí mismo en su primera versión: buscaba el literal "sb_secret_", que aparece en env.ts.
  - Un test abría un WebSocket contra el Supabase local porque Vitest carga el .env. Ahora los tests fuerzan modo mock.
- Evidencias en docs/evidencias/lab5/: treemaps, rendimiento.txt, hardening-psql.txt, h3-build-bloqueado.txt y capturas E2E.

8. CIERRE (RÚBRICA)
- Rigor en la auditoría: 3 vulnerabilidades críticas/altas con PoC antes y después, corregidas en la BD (RLS, grants por columna, trigger, vista security_invoker) y en el build (guard de secretos).
- Optimización: code splitting por ruta y por dependencia, justificado con mediciones (FCP y LCP -22 %).
- Documentación: informe y prompts versionados, diálogo iterativo con hipótesis descartadas y cifras reproducibles.
