import { env } from '../config'
import {
  EMISSIONS_PAGE_SIZE,
  type Emission,
  type EmissionsTotals,
  type NewEmission,
  type RealtimeStatus,
} from '../types'
import { isEmissionCategory, totalsFromCategoryRows } from '../utils'
import { AppError, toAppError } from './errors'
import { getSupabase, type Database } from './supabase'

/** Contrato del acceso a datos de emisiones. Hooks y tests dependen de esto, no de Supabase. */
export interface EmissionsService {
  /** Las EMISSIONS_PAGE_SIZE mediciones más recientes del usuario actual. */
  list(): Promise<Emission[]>
  /** Total, desglose por categoría y conteo de TODAS las mediciones del usuario (calculado en la BD). */
  summary(): Promise<EmissionsTotals>
  /** Inserta una medición; id, fecha y dueño los asigna la base de datos. */
  create(input: NewEmission): Promise<Emission>
  /**
   * Escucha inserciones nuevas del usuario `ownerId` (propias o de otra pestaña/dispositivo).
   * Devuelve la función que cancela la suscripción.
   */
  subscribeToInserts(
    ownerId: string,
    onInsert: (emission: Emission) => void,
    onStatus: (status: RealtimeStatus) => void,
  ): () => void
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

async function client() {
  try {
    return await getSupabase()
  } catch (error) {
    throw new AppError('config', error instanceof Error ? error.message : String(error), { cause: error })
  }
}

export const supabaseEmissionsService: EmissionsService = {
  async list() {
    const { data, error } = await (await client())
      .from('emisiones')
      .select(COLUMNS)
      .order('medido_en', { ascending: false })
      // Lab 5 (H2): antes se pedían todas las filas y PostgREST las cortaba en silencio en max_rows=1000.
      .limit(EMISSIONS_PAGE_SIZE)
    if (error) throw toAppError(error)
    return data.map(toEmission)
  },

  async summary() {
    const { data, error } = await (await client()).from('emisiones_resumen').select('categoria, mediciones, co2_kg')
    if (error) throw toAppError(error)
    const rows = []
    for (const row of data) {
      if (row.categoria === null || !isEmissionCategory(row.categoria)) continue
      rows.push({ category: row.categoria, kg: Number(row.co2_kg ?? 0), count: row.mediciones ?? 0 })
    }
    return totalsFromCategoryRows(rows)
  },

  async create(input) {
    const { data, error } = await (await client())
      .from('emisiones')
      // Solo las columnas con GRANT INSERT; owner_id lo pone la BD con auth.uid().
      .insert({ fuente: input.source.trim(), categoria: input.category, co2_kg: input.co2Kg })
      .select(COLUMNS)
      .single()
    if (error) throw toAppError(error)
    return toEmission(data)
  },

  subscribeToInserts(ownerId, onInsert, onStatus) {
    let cancelled = false
    let cleanup = () => {}
    client()
      .then((supabase) => {
        if (cancelled) return
        // Nombre único: en StrictMode el efecto se suscribe, limpia y se vuelve a suscribir.
        const channel = supabase
          .channel(`emisiones-inserts-${crypto.randomUUID()}`)
          // RLS ya impide recibir filas ajenas; el filtro además evita que el servidor evalúe y descarte
          // los INSERT de todos los demás usuarios para este socket (comunicación mínima, Lab 5).
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'emisiones', filter: `owner_id=eq.${ownerId}` },
            (payload) => {
              const emission = parseEmissionRow(payload.new)
              if (emission) onInsert(emission)
            },
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') onStatus('live')
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus('offline')
          })
        cleanup = () => {
          void supabase.removeChannel(channel)
        }
      })
      .catch(() => {
        if (!cancelled) onStatus('offline')
      })
    return () => {
      cancelled = true
      cleanup()
    }
  },
}

// Implementación activa. El mock se carga con import() SOLO en modo demo: en producción no viaja en el bundle
// (antes sus datos semilla aparecían en el JS de producción, Lab 5).
let implPromise: Promise<EmissionsService> | null = null
const impl = (): Promise<EmissionsService> =>
  (implPromise ??= env.useMock
    ? import('./emissions.mock').then((m) => m.createMockEmissionsService())
    : Promise.resolve(supabaseEmissionsService))

/** Servicio que usa la app: delega en Supabase o en el mock según VITE_USE_MOCK (cambio aislado). */
export const emissionsService: EmissionsService = {
  list: async () => (await impl()).list(),
  summary: async () => (await impl()).summary(),
  create: async (input) => (await impl()).create(input),
  subscribeToInserts(ownerId, onInsert, onStatus) {
    let cancelled = false
    let unsubscribe = () => {}
    impl()
      .then((service) => {
        if (!cancelled) unsubscribe = service.subscribeToInserts(ownerId, onInsert, onStatus)
      })
      .catch(() => {
        if (!cancelled) onStatus('offline')
      })
    return () => {
      cancelled = true
      unsubscribe()
    }
  },
}
