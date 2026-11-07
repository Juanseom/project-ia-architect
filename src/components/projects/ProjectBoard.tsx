import { memo } from 'react'
import { PROJECT_STATUSES, type Project, type ProjectStatus } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../utils'
import { ProjectCard } from './ProjectCard'

export interface ProjectBoardProps {
  board: Record<ProjectStatus, readonly Project[]>
  pendingIds: ReadonlySet<string>
  onChangeStatus: (projectId: string, status: ProjectStatus) => void
  /** Estados ocultos por el filtro activo. */
  visibleStatuses: readonly ProjectStatus[]
}

/** Tablero por estado: una columna por etapa (1 columna en móvil, 3 en escritorio). */
export const ProjectBoard = memo(function ProjectBoard({ board, pendingIds, onChangeStatus, visibleStatuses }: ProjectBoardProps) {
  const statuses = PROJECT_STATUSES.filter((s) => visibleStatuses.includes(s))
  return (
    <div className={`grid gap-6 ${statuses.length > 1 ? 'xl:grid-cols-3' : ''}`}>
      {statuses.map((status) => (
        <section key={status} aria-labelledby={`col-${status}`} className="min-w-0">
          <h3 id={`col-${status}`} className="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-ink-700">
            {PROJECT_STATUS_LABELS[status]}
            <span className="rounded-full bg-ink-500/10 px-2 py-0.5 text-xs tabular-nums">{board[status].length}</span>
          </h3>
          {board[status].length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-500/30 p-4 text-center text-sm text-ink-500">Sin proyectos en esta etapa.</p>
          ) : (
            <ul className="space-y-4">
              {board[status].map((project) => (
                <li key={project.id}>
                  <ProjectCard project={project} pending={pendingIds.has(project.id)} onChangeStatus={onChangeStatus} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
})
