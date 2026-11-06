import { EMISSION_CATEGORIES, type EmissionCategory } from '../../types'
import { formatCategory, formatKgCO2 } from '../../utils'

export interface EmissionsSummaryProps {
  totalKg: number
  byCategory: Record<EmissionCategory, number>
}

/** Resumen tipo dashboard: total de CO₂ y desglose por categoría. */
export function EmissionsSummary({ totalKg, byCategory }: EmissionsSummaryProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-brand-900 p-5 text-white">
        <p className="text-sm text-brand-100">Total</p>
        <p className="mt-1 text-2xl font-bold">{formatKgCO2(totalKg)}</p>
      </div>
      {EMISSION_CATEGORIES.map((category) => (
        <div key={category} className="rounded-xl border border-ink-500/15 bg-white p-5">
          <p className="text-sm text-ink-500">{formatCategory(category)}</p>
          <p className="mt-1 text-xl font-semibold">{formatKgCO2(byCategory[category])}</p>
        </div>
      ))}
    </section>
  )
}
