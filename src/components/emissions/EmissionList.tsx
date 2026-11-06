import { memo } from 'react'
import type { Emission } from '../../types'
import { EmissionCard } from './EmissionCard'

export interface EmissionListProps {
  emissions: readonly Emission[]
}

/** Grid responsive de tarjetas: 1 columna en móvil, 2 en tablet, 3 en escritorio. */
export const EmissionList = memo(function EmissionList({ emissions }: EmissionListProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {emissions.map((emission) => (
        <li key={emission.id}>
          <EmissionCard emission={emission} />
        </li>
      ))}
    </ul>
  )
})
