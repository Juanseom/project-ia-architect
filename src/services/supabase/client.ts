import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, getSupabaseConfig } from '../../config'
import type { Database } from './database.types'

let client: SupabaseClient<Database> | null = null

/**
 * Singleton perezoso: la única instancia del cliente en toda la app.
 * Se crea en el primer uso (no al importar), así el modo mock nunca lo instancia
 * y una configuración faltante se convierte en un error manejable, no en una pantalla en blanco.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (env.useMock) {
    throw new Error('El cliente Supabase no está disponible en modo mock (VITE_USE_MOCK=true).')
  }
  if (!client) {
    const { url, anonKey } = getSupabaseConfig()
    client = createClient<Database>(url, anonKey)
  }
  return client
}
