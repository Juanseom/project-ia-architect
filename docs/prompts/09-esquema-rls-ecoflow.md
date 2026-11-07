# Prompt 09 — Esquema, RLS y RPCs de EcoFlow

```text
# ROL
Arquitecto de bases de datos PostgreSQL 17 / Supabase. Cumple el prompt maestro 08 sin contradecirlo.

# CONTEXTO
Prompt maestro: docs/prompts/08-prompt-maestro-ecoflow.md (roles derivados, estados y transiciones, criterios EF-01..EF-07).
Patrones obligatorios del repo: migraciones nuevas (no editar aplicadas), revoke all + grants por columna,
RLS `to authenticated` con (select auth.uid()), security definer solo con set search_path = '' y validación explícita
del actor, límites de abuso en la BD (SQLSTATE PT429 → HTTP 429), vistas security_invoker para agregados.

# TAREA
1. Migración ecoflow_esquema: ENUMs, tablas instaladores / materiales / proyectos / proyecto_materiales.
2. Integridad multi-tenant con FKs COMPUESTAS (id, coordinador_id) para que un proyecto no pueda referenciar
   instaladores ni materiales de otro coordinador; ON DELETE SET NULL (instalador_id) sin borrar coordinador_id.
3. Políticas RLS por tabla y operación, justificando cada una.
4. RPCs: cambiar_estado_proyecto (definer, valida actor + transición + "sin instalador"), vincular_instalador
   (definer, un solo uso, mismo error para inexistente/usado), crear_proyecto (INVOKER, atómica con materiales).
5. Vista proyectos_resumen (security_invoker) y trigger de límite de creación.
6. Script SQL de verificación con 4 actores (coordinador, instalador asignado, instalador no asignado, otro coordinador).

# RESTRICCIONES
- estado, coordinador_id, user_id y codigo_invitacion NUNCA los fija el cliente.
- Ningún mensaje de error debe permitir enumerar datos ajenos (códigos o proyectos).
- db:lint limpio; db reset debe reaplicar toda la cadena de migraciones.

# FORMATO DE SALIDA
SQL completo + tabla "política → justificación" + salida del script de verificación.
```
