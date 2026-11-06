# Prompt 06 — Optimización del bundle (Lab 5)

## 06a · Prompt inicial

```text
# ROL
Actúa como ingeniero de rendimiento web (Core Web Vitals) experto en Vite 8 / rolldown y React 19.

# CONTEXTO
- Reporte real de rollup-plugin-visualizer (docs/evidencias/lab5/bundle-antes.txt): UN solo chunk de 456 kB
  (131 kB gzip). Por paquete: react-dom 54,6 %, @supabase/* ~38 % (auth-js 17,7 %, realtime 5,6 %, storage 4,3 %,
  phoenix 4,1 %, postgrest 3,2 %, functions 0,6 %, iceberg-js 0,8 %), código propio ~5 %.
- El servicio mock y sus datos semilla aparecen en el bundle de producción aunque VITE_USE_MOCK=false.
- La app no usa moment/lodash/date-fns: fechas y números ya usan Intl nativo.
- Queja del negocio: "la página tarda en aparecer". Sin router todavía (una sola vista + módulo inventario sin ruta).

# TAREA
1. Estrategia de code splitting: qué sacar de la ruta crítica, con qué técnica (import() dinámico, React.lazy +
   Suspense por ruta, chunks de vendor) y por qué.
2. Evaluar reemplazos de librerías por alternativas más ligeras con números (no genéricos).
3. Implementarlo y MEDIR antes/después con red y CPU limitadas (FCP, LCP, tiempo hasta datos), no solo kB.

# RESTRICCIONES
- Sin librerías nuevas en runtime (no react-router si se puede evitar). Mantener capas, tests y lint en verde.
- Cada optimización debe justificarse con la medición; si una no mejora, se revierte.

# FORMATO DE SALIDA
Tabla de chunks antes/después, tabla de métricas (mediana de ≥7 corridas) y explicación de vite.config.ts y rutas.
```

## 06b · Re-prompt tras la primera medición (diálogo iterativo)

La primera implementación (Supabase perezoso + todas las rutas con `React.lazy`) mejoró el FCP un 25,6 % pero
**el LCP empeoró un 1,9 %**. Se volvió a preguntar con los datos:

```text
Medición real (3G rápida + CPU 4×, mediana de 7): FCP 1080 → 804 ms, LCP 1080 → 1100 ms, datos 1873 → 1590 ms.
El chunk de la página y vendor-supabase se piden recién a los ~770 ms (cascada: el JS principal los pide al
ejecutarse). ¿Cómo eliminar la cascada sin volver a meter Supabase en la ruta crítica? Propón variantes medibles
y el criterio para elegir entre ellas.
```

Respuesta → 3 variantes, todas medidas (detalle en docs/AUDITORIA_LAB5.md §3):
1. `modulepreload` de página + Supabase → LCP **+20,7 %** (compite por ancho de banda con React). Descartada.
2. `modulepreload` solo de la página → LCP +3,3 %. Insuficiente.
3. Ruta de aterrizaje **eager** y `React.lazy` solo en rutas secundarias → FCP y LCP **−23 %**. Elegida.
