import { memo } from 'react'
import type { Project, ProjectStatus } from '../../types'
import { allowedTransitions, formatKw, formatProjectDate, UNIT_LABELS } from '../../utils'
import { Button, Card } from '../ui'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { TRANSITION_LABEL } from './statusStyles'

export interface ProjectCardProps {
  project: Project
  /** Hay un cambio de estado en curso para este proyecto. */
  pending: boolean
  onChangeStatus: (projectId: string, status: ProjectStatus) => void
}

/** Un proyecto. memo: el tablero no re-renderiza todas las tarjetas al escribir en el formulario. */
export const ProjectCard = memo(function ProjectCard({ project, pending, onChangeStatus }: ProjectCardProps) {
  const transitions = allowedTransitions(project.status, project.managedByMe, project.installer !== null)

  return (
    <Card className="flex flex-col gap-3" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <ProjectStatusBadge status={project.status} />
        {!project.managedByMe && (
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">Asignado a ti</span>
        )}
      </div>
      <div>
        <h3 className="text-base font-semibold break-words text-ink-900">{project.name}</h3>
        <p className="text-sm text-ink-700">{project.client} · {project.location}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-500">Capacidad</dt>
        <dd className="font-semibold tabular-nums">{formatKw(project.capacityKw)}</dd>
        <dt className="text-ink-500">Fechas</dt>
        <dd>
          <time dateTime={project.startDate} className="whitespace-nowrap">{formatProjectDate(project.startDate)}</time> –{' '}
          <time dateTime={project.endDate} className="whitespace-nowrap">{formatProjectDate(project.endDate)}</time>
        </dd>
        <dt className="text-ink-500">Instalador</dt>
        <dd>{project.installer?.name ?? <span className="text-amber-800">Sin asignar</span>}</dd>
      </dl>
      {project.materials.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-brand-700">Materiales ({project.materials.length})</summary>
          <ul className="mt-1 space-y-0.5 text-ink-700">
            {project.materials.map((m) => (
              <li key={m.materialId}>
                {m.name}: <span className="tabular-nums">{m.quantity.toLocaleString('es-CO')}</span> {UNIT_LABELS[m.unit]}
              </li>
            ))}
          </ul>
        </details>
      )}
      {transitions.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {transitions.map((next) => (
            <Button
              key={next}
              variant={next === 'pendiente' ? 'secondary' : 'primary'}
              aria-disabled={pending}
              onClick={() => {
                if (!pending) onChangeStatus(project.id, next)
              }}
              className="aria-disabled:cursor-wait aria-disabled:opacity-60"
            >
              {TRANSITION_LABEL[project.status][next]}
              <span className="sr-only"> el proyecto {project.name}</span>
            </Button>
          ))}
        </div>
      )}
      {project.status === 'pendiente' && project.installer === null && project.managedByMe && (
        <p className="text-xs text-ink-500">Asigna un instalador para poder iniciarlo.</p>
      )}
    </Card>
  )
})
