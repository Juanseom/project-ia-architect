# components/projects/

Componentes **presentacionales** del dominio EcoFlow (proyectos de instalación solar). Solo props + JSX.

| Componente | Responsabilidad |
|---|---|
| `ProjectsSummaryPanel` | Conteo y kW por estado + capacidad total (datos agregados en la BD). |
| `StatusFilter` | Filtro Todos / Pendiente / En progreso / Completado (`aria-pressed`). |
| `ProjectBoard` → `ProjectCard` | Tablero por estado; acciones de estado según rol (espejo de la RPC). `memo`. |
| `ProjectForm` | Formulario controlado y accesible con materiales dinámicos. |
| `ProjectStatusBadge`, `ProjectsLoading` | Insignia de estado y skeleton. |

Las transiciones visibles salen de `allowedTransitions()` (utils); la autoridad es la RPC `cambiar_estado_proyecto`.
