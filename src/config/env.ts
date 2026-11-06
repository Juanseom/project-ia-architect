// Única puerta de entrada a las variables de entorno.
// No lanza al importarse: en modo mock la app funciona sin variables de Supabase.
// Las variables de Supabase se validan solo cuando alguien pide el cliente (getSupabaseConfig).

const raw = import.meta.env

export const env = {
  useMock: raw.VITE_USE_MOCK === 'true',
} as const

export interface SupabaseConfig {
  url: string
  anonKey: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/**
 * true si la clave es secreta (sb_secret_… o JWT con role = service_role). Esas claves se saltan RLS:
 * en el navegador equivalen a publicar acceso total a la base de datos (Lab 5, hallazgo H3).
 * El build también lo bloquea (tooling/vite-security.ts); esta es la segunda línea de defensa.
 */
export function isSecretSupabaseKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const payload = key.split('.')[1]
  if (key.split('.').length !== 3 || payload === undefined) return false
  try {
    const json: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return isRecord(json) && json.role === 'service_role'
  } catch {
    return false
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = raw.VITE_SUPABASE_URL?.trim()
  const anonKey = raw.VITE_SUPABASE_ANON_KEY?.trim()
  const missing = [!url && 'VITE_SUPABASE_URL', !anonKey && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean)
  if (!url || !anonKey) {
    throw new Error(
      `Falta configurar ${missing.join(' y ')} en .env (ver .env.example), o usa VITE_USE_MOCK=true para el modo demo.`,
    )
  }
  if (isSecretSupabaseKey(anonKey)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY contiene una clave SECRETA (service_role). Nunca debe usarse en el navegador: usa la anon/publishable key.',
    )
  }
  return { url, anonKey }
}
