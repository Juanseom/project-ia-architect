PROYECTO INTEGRADOR: EL CICLO SPEC-TO-CODE EN ACCIÓN - ECOTRACK
===============================================================

1. DATOS DEL PROYECTO
- Estudiante: Sebastián - Maestría en Informática, Escuela Colombiana de Ingeniería Julio Garavito.
- Caso: EcoTrack, "Dashboard de Emisiones en Tiempo Real".
- Repositorio: https://github.com/Juanseom/project-ia-architect (tags fase-0, iter-1 a iter-4: un tag por iteración).
- Stack: React 19 + TypeScript 7 strict + Vite 8, Tailwind CSS v4, Supabase (Postgres 17, RLS, Realtime, sesión anónima), Vitest 5 + Testing Library, Playwright y oxlint.
- Método: Desarrollo Guiado por Especificaciones (SDD) con prompts ROL / CONTEXTO / TAREA / RESTRICCIONES / FORMATO.

2. ESPECIFICACIÓN Y ARQUITECTURA
- docs/SPEC.md define 6 requisitos funcionales, 6 no funcionales y 16 criterios de aceptación verificables (CA-01 a CA-16). Al cierre, cada criterio tiene su evidencia.
- Se reutilizó la arquitectura por capas del lab EcoTech: pages -> components (UI); pages -> hooks -> services -> services/supabase. EmissionsTracker está en pages/ como contenedor y es el único que usa useEmissions. Los componentes solo reciben props.
- Las capas no dependen de la disciplina del equipo: la regla no-restricted-imports de oxlint hace fallar "npm run lint" si un componente importa hooks o services, o si algo fuera de services/ importa @supabase/supabase-js.
- EmissionsService es una interfaz con dos implementaciones (Supabase y mock en memoria), elegidas con VITE_USE_MOCK. Así se hace la demo sin base de datos y se prueba el hook sin red.
- Base de datos: ENUM de categorías, CHECK de fuente (2-100) y de co2_kg > 0, y RLS "to authenticated" con (select auth.uid()). Se hace revoke all y luego grant insert solo sobre (fuente, categoría, co2_kg), para que el cliente no pueda fijar owner_id. Sesión anónima para la demo (en producción requiere CAPTCHA o login real).

3. BITÁCORA DE PROMPTS (completa en docs/BITACORA_PROMPTS.md y docs/prompts/ del repo)
Cada prompt nació de los problemas reales de la iteración anterior. Ninguno se inventó para la bitácora.

FASE 0 - SETUP. Se instaló Tailwind v4 y el Supabase CLI y se agregaron las reglas de capas al lint.
- Problema real: la regla de lint encontró que el context/ heredado importaba el tipo Session directamente del SDK de Supabase.
- Corrección: el tipo pasó a exponerse desde services/; en la iteración 2 se tradujo a un tipo de dominio (AuthUser).

PROMPT 1 - ESTRUCTURA
- Rol: arquitecto frontend.
- Tarea: arquitectura de componentes desde la SPEC. Tipos de dominio, 7 componentes presentacionales con props tipadas y exportadas (EmissionCard, EmissionList, EmissionForm, EmissionsSummary y los estados de carga, vacío y error), más EmissionsTracker con datos de ejemplo.
- Restricción clave: dejar a propósito para la iteración 3 la validación, la accesibilidad avanzada y la memoización, para que el refinamiento fuera visible.
- Produjo la estructura con tsc y lint en verde a la primera.
- Problema real: en Chrome la app quedaba en blanco ("Uncaught Error: Falta la variable de entorno VITE_SUPABASE_URL"), aunque tsc y build pasaban. env.ts fallaba al importarse.
- Otros hallazgos: la página calculaba totales en cada render, aceptaba CO2 negativo y usaba un cast "as" en el select.

PROMPT 2 - LÓGICA
- Rol: ingeniero Supabase + React.
- Tarea: migración con RLS y grants por columna, servicio Supabase/mock, traducción de errores de Postgres (42501, 23514, 22P02, red) a español, sesión anónima y useEmissions con loading, error, isSubmitting, addEmission y reload, sin setState tras desmontar.
- Problema real 1: al generar los tipos con "supabase gen types", TypeScript detectó que los tipos escritos a mano del lab anterior mentían ("Type 'string' is not assignable to type 'ProductCategory'"). Se corrigió con un type guard.
- Problema real 2: oxlint marcó "set-state-in-effect" en el hook. Se rediseñó para derivar loading de una clave de carga en lugar de setLoading(true) dentro del efecto.
- Problema real 3: StrictMode creaba 2 usuarios anónimos por carga. Se midió en auth.users quitando la deduplicación: 2 sin ella y 1 con ella.
- Evolución: la página dejó de tener estado de datos y solo compone lo que entrega useEmissions. Sin .env la app muestra el error en la UI y no una pantalla en blanco.

