import { describe, expect, it } from 'vitest'
import { isSecretSupabaseKey } from './env'

// JWT de demostración del CLI local de Supabase (públicos en la documentación del CLI; no son de un proyecto real).
const LOCAL_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
// Clave secreta FICTICIA armada en ejecución: así no queda un literal con formato de secreto en el repo
// (los escáneres de secretos de GitHub podrían bloquear el push).
const FAKE_SECRET = ['sb', 'secret', 'EJEMPLO'.padEnd(24, '0')].join('_')
const fakeJwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.firma`

describe('isSecretSupabaseKey', () => {
  it('acepta la anon key y las publishable keys', () => {
    expect(isSecretSupabaseKey(LOCAL_ANON)).toBe(false)
    expect(isSecretSupabaseKey('sb_publishable_EJEMPLO0000000000000000')).toBe(false)
  })

  it('rechaza JWT con role service_role y claves sb_secret_', () => {
    expect(isSecretSupabaseKey(fakeJwt({ iss: 'supabase', role: 'service_role' }))).toBe(true)
    expect(isSecretSupabaseKey(FAKE_SECRET)).toBe(true)
  })

  it('no falla con valores que no son JWT', () => {
    expect(isSecretSupabaseKey('not-a-key')).toBe(false)
    expect(isSecretSupabaseKey('a.b.c')).toBe(false)
  })
})
