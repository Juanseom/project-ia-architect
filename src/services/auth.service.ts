import type { User } from '@supabase/supabase-js'
import { env } from '../config'
import type { AuthUser } from '../types'
import { AppError, toAppError } from './errors'
import { getSupabase } from './supabase'

const MOCK_USER: AuthUser = { id: '00000000-0000-4000-8000-000000000000', isAnonymous: true }

const toAuthUser = (user: User): AuthUser => ({ id: user.id, isAnonymous: user.is_anonymous ?? false })

async function client() {
  try {
    return await getSupabase()
  } catch (error) {
    throw new AppError('config', error instanceof Error ? error.message : String(error), { cause: error })
  }
}

// Promesa en vuelo compartida: en StrictMode el efecto se ejecuta dos veces y, sin esto,
// se crearían dos usuarios anónimos distintos.
let pending: Promise<AuthUser> | null = null

async function resolveUser(): Promise<AuthUser> {
  if (env.useMock) return MOCK_USER
  const supabase = await client()

  const { data, error } = await supabase.auth.getSession()
  if (error) throw toAppError(error)
  if (data.session) return toAuthUser(data.session.user)

  const { data: signIn, error: signInError } = await supabase.auth.signInAnonymously()
  if (signInError) throw toAppError(signInError)
  if (!signIn.user) throw new AppError('auth', 'No se pudo iniciar la sesión de invitado.')
  return toAuthUser(signIn.user)
}

/** Devuelve el usuario actual; si no hay sesión, inicia una anónima. */
export function ensureUser(): Promise<AuthUser> {
  pending ??= resolveUser().finally(() => {
    pending = null
  })
  return pending
}

/** Notifica cambios de sesión. Devuelve la función para cancelar la suscripción. */
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  if (env.useMock) return () => {}
  // El cliente se obtiene de forma asíncrona: si se cancela antes de que llegue, no se suscribe.
  let cancelled = false
  let unsubscribe = () => {}
  client()
    .then((supabase) => {
      if (cancelled) return
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session ? toAuthUser(session.user) : null)
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })
    .catch(() => {})
  return () => {
    cancelled = true
    unsubscribe()
  }
}

export async function signOut(): Promise<void> {
  if (env.useMock) return
  const { error } = await (await client()).auth.signOut()
  if (error) throw toAppError(error)
}
