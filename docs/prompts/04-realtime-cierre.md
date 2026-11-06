# Prompt 04 — Tiempo real y cierre

```text
# ROL
Actúa como ingeniero senior de React + Supabase Realtime que lleva un feature a "listo para demo":
suscripciones robustas, documentación de ejecución y evidencia reproducible.

# CONTEXTO
- EcoTrack (iteraciones 1–3): dashboard con carga, inserción, validación accesible, memo medido (200 → 0 renders)
  y 44 tests. useEmissions expone state (unión discriminada) y summary memoizado.
- Hallazgo pendiente: la UI promete "actualizada en tiempo real" pero no hay suscripción; una inserción desde
  otra pestaña solo aparece al recargar (RF-5 / CA-11 sin cumplir).
- Las capturas de las iteraciones se hicieron con scripts temporales: no son reproducibles por otra persona.
- La migración 20261106004006_crear_emisiones ya está aplicada (no se edita). La tabla aún no está en la
  publicación supabase_realtime.

# TAREA
1. Migración nueva `habilitar_realtime_emisiones`: alter publication supabase_realtime add table public.emisiones.
2. EmissionsService: agregar subscribeToInserts(onInsert, onStatus) → función de limpieza. En Supabase usa un
   canal postgres_changes (INSERT, schema public, tabla emisiones) y removeChannel al limpiar; valida el payload
   en tiempo de ejecución (sin casts) antes de mapearlo a Emission. En el mock, create() notifica a los suscriptores.
3. useEmissions: suscribirse cuando hay sesión, anteponer las inserciones recibidas deduplicando por id frente a la
   inserción propia (el eco de Realtime puede llegar antes o después de que create() resuelva), limpiar al desmontar,
   y exponer el estado de conexión ('connecting' | 'live' | 'offline') para un indicador "En vivo" accesible.
4. Tests: deduplicación (eco antes y después de create), limpieza al desmontar, inserción remota.
5. Verificar contra Supabase local con dos pestañas de la misma sesión: insertar en B aparece en A sin recargar, y
   una sesión de OTRO usuario no recibe el evento (RLS aplica a Realtime).
6. scripts/capture-evidence.mjs con Playwright: escritorio, móvil (emulación de dispositivo), estado de carga
   (latencia simulada en la red), error de validación e inserción en tiempo real, guardadas en docs/evidencias/.
7. README final con requisitos, ejecución (Supabase local y modo mock), scripts, tests, estructura y evidencias.
   Actualizar ARCHITECTURE.md (flujo Realtime) y SPEC (estado de los criterios de aceptación con su evidencia).

# RESTRICCIONES
- Solo services/ toca el canal de Supabase; el hook recibe datos de dominio y una función de limpieza.
- Sin librerías nuevas además de Playwright (devDependency, ya instalado para verificación).
- typecheck, lint, test, build y db:lint en verde. Ninguna clave en git.

# FORMATO DE SALIDA
1. SQL de la migración y salida de db:lint / migration list.
2. Archivos modificados completos y explicación de la deduplicación.
3. Evidencia: tests, prueba de dos pestañas, prueba de aislamiento entre usuarios, lista de capturas generadas.
4. Tabla final de criterios de aceptación (CA-01 a CA-16) con su evidencia.
```
