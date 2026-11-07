# Prompt 08 — Prompt maestro / Documento de Especificación Técnica: EcoFlow

> Contrato que guía a la IA en todo el proyecto final. Se escribe ANTES del código; cada prompt posterior
> (09 esquema, 10 frontend) lo cita y la IA no puede contradecirlo sin justificarlo.

```text
# ROL
Actúa como Arquitecto de Software senior (PostgreSQL/Supabase + React 19 + TypeScript estricto) que diseña
sistemas multiusuario seguros para equipos que antes produjeron código desordenado y bases mal estructuradas.

# CONTEXTO
- Cliente: EcoFlow, startup de tecnología limpia. Necesita una app interna para gestionar proyectos de
  instalación de paneles solares.
- Base existente (no reinventar): monorepo React 19 + Vite 8 + Supabase con arquitectura por capas verificada
  por lint (pages → components; pages → hooks/context → services → services/supabase), sesión de Supabase Auth
  (anónima en la demo), router propio con React.lazy, guards de seguridad en build, tests en modo mock.
  EcoFlow entra como DOMINIO NUEVO (regla de escalabilidad): types + service + hooks + components + pages + migración.
- Lecciones previas obligatorias: nunca autorizar con datos que controla el cliente (rol desde metadata = escalada);
  revoke all + grants por columna; RLS `to authenticated` con (select auth.uid()); límites de abuso en la BD.

# MODELO DE NEGOCIO
Roles (no son una columna editable, se DERIVAN de los datos):
- Coordinador: cualquier usuario autenticado es coordinador de SU espacio. Crea instaladores, materiales y
  proyectos; asigna un instalador a cada proyecto; ve y edita todo lo de su espacio.
- Instalador: un usuario se convierte en instalador de un coordinador SOLO canjeando un código de invitación
  de un solo uso generado por la BD. Ve únicamente los proyectos que tiene asignados (y sus materiales) y
  solo puede avanzar su estado. No ve proyectos de otros instaladores ni de otros coordinadores.
Estados del proyecto: pendiente → en_progreso → completado. Transiciones válidas:
  pendiente→en_progreso, en_progreso→completado, en_progreso→pendiente (pausa), completado→en_progreso (reapertura,
  solo coordinador). Cualquier otra se rechaza en la BD.

# ESQUEMA (Postgres 17, schema public)
- instaladores(id uuid pk, coordinador_id uuid fk auth.users, user_id uuid unique null fk auth.users,
  nombre 2..80, especialidad enum, codigo_invitacion text unique generado por la BD, vinculado_en, created_at)
- materiales(id uuid pk, coordinador_id fk auth.users, nombre 2..80, unidad enum, costo_unitario numeric(12,2) >= 0,
  unique(coordinador_id, nombre))
- proyectos(id uuid pk, coordinador_id fk auth.users, instalador_id null, nombre 3..120, cliente 2..120,
  ubicacion 2..160, capacidad_kw numeric(8,2) (0, 100000], estado enum default 'pendiente',
  fecha_inicio date, fecha_fin_estimada date >= fecha_inicio, created_at, updated_at)
- proyecto_materiales(proyecto_id, material_id, cantidad numeric(10,2) > 0, pk compuesta)
Integridad multi-tenant en la BD, no en la UI: un proyecto solo puede referenciar instaladores y materiales
del MISMO coordinador (claves foráneas compuestas con coordinador_id). Índices en todas las FKs.

# SEGURIDAD (RLS)
- anon: sin privilegios. authenticated: grants por columna; coordinador_id/user_id/estado/codigo nunca los fija el cliente.
- proyectos SELECT: coordinador dueño OR instalador asignado. INSERT/UPDATE/DELETE: solo coordinador dueño.
- Cambio de estado: solo vía RPC cambiar_estado_proyecto (valida actor y transición).
- Vinculación de instalador: solo vía RPC vincular_instalador(codigo) (security definer, search_path ''),
  un solo uso, no auto-vincularse a su propio espacio.
- Creación atómica de proyecto + materiales: RPC security INVOKER (respeta RLS) en una transacción.
- Resumen del dashboard agregado en la BD (vista security_invoker): conteo por estado y kW.

# FRONTEND
- Ruta /proyectos (lazy): resumen (Pendiente / En progreso / Completado + kW), tablero por estado, filtro,
  acciones de estado según rol, formulario de creación con validación previa (mismas reglas que los CHECK) y
  materiales dinámicos. Ruta /equipo (lazy): instaladores con su código, catálogo de materiales, y "unirme
  como instalador" con un código.
- TypeScript estricto con tipos generados por `supabase gen types` y mapeados a dominio en services.
- Estados de carga/vacío/error/éxito accesibles; Tailwind (sin librerías nuevas de UI).

# CRITERIOS DE ACEPTACIÓN (verificables)
EF-01 RLS: instalador asignado ve 1 proyecto; instalador no asignado 0; otro coordinador 0; anon sin privilegios.
EF-02 Un proyecto no puede apuntar a un instalador/material de otro coordinador (error de FK).
EF-03 Transición inválida (pendiente→completado) rechazada por la BD; instalador no puede reabrir.
EF-04 Código de invitación: un solo uso, inválido → error claro, propio → rechazado.
EF-05 Formulario: no envía datos inválidos; errores por campo accesibles.
EF-06 Dashboard: conteos por estado y kW correctos desde la BD.
EF-07 typecheck, lint, tests, build, db:lint verdes; sin regresiones de EcoTrack.

# FORMATO DE SALIDA (para cada prompt derivado)
Archivos completos, explicación de decisiones, y evidencia de verificación (comando + salida).
```
