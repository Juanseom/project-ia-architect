import type { Emission } from '../../types'
import { EmissionCard } from './EmissionCard'

export interface EmissionListProps {
  emissions: Emission[]
}

/** Grid de tarjetas. Asume una lista no vacía: el estado vacío lo decide el contenedor. */
export function EmissionList({ emissions }: EmissionListProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {emissions.map((emission) => (
        <li key={emission.id}>
          <EmissionCard emission={emission} />
        </li>
      ))}
    </ul>
  )
}
