# Prompt 01 — Estructura

```text
# ROL
Actúa como Arquitecto Frontend senior experto en React 19, TypeScript estricto y Tailwind CSS v4,
que diseña componentes presentacionales para equipos junior siguiendo Desarrollo Guiado por Especificaciones.

# CONTEXTO
- Proyecto: EcoTrack, "Dashboard de Emisiones en Tiempo Real". La especificación está en docs/SPEC.md
  (RF-1 a RF-6, criterios CA-01 a CA-16) y las capas en ARCHITECTURE.md.
- El repo ya tiene la arquitectura por capas de EcoTech: pages → components; pages → hooks → services.
  oxlint prohíbe que components/ importe hooks, services, context o @supabase/supabase-js.
- Modelo de dominio de la SPEC: Emission { id, source, category, co2Kg, measuredAt },
  EmissionCategory = 'transporte' | 'energia' | 'residuos'. Etiquetas visibles con tilde ("Energía").
- En esta iteración todavía NO existe useEmissions ni el servicio: se crean en la Iteración 2.

# TAREA
Diseña e implementa la ESTRUCTURA de componentes del EmissionsTracker:
1. Tipos de dominio en src/types/emission.ts (Emission, EmissionCategory, NewEmission, EMISSION_CATEGORIES)
   y utilidades puras en src/utils/formatters.ts (etiqueta de categoría, formato kg CO₂e, fecha).
2. Componentes presentacionales en src/components/emissions/: EmissionCard, EmissionList,
   EmissionForm, EmissionsSummary, EmissionsLoading, EmissionsEmpty y EmissionsError.
   Átomos genéricos que hagan falta en src/components/ui/.
3. src/pages/EmissionsTracker.tsx como contenedor que compone esos componentes. Como aún no hay hook,
   usa datos de ejemplo locales y un estado `view` para poder ver cada estado de la UI.
4. Montar EmissionsTracker en App.tsx en lugar de InventoryPage (sin borrar el dominio inventario).

# RESTRICCIONES
- Componentes 100% presentacionales: solo props tipadas + JSX. Sin fetch, sin useEffect de datos.
- Cada componente exporta su interfaz de props (ej. EmissionCardProps). TypeScript strict, cero `any`.
- El formulario es controlado por props (values, onChange, onSubmit) para que la lógica viva fuera.
- Los estados de la UI que deben existir: cargando, vacío, error y éxito (listado).
- Tailwind con los tokens de @theme (brand-*, ink-*, surface). Sin librerías de UI nuevas.
- Import solo desde barrels ('../../types', '../ui'). Actualiza index.ts y README de cada carpeta tocada.
- No implementes todavía validación, accesibilidad avanzada ni optimizaciones (son de la Iteración 3):
  JSX semántico básico (section, h2, ul/li, label + input) y nada más.

# FORMATO DE SALIDA
1. Árbol de componentes (estilo `tree`) con una línea de responsabilidad por componente.
2. Tabla: Componente | Props (tipos) | Eventos que emite | Estado de UI que cubre.
3. Diagrama de flujo de datos en texto (pages → components; de dónde saldrán datos y callbacks en la Iteración 2).
4. Los archivos creados/modificados, completos.
5. Resultado de `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.
```
