# Prompt 05 — Auditoría de seguridad (Lab 5)

> Versión avanzada del prompt sugerido por el laboratorio ("Actúa como un experto en ciberseguridad…").
> Se le agregó modelo de amenazas, alcance exacto, exigencia de prueba de concepto (PoC) y formato verificable,
> porque un prompt genérico produce listas teóricas ("valida inputs", "usa HTTPS") sin evidencia.

```text
# ROL
Actúa como auditor senior de seguridad de aplicaciones (OWASP ASVS 4.0 nivel 2, OWASP Top 10) especializado en
Supabase/PostgreSQL (RLS, privilegios de roles anon/authenticated, PostgREST, Realtime) y en React (XSS, manejo de
secretos en bundles de Vite).

# CONTEXTO
- App: EcoTrack (equivalente al "EcoMart" del enunciado): React 19 + Vite 8 + Supabase local (Postgres 17).
- Modelo de amenazas: la anon key y la URL del proyecto son PÚBLICAS (viajan en el bundle). Cualquiera puede llamar
  a PostgREST/Auth/Realtime directamente con curl, sin pasar por la UI. La app crea sesiones anónimas
  (signInAnonymously) sin CAPTCHA. La única barrera real es la base de datos.
- Código a revisar (pegado a continuación):
  1. Formulario: src/components/emissions/EmissionForm.tsx + src/hooks/useEmissionForm.ts + src/utils/validation.ts
  2. Acceso a datos: src/services/emissions.service.ts, auth.service.ts, inventory.service.ts, config/env.ts
  3. SQL: supabase/migrations/0001_create_products.sql (heredada de EcoTech), *_crear_emisiones.sql,
     *_habilitar_realtime_emisiones.sql
  4. supabase/config.toml (auth, rate limits, api.max_rows)

# TAREA
1. Busca vulnerabilidades de: XSS, inyección (SQL/PostgREST filters), fallos de autenticación/autorización
   (RLS, privilegios por defecto de Supabase, suplantación de owner_id), exposición de datos entre usuarios
   (incluidos oráculos por mensajes de error o constraints), abuso/denegación de servicio con sesiones anónimas,
   y exposición de secretos en el cliente.
2. Para cada hallazgo entrega una PoC reproducible (curl contra la API REST o SQL en psql con
   `set role` + `request.jwt.claims`) y la salida esperada que demuestra el problema.
3. Clasifica por severidad (Crítica/Alta/Media/Baja) con justificación de impacto × probabilidad.
4. Propón la corrección concreta: migración NUEVA (las aplicadas no se editan), cambio de código o configuración.
5. Indica también lo que revisaste y NO es vulnerable, con la razón (para no "inventar" hallazgos).

# RESTRICCIONES
- Nada de recomendaciones genéricas sin anclaje a una línea de código o a una PoC.
- No propongas service_role en el cliente ni desactivar RLS "para probar".
- Las correcciones deben mantener verde: typecheck, lint (reglas de capas), tests y db:lint.

# FORMATO DE SALIDA
1. Tabla: ID | Severidad | Componente | Vector | Impacto.
2. Por hallazgo: descripción, PoC (comando + salida), corrección propuesta (código/SQL).
3. Lista de controles verificados sin hallazgo.
4. Top 3 a corregir antes del lanzamiento, en orden.
```
