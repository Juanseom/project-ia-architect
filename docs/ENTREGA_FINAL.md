PROYECTO FINAL INTEGRADOR: EL ARQUITECTO IA - ECOFLOW
=====================================================

1. DATOS DEL PROYECTO
- Estudiante: Sebastián - Maestría en Informática, Escuela Colombiana de Ingeniería Julio Garavito.
- Producto: EcoFlow, app interna para gestionar proyectos de instalación de paneles solares.
- Stack: React 19 + TypeScript estricto + Vite 8 + Tailwind CSS v4; Supabase (Postgres 17, RLS, RPC).
- Repositorio: https://github.com/Juanseom/project-ia-architect (tag ecoflow). Rutas /proyectos y /equipo.
- Documento de arquitectura: docs/ARQUITECTURA_ECOFLOW.md, con diagrama ER, prompts, estructura y uso de IA.
- EcoFlow entra como dominio nuevo en la arquitectura por capas construida durante el curso (auth, router con React.lazy, guards de seguridad y tests). Es la prueba práctica de que un dominio se agrega sin tocar lo existente.

2. ESPECIFICACIÓN PRIMERO (PROMPT MAESTRO)
- docs/prompts/08-prompt-maestro-ecoflow.md es el Documento de Especificación Técnica. Se escribió antes del código y fija:
  - Roles, estados y transiciones.
  - Esquema y RLS.
  - Criterios verificables EF-01 a EF-07.
- Los prompts 09 (esquema/RLS) y 10 (frontend) lo citan. Una respuesta de la IA que lo contradijera se rechazaba.
- Ninguna salida se aceptó sin evidencia: script SQL con 4 actores, 116 tests y un E2E con 3 usuarios reales.

3. ARQUITECTURA DE DATOS (SUPABASE)
- Tablas: instaladores, materiales, proyectos y proyecto_materiales. Esta última es la N:M con cantidad, en lugar de un arreglo.
- Claves foráneas compuestas: UNIQUE(id, coordinador_id) permite FK (instalador_id, coordinador_id), así un proyecto NO puede usar instaladores ni materiales de otro coordinador. Lo garantiza la BD, no la UI.
- ON DELETE SET NULL (instalador_id) (Postgres 15+): desasigna al instalador sin borrar el dueño.
- ENUMs para estado, especialidad y unidad. CHECK de longitudes, capacidad (0, 100000] kW y fecha_fin >= fecha_inicio. Índices en todas las FKs y en las columnas de las políticas.
- Diagrama ER en docs/evidencias/ecoflow/diagrama-er.png (fuente Mermaid versionada).

4. SEGURIDAD: RLS JUSTIFICADA
- Roles DERIVADOS, nunca una columna editable. En MentorLink aprendimos que asignar el rol desde metadata del cliente permitía escalar privilegios.
  - Coordinador: coordinador_id = auth.uid().
  - Instalador: su user_id se vincula al canjear un código de un solo uso generado por la BD.
- proyectos SELECT: coordinador dueño o instalador asignado (instalador_id in mis fichas). Escritura: solo el coordinador.
- materiales: el instalador ve solo los de sus proyectos. proyecto_materiales hereda la visibilidad del proyecto. anon: sin privilegios.
- Grants por columna: estado, coordinador_id, user_id y codigo_invitacion nunca los fija el cliente.
- RPCs:
  - cambiar_estado_proyecto (SECURITY DEFINER, search_path vacío): valida actor y transición, y exige instalador asignado para iniciar. Usa el mismo error si el proyecto es ajeno o no existe.
  - vincular_instalador: un solo uso, con el mismo mensaje para un código inventado o ya usado (no se pueden enumerar códigos).
  - crear_proyecto (SECURITY INVOKER): atómica con materiales y respetando RLS.
- Vista proyectos_resumen con security_invoker y límite de 30 proyectos por minuto (HTTP 429).
- Verificación SQL (supabase/tests/ecoflow_rls.sql):
  - El instalador asignado ve 1 proyecto; el no asignado y otro coordinador, 0.
  - Usar el instalador o material de otro coordinador viola la FK compuesta (y no deja proyecto a medias).
  - pendiente -> completado: "Transición no permitida".
  - UPDATE directo de estado: permission denied.
  - Código reutilizado: "Código inválido o ya utilizado".

5. DESARROLLO REACT
- Capas verificadas por lint: los componentes solo reciben props y solo services importa Supabase.
  - types/project.ts y utils/projects.ts: validateProject usa las mismas reglas que los CHECK; allowedTransitions es espejo probado de la RPC.
  - services/projects.service.ts: interfaz con implementación Supabase y un mock en memoria (demo y tests).
  - Hooks:
    - useProjects: estado como unión discriminada, tablero agrupado con useMemo, cambio de estado con ids pendientes y creación.
    - useTeam: equipo, catálogo e invitaciones.
    - useProjectForm: errores por campo, materiales dinámicos y foco.
