import type { ProjectStatus } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../utils'
import { STATUS_BADGE } from './statusStyles'

export interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}
