import { memo } from 'react'
import { EMISSION_CATEGORIES } from '../../types'
import { CO2_UNIT, formatCategory, formatKg, type EmissionsTotals } from '../../utils'
import { Skeleton } from '../ui'

export interface EmissionsSummaryProps {
  /** null mientras carga o si la carga falló: se muestra skeleton o "—", nunca ceros falsos. */
  totals: EmissionsTotals | null
  loading: boolean
}

const tile = 'rounded-xl border border-ink-500/15 bg-white p-5'

/** Resumen tipo dashboard: total de CO₂ y desglose por categoría (lista de definiciones). */
export const EmissionsSummary = memo(function EmissionsSummary({ totals, loading }: EmissionsSummaryProps) {
  const value = (kg: number | undefined) => {
    if (loading) return <Skeleton className="mt-1 h-7 w-32 bg-current/20" />
    if (kg === undefined) return <span aria-label="No disponible">—</span>
    return (
      <>
        {formatKg(kg)} <span className="text-sm font-medium opacity-80">{CO2_UNIT}</span>
      </>
    )
  }

  return (
    <section aria-labelledby="summary-title" aria-busy={loading}>
      <h2 id="summary-title" className="sr-only">Resumen de emisiones</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-brand-900 p-5 text-white">
          <dt className="text-sm text-brand-100">Total de CO₂</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{value(totals?.totalKg)}</dd>
        </div>
        {EMISSION_CATEGORIES.map((category) => (
          <div key={category} className={tile}>
            <dt className="text-sm text-ink-500">{formatCategory(category)}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value(totals?.byCategory[category])}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
})
