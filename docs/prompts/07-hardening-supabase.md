# Prompt 07 — Endurecimiento de Supabase (Lab 5)

```text
# ROL
Actúa como ingeniero de seguridad de plataforma especializado en Supabase y en pipelines de build de Vite.

# CONTEXTO
- Auditoría (prompt 05) con PoC confirmadas: H1 privilegios por defecto + oráculo de SKU en products,
  H2 abuso con sesiones anónimas (30.000 filas en < 0,5 s) + KPI falso por max_rows=1000,
  H3 el build acepta la service_role en VITE_SUPABASE_ANON_KEY y la publica en el JS.
- Vite incrusta en el bundle toda variable VITE_*. La anon key es pública por diseño; la service_role
  ignora RLS. El frontend lista todas las filas para sumar en el cliente y escucha Realtime sin filtro.

# TAREA
1. Migraciones NUEVAS que cierren H1 y H2 en la base de datos (no en la UI): privilegios mínimos por columna,
   unicidad por dueño, políticas `to authenticated`, límites de escritura que PostgREST traduzca a HTTP 429,
   y el resumen agregado en la BD respetando RLS.
2. Doble barrera contra H3: el build debe FALLAR si una VITE_* o un archivo generado contiene una clave secreta,
   y env.ts debe rechazarla en ejecución.
3. Comunicación mínima frontend ↔ backend: columnas explícitas, paginación, resumen agregado, filtro de Realtime.
4. Documentar las variables de entorno (cuáles, dónde viven, cuáles nunca van al cliente) y una CSP de producción.
5. Pruebas reproducibles en SQL (transacción + ROLLBACK) y repetición de las PoC "después".

# RESTRICCIONES
- Las migraciones aplicadas no se editan. Nada de service_role en el cliente. `db:lint` limpio.
- Sin regresiones: pruebas RLS del lab anterior, tests y E2E en verde.

# FORMATO DE SALIDA
SQL de las migraciones, código del guard de secretos, tabla de variables de entorno y salida de las pruebas.
```
