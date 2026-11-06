# scripts/

Utilidades de verificación (Node, fuera del bundle).

- `contrast.mjs`: calcula el contraste WCAG 2.1 de los pares de color de la UI → `docs/evidencias/iter-3/contraste-wcag.txt`.
- `capture-evidence.mjs` (`npm run evidence`): con Supabase local y `npm run dev` arriba, genera `docs/evidencias/final/*.png`
  y verifica validación, tiempo real entre dos pestañas, deduplicación, aislamiento RLS en Realtime y responsive.
