import type { SupabaseClient } from '@supabase/supabase-js'
import { env, getSupabaseConfig } from '../../config'
import type { Database } from './database.types'

let clientPromise: Promise<SupabaseClient<Database>> | null = null

async function loadClient(): Promise<SupabaseClient<Database>> {
  // La config se valida antes de descargar el SDK (falta de variables o clave secreta → error inmediato).
  const { url, anonKey } = getSupabaseConfig()
  // import() dinámico: el SDK (~370 kB sin minificar) sale del chunk inicial y se descarga en paralelo
  // mientras React ya pinta el layout y los skeletons (Lab 5, optimización del bundle).
  const { createClient } = await import('@supabase/supabase-js')
  return createClient<Database>(url, anonKey)
}

/**
 * Singleton perezoso y asíncrono: la única instancia del cliente en toda la app.
 * No se crea en modo mock; si la carga falla, el siguiente intento vuelve a probar.
 */
export function getSupabase(): Promise<SupabaseClient<Database>> {
  if (env.useMock) {
    return Promise.reject(new Error('El cliente Supabase no está disponible en modo mock (VITE_USE_MOCK=true).'))
  }
  clientPromise ??= loadClient().catch((error: unknown) => {
    clientPromise = null
    throw error
  })
  return clientPromise
}
