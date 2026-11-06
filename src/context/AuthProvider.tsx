import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService, getErrorMessage } from '../services'
import type { AuthState } from '../types'
import { AuthContext, type AuthContextValue } from './auth-context'

export interface AuthProviderProps {
  children: ReactNode
}

/** Garantiza una sesión (anónima si no hay otra) antes de que las pantallas pidan datos. */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}

    authService
      .ensureUser()
      .then((user) => {
        if (!active) return
        setState({ status: 'ready', user })
        unsubscribe = authService.onAuthChange((next) => {
          if (active && next) setState({ status: 'ready', user: next })
        })
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', error: getErrorMessage(error) })
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  // Memo: sin él, cada render del provider crea un objeto nuevo y re-renderiza a todos los consumidores.
  const value = useMemo<AuthContextValue>(() => ({ ...state, retry, signOut: authService.signOut }), [state, retry])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
