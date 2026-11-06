import type { Emission, NewEmission } from '../types'
import type { EmissionsService } from './emissions.service'
import { AppError, ERROR_MESSAGES } from './errors'

const hoursAgo = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString()

export const MOCK_SEED: readonly Emission[] = [
  { id: 'mock-1', source: 'Flota de camiones de reparto', category: 'transporte', co2Kg: 1250.5, measuredAt: hoursAgo(2) },
  { id: 'mock-2', source: 'Planta de producción principal', category: 'energia', co2Kg: 3420, measuredAt: hoursAgo(20) },
  { id: 'mock-3', source: 'Residuos orgánicos de cafetería', category: 'residuos', co2Kg: 310.25, measuredAt: hoursAgo(30) },
  { id: 'mock-4', source: 'Vuelos corporativos', category: 'transporte', co2Kg: 2780.75, measuredAt: hoursAgo(52) },
]

export interface MockEmissionsOptions {
  /** Latencia simulada en ms (0 en tests). */
  latencyMs?: number
  seed?: readonly Emission[]
}

/**
 * Servicio en memoria con las mismas reglas que la BD (CHECK de fuente y CO₂),
 * para hacer la demo sin Supabase y probar el hook sin red.
 */
export function createMockEmissionsService({ latencyMs = 600, seed = MOCK_SEED }: MockEmissionsOptions = {}): EmissionsService {
  let rows: Emission[] = [...seed]
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs))

  return {
    async list() {
      await wait()
      return [...rows].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    },

    async create(input: NewEmission) {
      await wait()
      const source = input.source.trim()
      if (source.length < 2 || source.length > 100 || !(input.co2Kg > 0)) {
        throw new AppError('validation', ERROR_MESSAGES.checkViolation)
      }
      const created: Emission = {
        id: crypto.randomUUID(),
        source,
        category: input.category,
        co2Kg: Math.round(input.co2Kg * 100) / 100,
        measuredAt: new Date().toISOString(),
      }
      rows = [created, ...rows]
      return created
    },
  }
}
