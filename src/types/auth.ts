/** Usuario autenticado tal como lo ve el dominio (sin tipos del SDK de Supabase). */
export interface AuthUser {
  id: string
  isAnonymous: boolean
}

/** Estado de la sesión como unión discriminada: imposible tener `user` sin estar 'ready'. */
export type AuthState =
  | { status: 'loading' }
  | { status: 'ready'; user: AuthUser }
  | { status: 'error'; error: string }