- Dashboard:
  - Tarjetas Pendiente / En progreso / Completado con conteo y kW calculados en la BD, más la capacidad total.
  - Filtro por estado y tablero de 3 columnas.
  - Acciones según rol, con la etiqueta "Asignado a ti" para el instalador.
- Formulario:
  - Valida antes de enviar: longitudes, kW con coma decimal, fechas y materiales repetidos o incompletos.
  - Errores con aria-invalid y aria-describedby, foco al primer campo inválido.
  - Éxito anunciado por aria-live.
- UI: Tailwind sin librerías nuevas, skeletons, estados vacío y error, responsive (390 px sin scroll horizontal) y contraste AA.
- TypeScript: cero any y cero casts para silenciar errores. La creación usa la RPC.

6. USO ESTRATÉGICO DE IA
- Tipos generados: "supabase gen types" produjo tablas, vista, ENUMs y las firmas de las 3 RPC. Con ellos, los embeds de PostgREST por FK compuesta quedan tipados sin casts.
- Hallazgo de control: los tipos describen el esquema, no los privilegios. El Insert de proyectos acepta estado y coordinador_id, que la BD rechaza; por eso la UI usa tipos de dominio más estrechos.
- Problema técnico complejo, resuelto con datos:
  - Síntoma: al agregar EcoFlow, el chunk inicial de TODA la app pasó de 30,98 a 54,14 kB, aunque /proyectos y /equipo eran React.lazy (sus chunks pesaban 2-3 kB: el código no estaba en ellos).
  - Diagnóstico: con rollup-plugin-visualizer, unos 50 kB de EcoFlow (ProjectForm, servicio, hooks) estaban en el chunk de entrada.
  - Causa: la página inicial importa los barrels raíz, que re-exportan EcoFlow. Sin garantía de que no tengan efectos secundarios, el bundler los deja en la entrada.
  - Opciones: imports internos (rompe la regla de barrels) o "sideEffects": ["**/*.css"] en package.json. Se eligió la segunda.
  - Resultado: entrada de 30,18 kB (menos que antes); ProjectsPage 17,2 kB y TeamPage 8,7 kB solo al navegar. Evidencia reproducible en docs/evidencias/ecoflow/bundle-sin|con-sideeffects.txt.
- Otros errores reales detectados y corregidos:
  - Mi primera prueba de FK fallaba por un CHECK y no por la FK.
  - Un test de fechas corría en UTC, donde el bug de "un día menos" no aparece; se fijó TZ=America/Bogota.
  - El resumen se leía "2115 kW" en lectores de pantalla; ahora dice "2 proyectos, 115 kW".
  - Marca y fechas mal en la revisión visual.

7. VERIFICACIÓN Y EVIDENCIAS
- Calidad: tsc y oxlint exit 0; 116/116 tests en 15 archivos; build OK; supabase db lint sin errores; db reset reaplica 6 migraciones.
- Regresiones: las pruebas RLS de EcoTrack y del Lab 5 siguen OK.
- E2E con 3 usuarios reales (scripts/ecoflow-evidence.mjs, log en e2e-log.txt):
  - El coordinador crea equipo, materiales y 3 proyectos.
  - La instaladora se vincula con su código, ve solo su proyecto y lo inicia.
  - Un tercero ve 0 proyectos y no puede reutilizar el código.
  - El coordinador ve el avance y el resumen actualizado.
- Capturas en docs/evidencias/ecoflow/: equipo, validación, dashboard del coordinador, vista del instalador, dashboard actualizado, móvil y tablet.
- Video (3-5 min): guion en ARQUITECTURA_ECOFLOW.md sección 8. Incluye la consola de Supabase (Table Editor, Policies y SQL Editor) y la demo con dos ventanas: coordinador e instalador.

8. CÓMO EJECUTARLO
- Con Supabase local (requiere Docker): npm install, npm run db:start y cp .env.example .env (URL y anon key de npm run db:status); luego npm run dev y abrir http://localhost:5173/proyectos.
- Sin base de datos: VITE_USE_MOCK=true trae datos de ejemplo. El código DEMO-EXTERNO simula ser instalador de otro equipo.

9. CIERRE (RÚBRICA)
- Precisión en la arquitectura: esquema normalizado con FKs compuestas que garantizan integridad multi-tenant, y RLS con roles derivados, justificada política por política y probada con 4 actores.
- Calidad React: código modular por capas, hooks con estados de carga, error, vacío y éxito, y TypeScript íntegro con tipos generados.
- Uso estratégico de IA: especificación como contrato, verificación con evidencia en cada salida y un problema complejo resuelto con medición en lugar de copiar y pegar.
