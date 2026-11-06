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

export function getSupabaseConfig(): SupabaseConfig {
  const url = raw.VITE_SUPABASE_URL?.trim()
  const anonKey = raw.VITE_SUPABASE_ANON_KEY?.trim()
  const missing = [!url && 'VITE_SUPABASE_URL', !anonKey && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean)
  if (!url || !anonKey) {
    throw new Error(
      `Falta configurar ${missing.join(' y ')} en .env (ver .env.example), o usa VITE_USE_MOCK=true para el modo demo.`,
    )
  }
  return { url, anonKey }
}
