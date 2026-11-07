# scripts/

Utilidades de verificación (Node, fuera del bundle).

- `ecoflow-evidence.mjs [url] [dir]`: E2E de EcoFlow con 3 usuarios reales + capturas (`docs/evidencias/ecoflow/`).
- `bundle-report.mjs <json>`: resume un reporte raw-data de rollup-plugin-visualizer por paquete y por chunk.
- `measure-performance.mjs <dist-antes> <dist-despues> [corridas]`: FCP, LCP y tiempo a datos con 3G rápida + CPU 4×.
- `contrast.mjs`: calcula el contraste WCAG 2.1 de los pares de color de la UI → `docs/evidencias/iter-3/contraste-wcag.txt`.
- `capture-evidence.mjs` (`npm run evidence`): con Supabase local y `npm run dev` arriba, genera `docs/evidencias/final/*.png`
  y verifica validación, tiempo real entre dos pestañas, deduplicación, aislamiento RLS en Realtime y responsive.
