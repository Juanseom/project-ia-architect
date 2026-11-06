import type { Emission } from '../../types'
import { formatCategory, formatKgCO2, formatMeasuredAt } from '../../utils'
import { Card } from '../ui'

export interface EmissionCardProps {
  emission: Emission
}

/** Una medición: fuente, categoría y CO₂ producido. */
export function EmissionCard({ emission }: EmissionCardProps) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{formatCategory(emission.category)}</p>
      <h3 className="mt-1 text-lg font-semibold text-ink-900">{emission.source}</h3>
      <p className="mt-3 text-2xl font-bold text-ink-900">{formatKgCO2(emission.co2Kg)}</p>
      <p className="mt-1 text-xs text-ink-500">{formatMeasuredAt(emission.measuredAt)}</p>
    </Card>
  )
}
