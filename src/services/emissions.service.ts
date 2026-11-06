import { env } from '../config'
import type { Emission, NewEmission, RealtimeStatus } from '../types'
import { isEmissionCategory } from '../utils'
import { createMockEmissionsService } from './emissions.mock'
import { AppError, toAppError } from './errors'
import { getSupabase, type Database } from './supabase'

/** Contrato del acceso a datos de emisiones. Hooks y tests dependen de esto, no de Supabase. */
export interface EmissionsService {
  /** Mediciones del usuario actual, de la más reciente a la más antigua. */
  list(): Promise<Emission[]>
  /** Inserta una medición; id, fecha y dueño los asigna la base de datos. */
  create(input: NewEmission): Promise<Emission>
  /**
   * Escucha inserciones nuevas (propias o de otra pestaña/dispositivo del mismo usuario).
   * Devuelve la función que cancela la suscripción.
   */
  subscribeToInserts(onInsert: (emission: Emission) => void, onStatus: (status: RealtimeStatus) => void): () => void
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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/**
 * El payload de Realtime llega sin tipos (`Record<string, any>`): se valida en ejecución en vez de hacer un cast.
 * co2_kg (numeric) puede llegar como número o como texto según la serialización.
 */
export function parseEmissionRow(value: unknown): Emission | null {
  if (!isRecord(value)) return null
  const { id, fuente, categoria, co2_kg: co2, medido_en: measuredAt } = value
  const co2Kg = typeof co2 === 'number' ? co2 : typeof co2 === 'string' ? Number(co2) : Number.NaN
  if (
    typeof id !== 'string' ||
    typeof fuente !== 'string' ||
    typeof categoria !== 'string' ||
    !isEmissionCategory(categoria) ||
    !Number.isFinite(co2Kg) ||
    typeof measuredAt !== 'string'
  ) {
    return null
  }
  return { id, source: fuente, category: categoria, co2Kg, measuredAt }
}

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

  subscribeToInserts(onInsert, onStatus) {
    let supabase: ReturnType<typeof client>
    try {
      supabase = client()
    } catch {
      onStatus('offline')
      return () => {}
    }
    // Nombre único: en StrictMode el efecto se suscribe, limpia y se vuelve a suscribir; reutilizar el
    // mismo tema mientras el canal anterior se está cerrando puede dejar la segunda suscripción muerta.
    const channel = supabase
      .channel(`emisiones-inserts-${crypto.randomUUID()}`)
      // RLS aplica también aquí: Realtime solo envía filas que la política de SELECT deja ver a este usuario.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emisiones' }, (payload) => {
        const emission = parseEmissionRow(payload.new)
        if (emission) onInsert(emission)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatus('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus('offline')
      })
    return () => {
      void supabase.removeChannel(channel)
    }
  },
}

/** Implementación activa según VITE_USE_MOCK (cambio aislado: el resto de la app no se entera). */
export const emissionsService: EmissionsService = env.useMock
  ? createMockEmissionsService()
  : supabaseEmissionsService
