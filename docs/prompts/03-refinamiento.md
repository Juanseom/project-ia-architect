# Prompt 03 — Refinamiento

```text
# ROL
Actúa como revisor senior de frontend especializado en accesibilidad (WCAG 2.1 AA), TypeScript estricto y
rendimiento de React 19. Tu trabajo es endurecer código que ya funciona sin cambiar su arquitectura.

# CONTEXTO
- EcoTrack ya carga e inserta mediciones contra Supabase (RLS verificado) o contra el mock (Iteración 2).
- Hallazgos reales pendientes (docs/BITACORA_PROMPTS.md, iteraciones 1 y 2):
  (a) Sin validación en el cliente: el único freno es el CHECK de la BD, que responde un mensaje genérico
      ("Algún dato no cumple las reglas…") sin decir qué campo falla, y cuesta un viaje de red.
  (b) Cast `e.target.value as EmissionFormValues['category']` en el <select>.
  (c) El resumen muestra "0.00 kg CO₂e" mientras carga o cuando hay error (dato falso).
  (d) El formulario sigue habilitado sin sesión o con la carga fallida.
  (e) summarizeEmissions se recalcula en cada render, incluido cada tecleo; todas las tarjetas se re-renderizan al escribir.
  (f) Accesibilidad: el resumen no tiene encabezado, el error no usa role="alert", la carga no tiene aria-busy,
      no hay confirmación de éxito anunciada, los campos no marcan aria-invalid.
  (g) Números sin separador de miles ("4980.75 kg CO₂e").
  (h) No hay pruebas del hook ni del formulario.

# TAREA
1. TypeScript: activar noUncheckedIndexedAccess (y exactOptionalPropertyTypes si no rompe el código generado);
   cero `any` y cero casts en src/ (salvo en tests); type guard isEmissionCategory para el <select>.
   Modelar el estado de la lista que consume la página como unión discriminada
   (status 'loading' | 'error' | 'empty' | 'success').
2. Validación: función pura validateEmission(values) → { ok: true, value: NewEmission } | { ok: false, errors }
   con las mismas reglas que la BD (fuente 2–100 tras trim, categoría del ENUM, CO₂ > 0, ≤ 2 decimales,
   ≤ 9.999.999.999,99). Hook useEmissionForm que gestiona valores, errores por campo, "touched" y envío.
3. Accesibilidad del formulario: label asociado, aria-invalid + aria-describedby al mensaje de cada campo,
   aria-required, foco al primer campo inválido al enviar, mensaje de éxito en región aria-live="polite",
   error de envío con role="alert", botón deshabilitado + aria-busy mientras envía.
4. Accesibilidad del dashboard: <section aria-labelledby> con encabezados, skeleton con aria-busy y texto para
   lectores de pantalla, error con role="alert", foco visible (focus-visible) en todos los controles,
   contraste AA verificado con los tokens.
5. Re-renders: useMemo para el resumen y la agrupación por categoría, useCallback en handlers, React.memo en
   EmissionCard (y EmissionList), demostrando con React Profiler o contador de renders en un test que
   escribir en el formulario no re-renderiza las tarjetas.
6. UI: skeleton loaders (tarjetas y resumen), el resumen no muestra ceros falsos, estado vacío con
   llamada a la acción que lleva el foco al formulario, formato es-CO con separador de miles, grid
   1/2/3 columnas, formulario deshabilitado si no hay sesión.
7. Tests con Vitest + Testing Library: useEmissions con el servicio mock (carga, error de carga + reload,
   inserción, error de inserción), validateEmission y EmissionForm (errores, aria-invalid, foco, aria-live).

# RESTRICCIONES
- No cambiar la arquitectura por capas ni la API pública de los servicios. oxlint debe seguir en exit 0.
- Sin librerías nuevas (ni de formularios ni de UI). Solo Tailwind.
- No optimizar a ciegas: cada useMemo/memo debe justificarse con un caso concreto del hallazgo (e).

# FORMATO DE SALIDA
1. Lista de cambios agrupada por restricción (TypeScript, accesibilidad, re-renders, UI, tests).
2. Archivos modificados completos.
3. Evidencia: salida de typecheck (incluido el efecto de noUncheckedIndexedAccess), lint, tests y build,
   y la medición de renders antes/después.
```