PROMPT 3 - REFINAMIENTO
- Rol: revisor de accesibilidad, TypeScript y rendimiento.
- Restricciones: noUncheckedIndexedAccess y exactOptionalPropertyTypes, estado como unión discriminada (loading | error | empty | success), validación por campo con las mismas reglas que el CHECK, aria-invalid y aria-describedby, foco al primer campo inválido, aria-live, role="alert", contraste AA, y useMemo/React.memo justificados con medición.
- Medición: antes, escribir 10 caracteres re-renderizaba 200 tarjetas; después, 0 (queda afirmado en un test).
- Lo que salió bien a la primera: los flags estrictos dieron 0 errores.
- Problemas reales: jsx-a11y pidió <output> en vez de role="status"; la regla de capas atrapó un test mal ubicado en components/; con 3 columnas el valor "1.250,50 kg CO2e" se partía en dos líneas; y el primer borrador deshabilitaba el formulario al enviar, lo que hacía perder el foco (se cambió a aria-disabled en el botón).

PROMPT 4 - TIEMPO REAL Y CIERRE
- Tarea: migración que publica la tabla en supabase_realtime, subscribeToInserts en el servicio (con removeChannel al limpiar), validación del payload sin casts, deduplicación por id entre la inserción propia y su eco, indicador "En vivo", script de evidencias, README final y estado de los criterios.
- Problema real: el script de Playwright detectó que el primer click en "Agregar medición" se perdía. El error que aparecía al salir del campo desplazaba el botón entre mousedown y mouseup. jsdom no calcula layout, por eso los 44 tests pasaban.
- Corrección: los errores se muestran al intentar enviar y desde ahí se actualizan en vivo. Se agregaron 2 tests de regresión.

4. EJECUCIÓN TÉCNICA
- Archivos clave: src/pages/EmissionsTracker.tsx, src/hooks/useEmissions.ts, src/hooks/useEmissionForm.ts, src/services/emissions.service.ts (+ emissions.mock.ts), src/services/supabase/client.ts (singleton perezoso) y supabase/migrations/.
- useEmissions:
  - Carga con descarte de respuestas obsoletas (StrictMode y reload rápido) y loading derivado.
  - addEmission con guarda contra doble envío y submitError separado del error de carga.
  - Resumen memoizado, null mientras no hay datos (nunca muestra ceros falsos).
  - Suscripción Realtime por usuario con limpieza al desmontar.
- RLS verificado en psql con supabase/tests/rls_emisiones.sql:
  - A inserta y ve 2 filas; B ve 0.
  - Si B fija el owner_id de A: "permission denied" por el grant de columna, y aunque se conceda el grant, "violates row-level security policy".
  - anon no puede leer ni insertar.
  - CO2 = 0 y una fuente de 1 carácter violan sus CHECK.
- Realtime (npm run evidence): la pestaña 1 recibe la inserción de la pestaña 2 en unos 313 ms, sin duplicados. Otro usuario ve 0 tarjetas (RLS también aplica en Realtime).
- Verificación final: tsc exit 0, oxlint exit 0, 59/59 tests (hook con servicio mock, validación, formulario accesible, renders y Realtime), build OK, "supabase db lint": No schema errors found, y ninguna clave en git.

5. UI Y USABILIDAD
- Tailwind v4 con tokens de marca en @theme.
- Tarjetas con badge de color por categoría, siempre con texto (no solo color).
- Resumen tipo dashboard: total y desglose por categoría. Formato es-CO: "4.980,75 kg CO2e".
- Responsive medido con emulación de dispositivo: 1 columna en móvil (360 y 390 px), 2 en tablet (768) y 3 en escritorio, sin scroll horizontal.
- Feedback en cada estado:
  - Carga: skeletons con aria-busy.
  - Vacío: llamada a la acción que lleva al formulario.
  - Error de carga: mensaje entendible con botón Reintentar.
  - Errores de campo: aparecen junto a cada campo.
  - Envío: botón con "Guardando..." y spinner.
  - Éxito: mensaje anunciado por aria-live.
  - Tiempo real: indicador "En vivo".
- Accesibilidad: navegación por teclado, foco visible, objetivos táctiles de 44 px, animaciones que respetan prefers-reduced-motion y contraste AA calculado en 14 pares de color (mínimo 5.22:1).

6. EVIDENCIAS
Las genera "npm run evidence" en docs/evidencias/final/:
- 01 estado vacío
- 03 error de validación con foco
- 04 escritorio con "En vivo"
- 05 inserción en tiempo real
- 07 skeleton de carga
- 08 móvil iPhone 13
- 09 tablet iPad Mini
- capture-log.txt con el resultado de cada verificación

Además: capturas por iteración (antes y después), docs/evidencias/iter-2/rls-psql.txt (prueba RLS) e iter-3/contraste-wcag.txt.

7. CIERRE
- Prompteo: 4 prompts encadenados; cada uno corrige problemas reales y medidos de la iteración anterior.
- Ejecución técnica: código modular por capas verificadas con lint, TypeScript estricto, hooks que separan la lógica de la UI y estados asíncronos probados, incluido Realtime contra Supabase real.
- UI y usabilidad: interfaz profesional, responsive y accesible, con feedback claro en cada estado.
