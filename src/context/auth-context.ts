import { createContext } from 'react'
import type { AuthState } from '../types'

export type AuthContextValue = AuthState & {
  /** Reintenta iniciar la sesión tras un error. */
  retry: () => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
