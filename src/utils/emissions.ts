import type { Emission, EmissionCategory } from '../types'

export interface EmissionsTotals {
  totalKg: number
  byCategory: Record<EmissionCategory, number>
}

/**
 * Total de CO₂ y desglose por categoría. Suma en centésimas enteras para evitar
 * errores de coma flotante (0.1 + 0.2 = 0.30000000000000004).
 * El literal Record<EmissionCategory, number> obliga a TypeScript a exigir todas las categorías.
 */
export function summarizeEmissions(emissions: readonly Emission[]): EmissionsTotals {
  const cents: Record<EmissionCategory, number> = { transporte: 0, energia: 0, residuos: 0 }
  for (const emission of emissions) {
    cents[emission.category] += Math.round(emission.co2Kg * 100)
  }
  return {
    totalKg: (cents.transporte + cents.energia + cents.residuos) / 100,
    byCategory: {
      transporte: cents.transporte / 100,
      energia: cents.energia / 100,
      residuos: cents.residuos / 100,
    },
  }
}
