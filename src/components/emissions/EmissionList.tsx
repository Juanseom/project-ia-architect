import { memo } from 'react'
import type { Emission } from '../../types'
import { EmissionCard } from './EmissionCard'

export interface EmissionListProps {
  emissions: readonly Emission[]
  /** Total de mediciones del usuario; si es mayor que las mostradas se indica que la lista es parcial. */
  totalCount?: number | undefined
}

/** Grid responsive de tarjetas: 1 columna en móvil, 2 en tablet, 3 en escritorio. */
export const EmissionList = memo(function EmissionList({ emissions, totalCount }: EmissionListProps) {
  const partial = totalCount !== undefined && totalCount > emissions.length
  return (
    <>
      {partial && (
        <p className="mb-3 text-sm text-ink-500">
          Mostrando las {emissions.length} mediciones más recientes de {totalCount.toLocaleString('es-CO')}. El resumen incluye todas.
        </p>
      )}
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {emissions.map((emission) => (
        <li key={emission.id}>
          <EmissionCard emission={emission} />
        </li>
      ))}
    </ul>
    </>
  )
})
