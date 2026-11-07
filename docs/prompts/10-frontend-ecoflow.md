# Prompt 10 — Frontend de EcoFlow (React)

```text
# ROL
Ingeniero frontend senior (React 19, TypeScript estricto, Tailwind v4, accesibilidad WCAG 2.1 AA).

# CONTEXTO
- Esquema y RPCs listos (prompt 09); tipos generados con `supabase gen types` en services/supabase/database.types.ts.
- Arquitectura del repo (verificada por oxlint): pages → components (solo props); pages → hooks → services.
  Router propio con React.lazy; tests en modo mock forzado; guard de secretos y CSP en build.
- Lecciones previas: errores del formulario solo tras intentar enviar (el error en blur desplazaba el botón),
  estado como unión discriminada, resumen agregado en la BD, mock fuera del bundle de producción.

# TAREA
1. Dominio: types/project.ts y utils/projects.ts (validateProject con las MISMAS reglas que los CHECK,
   allowedTransitions espejo de la RPC, formatos es-CO con fechas date en UTC).
2. services/projects.service.ts: interfaz ProjectsService + implementación Supabase (embeds tipados de PostgREST por
   las FK compuestas, RPCs) + mock en memoria con las mismas reglas; mapeo snake_case → camelCase.
3. Hooks: useProjects (estado, filtro, tablero agrupado con useMemo, cambio de estado con ids pendientes,
   creación), useTeam (equipo, catálogo, vinculación), useProjectForm (validación por campo, materiales dinámicos, foco).
4. Componentes presentacionales (components/projects, components/team) y páginas perezosas /proyectos y /equipo.
5. Tests: validación, transiciones, hooks con el mock, formulario accesible, enrutamiento; E2E con 3 usuarios reales.

# RESTRICCIONES
- Cero `any` y cero casts para silenciar errores; los tipos generados describen el esquema, no los privilegios:
  el servicio expone tipos de dominio más estrechos (p. ej. NewProject no tiene estado ni coordinador).
- Sin librerías nuevas. El chunk inicial no debe crecer: EcoFlow vive en chunks perezosos.

# FORMATO DE SALIDA
Árbol de archivos, decisiones, y evidencia: typecheck, lint, tests, build (tamaños de chunks) y log del E2E.
