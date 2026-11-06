import { memo } from 'react'
import type { Emission } from '../../types'
import { CO2_UNIT, formatCategory, formatKg, formatMeasuredAt } from '../../utils'
import { Card } from '../ui'
import { CATEGORY_BADGE_CLASSES } from './categoryStyles'

export interface EmissionCardProps {
  emission: Emission
}

/**
 * Una medición: fuente, categoría y CO₂ producido.
 * memo: al escribir en el formulario la página se re-renderiza; la tarjeta solo debe hacerlo si cambia su emisión.
 */
export const EmissionCard = memo(function EmissionCard({ emission }: EmissionCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_BADGE_CLASSES[emission.category]}`}>
        {formatCategory(emission.category)}
      </span>
      <h3 className="mt-2 text-base font-semibold break-words text-ink-900">{emission.source}</h3>
      <p className="mt-auto pt-3 text-ink-900">
        <span className="text-2xl font-bold tabular-nums">{formatKg(emission.co2Kg)}</span>{' '}
        <span className="text-sm font-medium whitespace-nowrap text-ink-500">{CO2_UNIT}</span>
      </p>
      <p className="mt-1 text-xs text-ink-500">
        <time dateTime={emission.measuredAt}>{formatMeasuredAt(emission.measuredAt)}</time>
      </p>
    </Card>
  )
})
