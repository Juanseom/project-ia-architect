import type { Emission, EmissionCategory, EmissionsTotals } from '../types'

export type { EmissionsTotals } from '../types'

type Cents = Record<EmissionCategory, number>

// Se suma en centésimas enteras para evitar errores de coma flotante (0.1 + 0.2 = 0.30000000000000004).
const toCents = (kg: number) => Math.round(kg * 100)

const fromCents = (cents: Cents, count: number): EmissionsTotals => ({
  totalKg: (cents.transporte + cents.energia + cents.residuos) / 100,
  byCategory: { transporte: cents.transporte / 100, energia: cents.energia / 100, residuos: cents.residuos / 100 },
  count,
})

/** Total, desglose y conteo a partir de una lista (mock y tests; en Supabase lo calcula la vista emisiones_resumen). */
export function summarizeEmissions(emissions: readonly Emission[]): EmissionsTotals {
  const cents: Cents = { transporte: 0, energia: 0, residuos: 0 }
  for (const emission of emissions) cents[emission.category] += toCents(emission.co2Kg)
  return fromCents(cents, emissions.length)
}

/** Suma una medición nueva (propia o recibida por Realtime) a un resumen existente, sin recalcular todo. */
export function addToTotals(totals: EmissionsTotals, emission: Emission): EmissionsTotals {
  const cents: Cents = {
    transporte: toCents(totals.byCategory.transporte),
    energia: toCents(totals.byCategory.energia),
    residuos: toCents(totals.byCategory.residuos),
  }
  cents[emission.category] += toCents(emission.co2Kg)
  return fromCents(cents, totals.count + 1)
}

/** Construye el resumen desde filas por categoría (vista emisiones_resumen). */
export function totalsFromCategoryRows(rows: readonly { category: EmissionCategory; kg: number; count: number }[]): EmissionsTotals {
  const cents: Cents = { transporte: 0, energia: 0, residuos: 0 }
  let count = 0
  for (const row of rows) {
    cents[row.category] += toCents(row.kg)
    count += row.count
  }
  return fromCents(cents, count)
}
