import { env } from '../config'
import type { Emission, NewEmission } from '../types'
import { createMockEmissionsService } from './emissions.mock'
import { AppError, toAppError } from './errors'
import { getSupabase, type Database } from './supabase'

/** Contrato del acceso a datos de emisiones. Hooks y tests dependen de esto, no de Supabase. */
export interface EmissionsService {
  /** Mediciones del usuario actual, de la más reciente a la más antigua. */
  list(): Promise<Emission[]>
  /** Inserta una medición; id, fecha y dueño los asigna la base de datos. */
  create(input: NewEmission): Promise<Emission>
}

type EmissionRow = Database['public']['Tables']['emisiones']['Row']

// Columnas que la UI necesita: owner_id nunca sale de la capa de datos.
const COLUMNS = 'id, fuente, categoria, co2_kg, medido_en'

/** Mapper snake_case (BD) → camelCase (dominio). */
const toEmission = (row: Pick<EmissionRow, 'id' | 'fuente' | 'categoria' | 'co2_kg' | 'medido_en'>): Emission => ({
  id: row.id,
  source: row.fuente,
  category: row.categoria,
  co2Kg: Number(row.co2_kg),
  measuredAt: row.medido_en,
})

function client() {
  try {
    return getSupabase()
  } catch (error) {
    throw new AppError('config', error instanceof Error ? error.message : String(error), { cause: error })
  }
}

export const supabaseEmissionsService: EmissionsService = {
  async list() {
    const { data, error } = await client()
      .from('emisiones')
      .select(COLUMNS)
      .order('medido_en', { ascending: false })
    if (error) throw toAppError(error)
    return data.map(toEmission)
  },

  async create(input) {
    const { data, error } = await client()
      .from('emisiones')
      // Solo las columnas con GRANT INSERT; owner_id lo pone la BD con auth.uid().
      .insert({ fuente: input.source.trim(), categoria: input.category, co2_kg: input.co2Kg })
      .select(COLUMNS)
      .single()
    if (error) throw toAppError(error)
    return toEmission(data)
  },
}

/** Implementación activa según VITE_USE_MOCK (cambio aislado: el resto de la app no se entera). */
export const emissionsService: EmissionsService = env.useMock
  ? createMockEmissionsService()
  : supabaseEmissionsService
