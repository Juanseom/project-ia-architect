# tooling/

Plugins de Vite propios (se ejecutan en Node durante el build, no van al navegador).

- `vite-security.ts`: `noClientSecrets()` falla el build si una `VITE_*` o un archivo generado contiene una clave
  secreta de Supabase; `contentSecurityPolicy(url)` inyecta la CSP de producción.
- `vite-performance.ts`: `preloadLazyChunks(names)` agrega `modulepreload` a chunks perezosos (hoy sin uso: medido, empeoraba el LCP).
- `secrets.ts`: detección de claves secretas (`sb_secret_…` o JWT con `role=service_role`).
